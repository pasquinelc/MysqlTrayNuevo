import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
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

    // Log the mysqldump command for debugging (without password)
    const debugCommand = [
      'mysqldump',
      `--host=${config.host}`,
      `--port=${config.port}`,
      `--user=${config.username}`,
      '--password=****',
      '--single-transaction',
      '--routines',
      '--triggers',
      '--databases',
      ...config.databases
    ].join(' ');
    console.log('Executing backup command:', debugCommand);

    const command = [
      'mysqldump',
      `--host=${config.host}`,
      `--port=${config.port}`,
      `--user=${config.username}`,
      `--password=${config.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--databases',
      ...config.databases
    ].join(' ');

    // Test connection first
    try {
      await execAsync(`mysql --host=${config.host} --port=${config.port} --user=${config.username} --password=${config.password} -e "SELECT 1"`);
      console.log('MySQL connection test successful');
    } catch (connError: any) {
      console.error('MySQL connection test failed:', connError.message);
      throw new Error(`Failed to connect to MySQL: ${connError.message}`);
    }

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.warn('mysqldump warnings:', stderr);
    }

    await fs.writeFile(outputPath, stdout);

    // Compress the backup
    const readStream = await fs.open(outputPath, 'r');
    const writeStream = await fs.open(gzOutputPath, 'w');
    const gzip = createGzip();
    await pipeline(readStream.createReadStream(), gzip, writeStream.createWriteStream());

    // Cleanup original file
    await fs.unlink(outputPath);

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
      metadata: { stderr }
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
        command: error.cmd // Include the command that failed
      }
    };
  }
}

export async function verifyBackup(filePath: string): Promise<boolean> {
  try {
    const command = `gzip -d -c "${filePath}" | mysql --verbose --help > /dev/null`;
    await execAsync(command);
    return true;
  } catch (error) {
    console.error('Backup verification failed:', error);
    return false;
  }
}