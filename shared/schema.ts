import { mysqlTable, text, int, boolean, timestamp, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const backupConfigs = mysqlTable("backup_configs", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: int("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  databases: json("databases").$type<string[]>().notNull(),
  schedule: text("schedule").notNull(),
  enabled: boolean("enabled").default(true),
  retention: int("retention").default(30),
});

export const backupLogs = mysqlTable("backup_logs", {
  id: int("id").primaryKey().autoincrement(),
  configId: int("config_id").notNull(),
  database: text("database").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull(),
  fileSize: int("file_size"),
  filePath: text("file_path"),
  error: text("error"),
  metadata: json("metadata"),
});

export const settings = mysqlTable("settings", {
  id: int("id").primaryKey().autoincrement(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const insertBackupConfigSchema = createInsertSchema(backupConfigs).omit({ 
  id: true 
});

export const insertBackupLogSchema = createInsertSchema(backupLogs).omit({ 
  id: true,
  startTime: true,
  endTime: true
});

export const insertSettingSchema = createInsertSchema(settings).omit({ 
  id: true 
});

export type BackupConfig = typeof backupConfigs.$inferSelect;
export type BackupLog = typeof backupLogs.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type InsertBackupConfig = z.infer<typeof insertBackupConfigSchema>;
export type InsertBackupLog = z.infer<typeof insertBackupLogSchema>;
export type InsertSetting = z.infer<typeof insertSettingSchema>;