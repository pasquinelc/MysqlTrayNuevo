import nodemailer from 'nodemailer';
import { BackupLog, BackupConfig } from '@shared/schema';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
}

export async function sendBackupNotification(log: BackupLog, config: BackupConfig) {
  const status = log.status === 'completed' ? 'successful' : 'failed';
  const subject = `Backup ${status}: ${config.name}`;

  const sizeInMB = log.fileSize ? (log.fileSize / (1024 * 1024)).toFixed(2) : 0;
  
  const html = `
    <h2>MySQL Backup ${status}</h2>
    <p>Configuration: ${config.name}</p>
    <p>Databases: ${log.database}</p>
    <p>Start Time: ${log.startTime}</p>
    <p>End Time: ${log.endTime}</p>
    <p>Status: ${log.status}</p>
    <p>File Size: ${sizeInMB} MB</p>
    ${log.error ? `<p>Error: ${log.error}</p>` : ''}
  `;

  await sendEmail({
    to: process.env.NOTIFICATION_EMAILS?.split(',') || [],
    subject,
    html
  });
}

export async function sendDailyReport(logs: BackupLog[]) {
  const successful = logs.filter(l => l.status === 'completed').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  
  const html = `
    <h2>Daily Backup Report</h2>
    <p>Total Backups: ${logs.length}</p>
    <p>Successful: ${successful}</p>
    <p>Failed: ${failed}</p>
    
    <h3>Details:</h3>
    <table border="1" style="border-collapse: collapse;">
      <tr>
        <th>Database</th>
        <th>Status</th>
        <th>Size (MB)</th>
        <th>Duration</th>
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
    to: process.env.REPORT_EMAILS?.split(',') || [],
    subject: 'Daily Backup Report',
    html
  });
}

async function sendEmail(options: EmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      ...options
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}
