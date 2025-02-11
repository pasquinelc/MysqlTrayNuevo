import nodemailer from 'nodemailer';
import { BackupLog, BackupConfig } from '@shared/schema';
import { storage } from '../storage';

// Create mail transporter with detailed logging
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SMTP_HOST,
  port: parseInt(process.env.MAIL_SMTP_PORT || '587'),
  secure: process.env.MAIL_SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_SMTP_USER,
    pass: process.env.MAIL_SMTP_PASSWORD
  },
  debug: true, // Enable debugging
  logger: true // Console logging
});

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
}

async function logToSystem(level: 'info' | 'warning' | 'error', message: string, metadata?: any) {
  try {
    await storage.insertSystemLog({
      type: 'email',
      level,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
  } catch (logError) {
    console.error('Error logging to system_logs:', logError);
  }
}

async function validateEmailConfig() {
  const requiredVars = [
    'MAIL_SMTP_HOST',
    'MAIL_SMTP_PORT',
    'MAIL_SMTP_USER',
    'MAIL_SMTP_PASSWORD',
    'EMAIL_DESDE'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    const error = `Faltan variables de entorno requeridas: ${missing.join(', ')}`;
    await logToSystem('error', error);
    throw new Error(error);
  }
}

export async function sendBackupNotification(logs: BackupLog[], config: BackupConfig) {
  await logToSystem('info', `Preparando notificación de respaldo por correo para ${config.name}`);

  try {
    await validateEmailConfig();

    const successful = logs.filter(l => l.status === 'completed');
    const failed = logs.filter(l => l.status === 'failed');
    const allCompleted = failed.length === 0;

    const subject = `Respaldo ${allCompleted ? 'exitoso' : 'con errores'}: ${config.name}`;

    const totalSize = successful.reduce((sum, log) => sum + (log.fileSize || 0), 0);
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

    const html = `
      <h2>Resumen de Respaldos MySQL</h2>
      <p>Configuración: ${config.name}</p>
      <p>Total de bases de datos: ${logs.length}</p>
      <p>Exitosos: ${successful.length}</p>
      <p>Fallidos: ${failed.length}</p>
      <p>Tamaño total: ${sizeInMB} MB</p>
      <p>Hora de inicio: ${logs[0]?.startTime}</p>
      <p>Hora de finalización: ${logs[logs.length - 1]?.endTime}</p>

      <h3>Detalles por base de datos:</h3>
      <table border="1" style="border-collapse: collapse;">
        <tr>
          <th>Base de datos</th>
          <th>Estado</th>
          <th>Tamaño (MB)</th>
          <th>Error</th>
        </tr>
        ${logs.map(log => `
          <tr>
            <td>${log.database}</td>
            <td>${log.status}</td>
            <td>${log.fileSize ? (log.fileSize / (1024 * 1024)).toFixed(2) : 0}</td>
            <td>${log.error || ''}</td>
          </tr>
        `).join('')}
      </table>
    `;

    await logToSystem('info', `Enviando notificación por correo a: pcc2100@yahoo.com`);
    await sendEmail({
      to: ['pcc2100@yahoo.com'],
      subject,
      html
    });
    await logToSystem('info', 'Notificación de respaldo enviada exitosamente');
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    };

    await logToSystem('error', 'Error al enviar notificación de respaldo', errorDetails);
    throw error;
  }
}

export async function sendDailyReport(logs: BackupLog[]) {
  await logToSystem('info', 'Preparando reporte diario de respaldos...');

  try {
    await validateEmailConfig();

    const successful = logs.filter(l => l.status === 'completed').length;
    const failed = logs.filter(l => l.status === 'failed').length;

    const html = `
      <h2>Reporte Diario de Respaldos</h2>
      <p>Total de respaldos: ${logs.length}</p>
      <p>Exitosos: ${successful}</p>
      <p>Fallidos: ${failed}</p>

      <h3>Detalles:</h3>
      <table border="1" style="border-collapse: collapse;">
        <tr>
          <th>Base de datos</th>
          <th>Estado</th>
          <th>Tamaño (MB)</th>
          <th>Duración</th>
        </tr>
        ${logs.map(log => `
          <tr>
            <td>${log.database}</td>
            <td>${log.status}</td>
            <td>${log.fileSize ? (log.fileSize / (1024 * 1024)).toFixed(2) : 0}</td>
            <td>${log.endTime && log.startTime ? 
              Math.round((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000) : 0}s</td>
          </tr>
        `).join('')}
      </table>
    `;

    await logToSystem('info', 'Enviando reporte diario a: pcc2100@yahoo.com');
    await sendEmail({
      to: ['pcc2100@yahoo.com'],
      subject: 'Reporte Diario de Respaldos',
      html
    });
    await logToSystem('info', 'Reporte diario enviado exitosamente');
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    };

    await logToSystem('error', 'Error al enviar reporte diario', errorDetails);
    throw error;
  }
}

async function sendEmail(options: EmailOptions) {
  try {
    const smtpConfig = {
      host: process.env.MAIL_SMTP_HOST,
      port: process.env.MAIL_SMTP_PORT,
      user: process.env.MAIL_SMTP_USER,
      from: process.env.EMAIL_DESDE,
      secure: process.env.MAIL_SMTP_PORT === '465'
    };

    await logToSystem('info', 'Intentando enviar email con configuración SMTP', smtpConfig);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_DESDE,
      ...options
    });

    await logToSystem('info', 'Email enviado exitosamente', { 
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope
    });
    return true;
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    };

    await logToSystem('error', 'Error al enviar email', errorDetails);
    throw error;
  }
}