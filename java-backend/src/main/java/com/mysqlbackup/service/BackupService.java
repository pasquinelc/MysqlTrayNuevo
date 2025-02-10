package com.mysqlbackup.service;

import com.mysqlbackup.model.BackupConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.zip.GZIPOutputStream;

@Service
@Slf4j
public class BackupService {
    
    private final String backupDir = System.getenv().getOrDefault("BACKUP_DIR", "./backups");

    public BackupResult performBackup(BackupConfig config) {
        LocalDateTime startTime = LocalDateTime.now();
        String timestamp = startTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss"));
        String filename = String.format("%s_%s.sql", config.getName(), timestamp);
        String gzFilename = filename + ".gz";
        
        try {
            // Crear directorio de respaldo si no existe
            Files.createDirectories(Path.of(backupDir));
            
            ProcessBuilder pb = new ProcessBuilder(
                "mysqldump",
                "--host=" + config.getHost(),
                "--port=" + config.getPort(),
                "--user=" + config.getUsername(),
                "--password=" + config.getPassword(),
                "--single-transaction",
                "--routines",
                "--triggers",
                "--databases"
            );
            
            // Agregar las bases de datos a respaldar
            pb.command().addAll(config.getDatabases());
            
            Process process = pb.start();
            
            // Comprimir la salida directamente
            Path gzPath = Path.of(backupDir, gzFilename);
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                 GZIPOutputStream gzos = new GZIPOutputStream(new FileOutputStream(gzPath.toFile()))) {
                
                String line;
                while ((line = reader.readLine()) != null) {
                    gzos.write((line + "\n").getBytes());
                }
            }
            
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("mysqldump failed with exit code: " + exitCode);
            }
            
            long fileSize = Files.size(gzPath);
            
            return BackupResult.builder()
                .configId(config.getId())
                .database(String.join(",", config.getDatabases()))
                .startTime(startTime)
                .endTime(LocalDateTime.now())
                .status("completed")
                .fileSize(fileSize)
                .filePath(gzPath.toString())
                .build();
                
        } catch (Exception e) {
            log.error("Error performing backup", e);
            return BackupResult.builder()
                .configId(config.getId())
                .database(String.join(",", config.getDatabases()))
                .startTime(startTime)
                .endTime(LocalDateTime.now())
                .status("failed")
                .error(e.getMessage())
                .build();
        }
    }
}

@lombok.Data
@lombok.Builder
class BackupResult {
    private Long configId;
    private String database;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private Long fileSize;
    private String filePath;
    private String error;
}
