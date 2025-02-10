package com.mysqlbackup.controller;

import com.mysqlbackup.model.BackupConfig;
import com.mysqlbackup.model.BackupLog;
import com.mysqlbackup.repository.BackupConfigRepository;
import com.mysqlbackup.repository.BackupLogRepository;
import com.mysqlbackup.service.BackupService;
import com.mysqlbackup.service.SchedulerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BackupController {

    private final BackupService backupService;
    private final BackupConfigRepository configRepository;
    private final BackupLogRepository logRepository;
    private final SchedulerService schedulerService;

    @GetMapping("/configs")
    public ResponseEntity<List<BackupConfig>> getConfigs() {
        return ResponseEntity.ok(configRepository.findAll());
    }

    @PostMapping("/configs")
    public ResponseEntity<BackupConfig> createConfig(@RequestBody BackupConfig config) {
        BackupConfig savedConfig = configRepository.save(config);
        schedulerService.scheduleBackup(savedConfig);
        return ResponseEntity.ok(savedConfig);
    }

    @PutMapping("/configs/{id}")
    public ResponseEntity<BackupConfig> updateConfig(@PathVariable Long id, @RequestBody BackupConfig config) {
        if (!configRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        config.setId(id);
        BackupConfig savedConfig = configRepository.save(config);
        schedulerService.scheduleBackup(savedConfig);
        return ResponseEntity.ok(savedConfig);
    }

    @PostMapping("/backup/{id}/run")
    public ResponseEntity<BackupLog> runBackup(@PathVariable Long id) {
        BackupConfig config = configRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Config not found"));

        BackupLog log = backupService.performBackup(config);
        return ResponseEntity.ok(logRepository.save(log));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<BackupLog>> getLogs() {
        return ResponseEntity.ok(logRepository.findAll());
    }
}