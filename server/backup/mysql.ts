import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { BackupConfig, BackupLog } from '@shared/schema';

const execAsync = promisify(exec);

export async function performBackup(config: BackupConfig): Promise<BackupLog> {
  const startTime = new Date();
  const backupDir = process.env.BACKUP_DIR || './backups';

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
      console.log('MySQL connection test successful');
    } catch (connError: any) {
      console.error('MySQL connection test failed:', connError.message);
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
        console.warn('mysqldump warning:', message);
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
      } catch (unlinkError) {
        console.error('Failed to remove incomplete backup file:', unlinkError);
      }

      throw streamError;
    }

  } catch (error: any) {
    console.error('Backup failed:', error);

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
    const command = `gzip -d -c "${filePath}" | mysql --verbose --help > /dev/null`;
    await execAsync(command, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer for verification
    return true;
  } catch (error) {
    console.error('Backup verification failed:', error);
    return false;
  }
}