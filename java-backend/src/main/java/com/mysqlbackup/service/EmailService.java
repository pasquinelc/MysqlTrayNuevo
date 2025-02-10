package com.mysqlbackup.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailService {
    
    private final JavaMailSender mailSender;
    
    public void sendBackupNotification(BackupResult result, BackupConfig config) {
        String subject = String.format("Backup %s: %s", 
            result.getStatus().equals("completed") ? "successful" : "failed",
            config.getName());
            
        String sizeInMB = result.getFileSize() != null ? 
            String.format("%.2f", result.getFileSize() / (1024.0 * 1024.0)) : "0";
            
        String html = String.format("""
            <h2>MySQL Backup %s</h2>
            <p>Configuration: %s</p>
            <p>Databases: %s</p>
            <p>Start Time: %s</p>
            <p>End Time: %s</p>
            <p>Status: %s</p>
            <p>File Size: %s MB</p>
            %s
            """,
            result.getStatus(),
            config.getName(),
            result.getDatabase(),
            result.getStartTime(),
            result.getEndTime(),
            result.getStatus(),
            sizeInMB,
            result.getError() != null ? "<p>Error: " + result.getError() + "</p>" : ""
        );
        
        sendEmail(getNotificationEmails(), subject, html);
    }
    
    public void sendDailyReport(List<BackupResult> logs) {
        long successful = logs.stream().filter(l -> "completed".equals(l.getStatus())).count();
        long failed = logs.stream().filter(l -> "failed".equals(l.getStatus())).count();
        
        StringBuilder html = new StringBuilder();
        html.append(String.format("""
            <h2>Daily Backup Report</h2>
            <p>Total Backups: %d</p>
            <p>Successful: %d</p>
            <p>Failed: %d</p>
            
            <h3>Details:</h3>
            <table border="1" style="border-collapse: collapse;">
                <tr>
                    <th>Database</th>
                    <th>Status</th>
                    <th>Size (MB)</th>
                    <th>Duration</th>
                </tr>
            """,
            logs.size(), successful, failed
        ));
        
        for (BackupResult log : logs) {
            double sizeInMB = log.getFileSize() != null ? log.getFileSize() / (1024.0 * 1024.0) : 0;
            long durationSeconds = log.getEndTime() != null && log.getStartTime() != null ?
                java.time.Duration.between(log.getStartTime(), log.getEndTime()).getSeconds() : 0;
                
            html.append(String.format("""
                <tr>
                    <td>%s</td>
                    <td>%s</td>
                    <td>%.2f</td>
                    <td>%ds</td>
                </tr>
                """,
                log.getDatabase(), log.getStatus(), sizeInMB, durationSeconds
            ));
        }
        
        html.append("</table>");
        
        sendEmail(getReportEmails(), "Daily Backup Report", html.toString());
    }
    
    private void sendEmail(List<String> to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(to.toArray(new String[0]));
            helper.setSubject(subject);
            helper.setText(html, true);
            
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }
    
    private List<String> getNotificationEmails() {
        String emails = System.getenv("NOTIFICATION_EMAILS");
        return emails != null ? List.of(emails.split(",")) : List.of();
    }
    
    private List<String> getReportEmails() {
        String emails = System.getenv("REPORT_EMAILS");
        return emails != null ? List.of(emails.split(",")) : List.of();
    }
}
