package com.mysqlbackup.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Table(name = "backup_configs")
@Data
public class BackupConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String host;

    @Column(nullable = false)
    private Integer port;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @ElementCollection
    @CollectionTable(name = "backup_databases", joinColumns = @JoinColumn(name = "config_id"))
    @Column(name = "database_name")
    private List<String> databases;

    @Column(nullable = false)
    private String schedule;

    private boolean enabled = true;

    private Integer retention = 30;
}