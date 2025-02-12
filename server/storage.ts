import { db } from "./db";
import { eq, sql, and, between } from "drizzle-orm";
import { backupConfigs, backupLogs, settings, systemLogs, type SystemLog } from "@shared/schema";
import type { BackupConfig, BackupLog, Setting } from "@shared/schema";
import { broadcast } from "./websocket";

export interface IStorage {
  getAllBackupConfigs(): Promise<BackupConfig[]>;
  getBackupConfig(id: number): Promise<BackupConfig | undefined>;
  insertBackupConfig(config: Omit<BackupConfig, "id">): Promise<BackupConfig>;
  updateBackupConfig(id: number, config: Partial<BackupConfig>): Promise<BackupConfig>;

  getBackupLogs(): Promise<BackupLog[]>;
  getBackupLogsByDate(date: Date): Promise<BackupLog[]>;
  getBackupLogsByDateRange(startDate: Date, endDate: Date): Promise<BackupLog[]>; // Added method
  insertBackupLog(log: Omit<BackupLog, "id">): Promise<BackupLog>;

  getBackupStats(): Promise<{
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSize: number;
    lastBackupTime?: Date;
  }>;

  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;

  // Add new methods for system logs
  getSystemLogs(): Promise<SystemLog[]>;
  insertSystemLog(log: Omit<SystemLog, "id" | "timestamp">): Promise<SystemLog>;
  deleteBackupConfig(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllBackupConfigs(): Promise<BackupConfig[]> {
    const results = await db.select().from(backupConfigs);
    return results;
  }

  async getBackupConfig(id: number): Promise<BackupConfig | undefined> {
    const [config] = await db.select().from(backupConfigs).where(eq(backupConfigs.id, id));
    return config;
  }

  async insertBackupConfig(config: Omit<BackupConfig, "id">): Promise<BackupConfig> {
    const [newConfig] = await db.insert(backupConfigs).values(config);
    return { ...config, id: newConfig.insertId } as BackupConfig;
  }

  async updateBackupConfig(id: number, updates: Partial<BackupConfig>): Promise<BackupConfig> {
    await db.update(backupConfigs).set(updates).where(eq(backupConfigs.id, id));
    const [updated] = await db.select().from(backupConfigs).where(eq(backupConfigs.id, id));
    if (!updated) {
      throw new Error(`Backup config ${id} not found`);
    }
    return updated;
  }

  async getBackupLogs(): Promise<BackupLog[]> {
    return await db.select()
      .from(backupLogs)
      .orderBy(sql`${backupLogs.startTime} DESC`)
      .limit(10); // Limitamos a los últimos 10 registros para la vista rápida
  }

  async getBackupLogsByDate(date: Date): Promise<BackupLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(backupLogs)
      .where(sql`${backupLogs.startTime} >= ${startOfDay} AND ${backupLogs.startTime} <= ${endOfDay}`)
      .orderBy(sql`${backupLogs.startTime} DESC`);
  }

  async getBackupLogsByDateRange(startDate: Date, endDate: Date): Promise<BackupLog[]> {
    // Ensure we're using the correct timezone when querying
    return await db
      .select()
      .from(backupLogs)
      .where(
        and(
          sql`DATE(${backupLogs.startTime}) >= DATE(${startDate})`,
          sql`DATE(${backupLogs.startTime}) <= DATE(${endDate})`
        )
      )
      .orderBy(sql`${backupLogs.startTime} DESC`);
  }

  async insertBackupLog(log: Omit<BackupLog, "id">): Promise<BackupLog> {
    const [result] = await db.insert(backupLogs).values(log);
    return { ...log, id: result.insertId } as BackupLog;
  }

  async getBackupStats() {
    const logs = await this.getBackupLogs();
    const successful = logs.filter(l => l.status === 'completed');
    const totalSize = successful.reduce((sum, log) => sum + (log.fileSize || 0), 0);

    return {
      totalBackups: logs.length,
      successfulBackups: successful.length,
      failedBackups: logs.filter(l => l.status === 'failed').length,
      totalSize,
      lastBackupTime: logs.length > 0
        ? new Date(logs[0].startTime)
        : undefined
    };
  }

  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);

    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.key, key));
      return { ...existing, value };
    }

    const [result] = await db.insert(settings).values({ key, value });
    return { id: result.insertId, key, value };
  }

  async getSystemLogs(): Promise<SystemLog[]> {
    return await db.select()
      .from(systemLogs)
      .orderBy(sql`${systemLogs.timestamp} DESC`)
      .limit(1000);
  }

  async insertSystemLog(log: Omit<SystemLog, "id" | "timestamp">): Promise<SystemLog> {
    const [result] = await db.insert(systemLogs).values(log);
    const savedLog = {
      ...log,
      id: result.insertId,
      timestamp: new Date()
    } as SystemLog;

    // Broadcast the new log to connected clients
    broadcast({ type: 'SYSTEM_LOG', log: savedLog });

    return savedLog;
  }

  async deleteBackupConfig(id: number): Promise<void> {
    await db.delete(backupConfigs).where(eq(backupConfigs.id, id));
  }
}

export const storage = new DatabaseStorage();