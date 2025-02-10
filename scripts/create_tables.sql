-- Crear tabla de configuraciones de respaldo
CREATE TABLE IF NOT EXISTS backup_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    databases JSON NOT NULL,
    schedule TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    retention INT DEFAULT 30
);

-- Crear tabla de logs de respaldo
CREATE TABLE IF NOT EXISTS backup_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL,
    `database` TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status TEXT NOT NULL,
    file_size INT,
    file_path TEXT,
    error TEXT,
    metadata JSON
);

-- Crear tabla de configuraciones
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` TEXT NOT NULL,
    value TEXT NOT NULL
);
