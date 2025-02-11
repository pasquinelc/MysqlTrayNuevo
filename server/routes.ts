import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { initializeScheduler, scheduleBackup, cancelBackup } from './backup/scheduler';
import { performBackup } from './backup/mysql';
import { registerClient } from './websocket';

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket handler for real-time updates
  wss.on('connection', (ws) => {
    console.log('Client connected');
    registerClient(ws);
  });

  // Initialize backup scheduler
  initializeScheduler().catch(console.error);

  // Log server start
  storage.insertSystemLog({
    type: 'system',
    level: 'info',
    message: 'Servidor iniciado correctamente',
    metadata: JSON.stringify({
      time: new Date().toISOString(),
      environment: process.env.NODE_ENV
    })
  }).catch(console.error);

  // API Routes
  app.get('/api/configs', async (req, res) => {
    const configs = await storage.getAllBackupConfigs();
    res.json(configs);
  });

  app.post('/api/configs', async (req, res) => {
    const config = await storage.insertBackupConfig(req.body);
    if (config.enabled) {
      scheduleBackup(config);
    }
    res.json(config);
  });

  app.put('/api/configs/:id', async (req, res) => {
    const config = await storage.updateBackupConfig(parseInt(req.params.id), req.body);
    if (config.enabled) {
      scheduleBackup(config);
    } else {
      cancelBackup(config.id);
    }
    res.json(config);
  });

  app.delete('/api/configs/:id', async (req, res) => {
    try {
      const config = await storage.getBackupConfig(parseInt(req.params.id));
      if (!config) {
        return res.status(404).json({ error: 'Config not found' });
      }

      // Cancelar el backup programado antes de eliminar
      cancelBackup(config.id);
      await storage.deleteBackupConfig(config.id);

      // Log the deletion
      await storage.insertSystemLog({
        type: 'system',
        level: 'info',
        message: `Configuración de respaldo eliminada: ${config.name}`,
        metadata: JSON.stringify({
          configId: config.id,
          name: config.name
        })
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete backup config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/logs', async (req, res) => {
    const logs = await storage.getBackupLogs();
    res.json(logs);
  });

  app.post('/api/backup/:id/run', async (req, res) => {
    try {
      const config = await storage.getBackupConfig(parseInt(req.params.id));
      if (!config) {
        return res.status(404).json({ error: 'Config not found' });
      }

      console.log(`Starting backup for config: ${config.name}`);
      const logs = await performBackup(config);

      // Guardar todos los logs
      const savedLogs = await Promise.all(
        logs.map(log => storage.insertBackupLog(log))
      );

      res.json(savedLogs[0]); // Mantenemos compatibilidad con el frontend enviando el primer log
    } catch (error: any) {
      console.error('Backup execution failed:', error);
      const errorLog = {
        configId: parseInt(req.params.id),
        database: '',
        startTime: new Date(),
        endTime: new Date(),
        status: 'failed',
        error: error.message,
        fileSize: 0,
        filePath: null,
        metadata: { error: error.stack }
      };

      const savedLog = await storage.insertBackupLog(errorLog);

      res.status(500).json({
        status: 'failed',
        error: error.message,
        log: savedLog
      });
    }
  });

  app.get('/api/stats', async (req, res) => {
    const stats = await storage.getBackupStats();
    res.json(stats);
  });

  app.get('/api/system-logs', async (req, res) => {
    const logs = await storage.getSystemLogs();
    res.json(logs);
  });

  return httpServer;
}