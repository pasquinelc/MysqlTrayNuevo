import nodemailer from 'nodemailer';
import { BackupLog, BackupConfig } from '@shared/schema';
import { storage } from '../storage';

// Crear el transportador de correo con logging detallado
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_SMTP_PORT || '465'),
  secure: true, // true para 465, false para otros puertos
  auth: {
    user: process.env.MAIL_SMTP_USER || 'facturacion@turbinux.com',
    pass: process.env.MAIL_SMTP_PASSWORD
  },
  debug: true, // Habilitar debugging
  logger: true // Log en la consola
});

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
}

async function logToSystem(level: 'info' | 'warning' | 'error', message: string, metadata?: any) {
  await storage.insertSystemLog({
    type: 'email',
    level,
    message,
    metadata
  });
}

export async function sendBackupNotification(log: BackupLog, config: BackupConfig) {
  await logToSystem('info', `Preparando notificación de respaldo por correo para ${config.name}`);
  const status = log.status === 'completed' ? 'exitoso' : 'fallido';
  const subject = `Respaldo ${status}: ${config.name}`;

  const sizeInMB = log.fileSize ? (log.fileSize / (1024 * 1024)).toFixed(2) : 0;

  const html = `
    <h2>Respaldo MySQL ${status}</h2>
    <p>Configuración: ${config.name}</p>
    <p>Bases de datos: ${log.database}</p>
    <p>Hora de inicio: ${log.startTime}</p>
    <p>Hora de finalización: ${log.endTime}</p>
    <p>Estado: ${log.status}</p>
    <p>Tamaño del archivo: ${sizeInMB} MB</p>
    ${log.error ? `<p>Error: ${log.error}</p>` : ''}
  `;

  try {
    await logToSystem('info', `Enviando notificación por correo a: pcc2100@yahoo.com`);
    await sendEmail({
      to: ['pcc2100@yahoo.com'],
      subject,
      html
    });
    await logToSystem('info', 'Notificación de respaldo enviada exitosamente');
  } catch (error: any) {
    await logToSystem('error', 'Error al enviar notificación de respaldo', { 
      error: error.message,
      stack: error.stack
    });
  }
}

export async function sendDailyReport(logs: BackupLog[]) {
  await logToSystem('info', 'Preparando reporte diario de respaldos...');
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

  try {
    await logToSystem('info', 'Enviando reporte diario a: pcc2100@yahoo.com');
    await sendEmail({
      to: ['pcc2100@yahoo.com'],
      subject: 'Reporte Diario de Respaldos',
      html
    });
    await logToSystem('info', 'Reporte diario enviado exitosamente');
  } catch (error: any) {
    await logToSystem('error', 'Error al enviar reporte diario', {
      error: error.message,
      stack: error.stack
    });
  }
}

async function sendEmail(options: EmailOptions) {
  try {
    const smtpConfig = {
      host: process.env.MAIL_SMTP_HOST,
      port: process.env.MAIL_SMTP_PORT,
      user: process.env.MAIL_SMTP_USER,
      from: process.env.EMAIL_DESDE
    };

    await logToSystem('info', 'Intentando enviar email con configuración SMTP', smtpConfig);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_DESDE || 'facturacion@turbinux.com',
      ...options
    });

    await logToSystem('info', 'Email enviado exitosamente', { response: info.response });
    return true;
  } catch (error: any) {
    await logToSystem('error', 'Error al enviar email', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}