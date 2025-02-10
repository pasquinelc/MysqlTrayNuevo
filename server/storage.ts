import { type BackupConfig, type BackupLog, type Setting, users, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getAllBackupConfigs(): Promise<BackupConfig[]>;
  getBackupConfig(id: number): Promise<BackupConfig | undefined>;
  insertBackupConfig(config: Omit<BackupConfig, "id">): Promise<BackupConfig>;
  updateBackupConfig(id: number, config: Partial<BackupConfig>): Promise<BackupConfig>;

  getBackupLogs(): Promise<BackupLog[]>;
  getBackupLogsByDate(date: Date): Promise<BackupLog[]>;
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

  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private backupConfigs: Map<number, BackupConfig>;
  private backupLogs: Map<number, BackupLog>;
  private settings: Map<string, Setting>;
  private users: Map<number, User>;
  private currentConfigId: number;
  private currentLogId: number;
  private currentSettingId: number;
  private currentId: number;

  constructor() {
    this.backupConfigs = new Map();
    this.backupLogs = new Map();
    this.settings = new Map();
    this.users = new Map();
    this.currentConfigId = 1;
    this.currentLogId = 1;
    this.currentSettingId = 1;
    this.currentId = 1;
  }

  async getAllBackupConfigs(): Promise<BackupConfig[]> {
    return Array.from(this.backupConfigs.values());
  }

  async getBackupConfig(id: number): Promise<BackupConfig | undefined> {
    return this.backupConfigs.get(id);
  }

  async insertBackupConfig(config: Omit<BackupConfig, "id">): Promise<BackupConfig> {
    const id = this.currentConfigId++;
    const newConfig = { ...config, id } as BackupConfig;
    this.backupConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateBackupConfig(id: number, updates: Partial<BackupConfig>): Promise<BackupConfig> {
    const existing = this.backupConfigs.get(id);
    if (!existing) {
      throw new Error(`Backup config ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.backupConfigs.set(id, updated);
    return updated;
  }

  async getBackupLogs(): Promise<BackupLog[]> {
    return Array.from(this.backupLogs.values());
  }

  async getBackupLogsByDate(date: Date): Promise<BackupLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.backupLogs.values()).filter(log => {
      const logDate = new Date(log.startTime);
      return logDate >= startOfDay && logDate <= endOfDay;
    });
  }

  async insertBackupLog(log: Omit<BackupLog, "id">): Promise<BackupLog> {
    const id = this.currentLogId++;
    const newLog = { ...log, id } as BackupLog;
    this.backupLogs.set(id, newLog);
    return newLog;
  }

  async getBackupStats() {
    const logs = Array.from(this.backupLogs.values());
    const successful = logs.filter(l => l.status === 'completed');
    const totalSize = successful.reduce((sum, log) => sum + (log.fileSize || 0), 0);

    return {
      totalBackups: logs.length,
      successfulBackups: successful.length,
      failedBackups: logs.filter(l => l.status === 'failed').length,
      totalSize,
      lastBackupTime: logs.length > 0 ? new Date(Math.max(...logs.map(l => new Date(l.startTime).getTime()))) : undefined
    };
  }

  async getSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    return Array.from(this.settings.values()).find(s => s.key === key);
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = Array.from(this.settings.values()).find(s => s.key === key);
    if (existing) {
      const updated = { ...existing, value };
      this.settings.set(existing.id.toString(), updated);
      return updated;
    }

    const id = this.currentSettingId++;
    const newSetting = { id, key, value };
    this.settings.set(id.toString(), newSetting);
    return newSetting;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();