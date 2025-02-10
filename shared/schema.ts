import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const backupConfigs = pgTable("backup_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  databases: text("databases").array(),
  schedule: text("schedule").notNull(),
  enabled: boolean("enabled").default(true),
  retention: integer("retention").default(30),
});

export const backupLogs = pgTable("backup_logs", {
  id: serial("id").primaryKey(),
  configId: integer("config_id").notNull(),
  database: text("database").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status").notNull(),
  fileSize: integer("file_size"),
  filePath: text("file_path"),
  error: text("error"),
  metadata: jsonb("metadata"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
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
