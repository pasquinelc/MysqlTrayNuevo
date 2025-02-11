import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { BackupConfig, BackupLog } from '@shared/schema';
import { storage } from '../storage';

const execAsync = promisify(exec);

async function logToSystem(level: 'info' | 'warning' | 'error', message: string, metadata?: any) {
  try {
    await storage.insertSystemLog({
      type: 'backup',
      level,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
  } catch (logError) {
    console.error('Error al registrar en system_logs:', logError);
  }
}

export async function performBackup(config: BackupConfig): Promise<BackupLog> {
  const startTime = new Date();
  const backupDir = process.env.BACKUP_DIR || './backups';

  await logToSystem('info', `Iniciando respaldo para ${config.name}`, {
    config: {
      name: config.name,
      databases: config.databases,
      host: config.host
    }
  });

  try {
    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = startTime.toISOString().replace(/[:.]/g, '-');
    const gzFilename = `${config.name}_${timestamp}.sql.gz`;
    const gzOutputPath = path.join(backupDir, gzFilename);

    // Test connection first
    try {
      await execAsync(
        `mysql --host=${config.host} --port=${config.port} --user=${config.username} --password=${config.password} -e "SELECT 1"`,
        { maxBuffer: 1024 * 1024 * 10 }
      );
      await logToSystem('info', 'Prueba de conexión MySQL exitosa');
    } catch (connError: any) {
      await logToSystem('error', 'Fallo en la prueba de conexión MySQL', {
        error: connError.message,
        stack: connError.stack
      });
      return {
        id: 0,
        configId: config.id,
        database: config.databases.join(','),
        startTime,
        endTime: new Date(),
        status: 'failed',
        fileSize: 0,
        filePath: null,
        error: `Failed to connect to MySQL: ${connError.message}`,
        metadata: { error: connError.stack }
      };
    }

    // Use spawn for streaming backup
    const mysqldump = spawn('mysqldump', [
      `--host=${config.host}`,
      `--port=${config.port}`,
      `--user=${config.username}`,
      `--password=${config.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--databases',
      ...config.databases
    ]);

    // Create write stream with gzip compression
    const gzipStream = createGzip();
    const writeStream = await fs.open(gzOutputPath, 'w').then(fd => fd.createWriteStream());

    // Collect error messages
    let errorOutput = '';
    mysqldump.stderr.on('data', (data) => {
      const message = data.toString();
      errorOutput += message;
      if (!message.includes('Using a password on the command line interface can be insecure')) {
        logToSystem('warning', 'Advertencia de mysqldump', { message });
      }
    });

    // Handle the backup process
    try {
      await Promise.race([
        pipeline(mysqldump.stdout, gzipStream, writeStream),
        new Promise((resolve, reject) => {
          mysqldump.on('error', reject);
          mysqldump.on('exit', (code) => {
            if (code !== 0) {
              reject(new Error(`mysqldump exited with code ${code}`));
            } else {
              resolve(undefined);
            }
          });
        })
      ]);

      // Verify if the backup file exists and has content
      const stats = await fs.stat(gzOutputPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      await logToSystem('info', 'Respaldo completado exitosamente', {
        fileSize: stats.size,
        path: gzOutputPath
      });

      return {
        id: 0,
        configId: config.id,
        database: config.databases.join(','),
        startTime,
        endTime: new Date(),
        status: 'completed',
        fileSize: stats.size,
        filePath: gzOutputPath,
        error: null,
        metadata: { warnings: errorOutput }
      };
    } catch (streamError: any) {
      // Clean up the incomplete backup file
      try {
        await fs.unlink(gzOutputPath);
        await logToSystem('warning', 'Archivo de respaldo incompleto eliminado', {
          path: gzOutputPath
        });
      } catch (unlinkError) {
        await logToSystem('error', 'Error al eliminar archivo de respaldo incompleto', {
          error: unlinkError
        });
      }

      throw streamError;
    }

  } catch (error: any) {
    await logToSystem('error', 'Error durante el proceso de respaldo', {
      error: error.message,
      stack: error.stack
    });

    return {
      id: 0,
      configId: config.id,
      database: config.databases.join(','),
      startTime,
      endTime: new Date(),
      status: 'failed',
      fileSize: 0,
      filePath: null,
      error: error.message,
      metadata: { 
        error: error.stack,
        command: error.cmd
      }
    };
  }
}

export async function verifyBackup(filePath: string): Promise<boolean> {
  try {
    await logToSystem('info', 'Iniciando verificación de respaldo', { path: filePath });
    const command = `gzip -d -c "${filePath}" | mysql --verbose --help > /dev/null`;
    await execAsync(command, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer for verification
    await logToSystem('info', 'Verificación de respaldo exitosa');
    return true;
  } catch (error) {
    await logToSystem('error', 'Fallo en la verificación de respaldo', { error });
    return false;
  }
}