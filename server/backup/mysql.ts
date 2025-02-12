process.env.TZ = 'America/Mexico_City';

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { BackupConfig, BackupLog } from '@shared/schema';
import { storage } from '../storage';
import { sendBackupNotification } from './email';
import { format } from 'date-fns';

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
    console.error('Error logging to system_logs:', logError);
  }
}

export async function performBackup(config: BackupConfig): Promise<BackupLog[]> {
  const startTime = new Date();
  // Obtener la ruta base de la configuración o usar el valor por defecto
  let baseDir = './backups';
  try {
    const backupPathSetting = await storage.getSetting('backup_path');
    if (backupPathSetting) {
      baseDir = backupPathSetting.value;
    }
  } catch (error) {
    await logToSystem('warning', 'No se encontró configuración de ruta de respaldo, usando valor por defecto', { defaultPath: baseDir });
  }

  const dateFolderName = format(startTime, 'dd-MM-yy');
  const backupDir = path.join(baseDir, dateFolderName);
  const logs: BackupLog[] = [];

  await logToSystem('info', `Iniciando respaldo para ${config.name}`, {
    config: {
      name: config.name,
      databases: config.databases,
      host: config.host,
      backupDir
    }
  });

  try {
    // Ensure backup directory structure exists
    await fs.mkdir(backupDir, { recursive: true });

    // Test connection first
    try {
      await execAsync(
        `mysql --host=${config.host} --port=${config.port} --user=${config.username} --password=${config.password} -e "SELECT 1"`,
        { maxBuffer: 1024 * 1024 * 10 }
      );
      await logToSystem('info', 'Prueba de conexión MySQL exitosa');
    } catch (connError: any) {
      const errorLog: BackupLog = {
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
      logs.push(errorLog);
      await sendBackupNotification(logs, config);
      return logs;
    }

    // Backup each database individually
    for (const database of config.databases) {
      const timestamp = startTime.toISOString().replace(/[:.]/g, '-');
      const gzFilename = `${config.name}_${database}_${timestamp}.sql.gz`;
      const gzOutputPath = path.join(backupDir, gzFilename);

      try {
        // Use spawn for streaming backup
        const mysqldump = spawn('mysqldump', [
          `--host=${config.host}`,
          `--port=${config.port}`,
          `--user=${config.username}`,
          `--password=${config.password}`,
          '--single-transaction',
          '--routines',
          '--triggers',
          database
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
            logToSystem('warning', `Advertencia de mysqldump para ${database}`, { message });
          }
        });

        // Handle the backup process
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

        await logToSystem('info', `Respaldo completado exitosamente para ${database}`, {
          fileSize: stats.size,
          path: gzOutputPath
        });

        logs.push({
          id: 0,
          configId: config.id,
          database,
          startTime,
          endTime: new Date(),
          status: 'completed',
          fileSize: stats.size,
          filePath: gzOutputPath,
          error: null,
          metadata: { warnings: errorOutput }
        });

      } catch (streamError: any) {
        // Clean up the incomplete backup file
        try {
          await fs.unlink(gzOutputPath);
          await logToSystem('warning', `Archivo de respaldo incompleto eliminado para ${database}`, {
            path: gzOutputPath
          });
        } catch (unlinkError) {
          await logToSystem('error', `Error al eliminar archivo de respaldo incompleto para ${database}`, {
            error: unlinkError
          });
        }

        logs.push({
          id: 0,
          configId: config.id,
          database,
          startTime,
          endTime: new Date(),
          status: 'failed',
          fileSize: 0,
          filePath: null,
          error: streamError.message,
          metadata: {
            error: streamError.stack,
            command: streamError.cmd
          }
        });
      }
    }

    // Send a single notification with all results
    await sendBackupNotification(logs, config);
    return logs;

  } catch (error: any) {
    await logToSystem('error', 'Error durante el proceso de respaldo', {
      error: error.message,
      stack: error.stack
    });

    if (logs.length === 0) {
      // If we haven't logged any specific database errors, create a general error log
      logs.push({
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
      });
    }

    await sendBackupNotification(logs, config);
    return logs;
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