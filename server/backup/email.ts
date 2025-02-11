import nodemailer from 'nodemailer';
import { BackupLog, BackupConfig } from '@shared/schema';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_SMTP_PORT || '465'),
  secure: true, // for port 465
  auth: {
    user: process.env.MAIL_SMTP_USER || 'facturacion@turbinux.com',
    pass: process.env.MAIL_SMTP_PASSWORD
  }
});

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
}

export async function sendBackupNotification(log: BackupLog, config: BackupConfig) {
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

  await sendEmail({
    to: ['pcc2100@yahoo.com'],
    subject,
    html
  });
}

export async function sendDailyReport(logs: BackupLog[]) {
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

  await sendEmail({
    to: ['pcc2100@yahoo.com'],
    subject: 'Reporte Diario de Respaldos',
    html
  });
}

async function sendEmail(options: EmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_DESDE || 'facturacion@turbinux.com',
      ...options
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}