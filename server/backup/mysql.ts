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
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = startTime.toISOString().replace(/[:.]/g, '-');
    const filename = `${config.name}_${timestamp}.sql`;
    const gzFilename = `${filename}.gz`;
    const outputPath = path.join(backupDir, filename);
    const gzOutputPath = path.join(backupDir, gzFilename);

    // Test connection first
    try {
      await execAsync(
        `mysql --host=${config.host} --port=${config.port} --user=${config.username} --password=${config.password} -e "SELECT 1"`,
        { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer for connection test
      );
      console.log('MySQL connection test successful');
    } catch (connError: any) {
      console.error('MySQL connection test failed:', connError.message);
      throw new Error(`Failed to connect to MySQL: ${connError.message}`);
    }

    // Use spawn instead of exec for better stream handling
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

    // Collect any error messages
    let errorOutput = '';
    mysqldump.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.warn('mysqldump warning:', data.toString());
    });

    // Handle the streaming process
    await Promise.race([
      pipeline(mysqldump.stdout, gzipStream, writeStream),
      new Promise((_, reject) => {
        mysqldump.on('error', reject);
        mysqldump.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`mysqldump exited with code ${code}`));
          }
        });
      })
    ]);

    const stats = await fs.stat(gzOutputPath);

    return {
      id: 0, // Will be set by storage layer
      configId: config.id,
      database: config.databases.join(','),
      startTime,
      endTime: new Date(),
      status: 'completed',
      fileSize: stats.size,
      filePath: gzOutputPath,
      error: null,
      metadata: { stderr: errorOutput }
    };
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