package com.mysqlbackup.service;

import com.mysqlbackup.model.BackupConfig;
import com.mysqlbackup.model.BackupLog;
import com.mysqlbackup.repository.BackupConfigRepository;
import com.mysqlbackup.repository.BackupLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchedulerService {
    private final BackupService backupService;
    private final EmailService emailService;
    private final BackupConfigRepository configRepository;
    private final BackupLogRepository logRepository;
    private final TaskScheduler taskScheduler;
    
    private final Map<Long, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();
    
    @Scheduled(cron = "0 0 0 * * *") // Ejecutar diariamente a medianoche
    public void sendDailyReport() {
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
        var logs = logRepository.findByStartTimeBetweenOrderByStartTimeDesc(
            yesterday.withHour(0).withMinute(0),
            yesterday.withHour(23).withMinute(59)
        );
        emailService.sendDailyReport(logs);
    }
    
    public void scheduleBackup(BackupConfig config) {
        cancelBackup(config.getId());
        
        if (config.isEnabled()) {
            ScheduledFuture<?> future = taskScheduler.schedule(
                () -> executeBackup(config),
                new CronTrigger(config.getSchedule())
            );
            scheduledTasks.put(config.getId(), future);
            log.info("Scheduled backup for config: {}", config.getName());
        }
    }
    
    public void cancelBackup(Long configId) {
        ScheduledFuture<?> future = scheduledTasks.remove(configId);
        if (future != null) {
            future.cancel(false);
            log.info("Cancelled backup schedule for config id: {}", configId);
        }
    }
    
    private void executeBackup(BackupConfig config) {
        try {
            BackupLog log = backupService.performBackup(config);
            log = logRepository.save(log);
            emailService.sendBackupNotification(log, config);
        } catch (Exception e) {
            log.error("Failed to execute backup for config: {}", config.getName(), e);
        }
    }
    
    public void initializeScheduler() {
        configRepository.findAll().stream()
            .filter(BackupConfig::isEnabled)
            .forEach(this::scheduleBackup);
    }
}
