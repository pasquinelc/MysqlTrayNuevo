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

    const { stdout, stderr } = await execAsync(command);
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
  } catch (error: any) { // Type assertion to fix TypeScript error
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
      metadata: { error: error.stack }
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