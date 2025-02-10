package com.mysqlbackup.repository;

import com.mysqlbackup.model.BackupLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BackupLogRepository extends JpaRepository<BackupLog, Long> {
    List<BackupLog> findByStartTimeBetweenOrderByStartTimeDesc(LocalDateTime start, LocalDateTime end);
    List<BackupLog> findByConfigIdOrderByStartTimeDesc(Long configId);
}
