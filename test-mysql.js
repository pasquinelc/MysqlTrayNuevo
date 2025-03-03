// Simple MySQL connection test script
import mysql from 'mysql2/promise';

const config = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: 'backups',
  connectTimeout: 30000,
};

console.log('Probando conexión MySQL con configuración:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database,
});

async function testConnection() {
  try {
    console.log('Intentando conectar a MySQL...');
    const connection = await mysql.createConnection(config);
    console.log('¡Conexión exitosa a MySQL!');

    console.log('Verificando tablas existentes...');
    const [tables] = await connection.execute('SHOW TABLES FROM backups;');
    console.log('Tablas encontradas:', tables);

    await connection.end();
    console.log('Conexión cerrada correctamente');
    return true;
  } catch (error) {
    console.error('Error conectando a MySQL:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      fatal: error.fatal
    });
    return false;
  }
}

testConnection();