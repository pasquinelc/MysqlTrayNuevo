package com.mysqlbackup.repository;

import com.mysqlbackup.model.BackupConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupConfigRepository extends JpaRepository<BackupConfig, Long> {
    // Métodos personalizados si son necesarios
}
