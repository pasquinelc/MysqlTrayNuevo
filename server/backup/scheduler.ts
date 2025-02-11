import schedule from 'node-schedule';
import { performBackup } from './mysql';
import { sendBackupNotification, sendDailyReport } from './email';
import { storage } from '../storage';
import type { BackupConfig } from '@shared/schema';

const jobs = new Map<number, schedule.Job>();

export async function initializeScheduler() {
  // Schedule daily report at 11:59 PM
  schedule.scheduleJob('59 23 * * *', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const logs = await storage.getBackupLogsByDate(yesterday);
    await sendDailyReport(logs);
  });

  // Initialize backup jobs
  const configs = await storage.getAllBackupConfigs();
  for (const config of configs) {
    if (config.enabled) {
      scheduleBackup(config);
    }
  }
}

export function scheduleBackup(config: BackupConfig) {
  if (jobs.has(config.id)) {
    jobs.get(config.id)?.cancel();
  }

  // If no schedule is set, default to 12:00 PM daily
  const cronSchedule = config.schedule || '0 12 * * *';

  const job = schedule.scheduleJob(cronSchedule, async () => {
    try {
      const log = await performBackup(config);
      const savedLog = await storage.insertBackupLog(log);
      await sendBackupNotification(savedLog, config);

      console.log(`Backup completed for ${config.name}`, {
        status: log.status,
        size: log.fileSize,
        duration: log.endTime ? new Date(log.endTime).getTime() - new Date(log.startTime).getTime() : 0
      });
    } catch (error) {
      console.error(`Failed to execute backup for ${config.name}:`, error);
    }
  });

  jobs.set(config.id, job);
}

export function cancelBackup(configId: number) {
  const job = jobs.get(configId);
  if (job) {
    job.cancel();
    jobs.delete(configId);
  }
}