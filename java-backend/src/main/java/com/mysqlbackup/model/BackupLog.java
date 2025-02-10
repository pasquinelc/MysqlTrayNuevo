package com.mysqlbackup.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "backup_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "config_id", nullable = false)
    private Long configId;
    
    @Column(nullable = false)
    private String database;
    
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;
    
    @Column(name = "end_time")
    private LocalDateTime endTime;
    
    @Column(nullable = false)
    private String status;
    
    @Column(name = "file_size")
    private Long fileSize;
    
    @Column(name = "file_path")
    private String filePath;
    
    @Column
    private String error;
    
    @Column(columnDefinition = "jsonb")
    private String metadata;
}
