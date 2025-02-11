import nodemailer from 'nodemailer';
import { BackupLog, BackupConfig } from '@shared/schema';

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

export async function sendBackupNotification(log: BackupLog, config: BackupConfig) {
  console.log('Preparando notificación de respaldo por correo...');
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
    console.log('Enviando notificación por correo a:', ['pcc2100@yahoo.com']);
    await sendEmail({
      to: ['pcc2100@yahoo.com'],
      subject,
      html
    });
    console.log('Notificación de respaldo enviada exitosamente');
  } catch (error) {
    console.error('Error al enviar notificación de respaldo:', error);
  }
}

export async function sendDailyReport(logs: BackupLog[]) {
  console.log('Preparando reporte diario de respaldos...');
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
    console.log('Enviando reporte diario a:', ['pcc2100@yahoo.com']);
    await sendEmail({
      to: ['pcc2100@yahoo.com'],
      subject: 'Reporte Diario de Respaldos',
      html
    });
    console.log('Reporte diario enviado exitosamente');
  } catch (error) {
    console.error('Error al enviar reporte diario:', error);
  }
}

async function sendEmail(options: EmailOptions) {
  try {
    console.log('Configuración SMTP:', {
      host: process.env.MAIL_SMTP_HOST,
      port: process.env.MAIL_SMTP_PORT,
      user: process.env.MAIL_SMTP_USER,
      from: process.env.EMAIL_DESDE
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_DESDE || 'facturacion@turbinux.com',
      ...options
    });

    console.log('Email enviado exitosamente:', info.response);
    return true;
  } catch (error) {
    console.error('Error detallado al enviar email:', error);
    throw error; // Re-lanzar el error para manejo superior
  }
}