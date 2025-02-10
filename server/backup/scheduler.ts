import schedule from 'node-schedule';
import { performBackup } from './mysql';
import { sendBackupNotification, sendDailyReport } from './email';
import { storage } from '../storage';
import type { BackupConfig } from '@shared/schema';

const jobs = new Map<number, schedule.Job>();

export async function initializeScheduler() {
  // Schedule daily report
  schedule.scheduleJob('0 0 * * *', async () => {
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

  const job = schedule.scheduleJob(config.schedule, async () => {
    const log = await performBackup(config);
    const savedLog = await storage.insertBackupLog(log);
    await sendBackupNotification(savedLog, config);
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