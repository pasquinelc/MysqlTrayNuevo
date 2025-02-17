// Simple MySQL connection test using Node.js
import mysql from 'mysql2/promise';

const config = {
  host: process.env.MYSQL_HOST || '192.168.0.99',
  port: parseInt(process.env.MYSQL_PORT || '3349'),
  user: process.env.MYSQL_USER || 'root2',
  password: process.env.MYSQL_PASSWORD || 'pacman',
  database: 'backups',
  connectTimeout: 10000,
};

console.log('Intentando conectar a MySQL con:');
console.log(`Host: ${config.host}`);
console.log(`Port: ${config.port}`);
console.log(`User: ${config.user}`);
console.log('------------------------');

async function testConnection() {
  try {
    console.log('Probando conexión...');
    const connection = await mysql.createConnection(config);
    console.log('¡Conexión exitosa!');
    
    console.log('Probando consulta simple...');
    const [result] = await connection.execute('SELECT 1');
    console.log('Consulta exitosa:', result);
    
    await connection.end();
    console.log('Conexión cerrada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error de conexión:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      fatal: error.fatal
    });
    process.exit(1);
  }
}

testConnection();
