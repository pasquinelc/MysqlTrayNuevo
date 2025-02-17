// Simple MySQL connection test script
import mysql from 'mysql2/promise';

const config = {
  host: process.env.MYSQL_HOST || '192.168.0.99',
  port: parseInt(process.env.MYSQL_PORT || '3349'),
  user: process.env.MYSQL_USER || 'root2',
  password: process.env.MYSQL_PASSWORD || 'pacman',
  database: 'backups',
  connectTimeout: 30000,
};

console.log('Testing MySQL connection with config:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database,
});

async function testConnection() {
  try {
    console.log('Attempting to connect to MySQL...');
    const connection = await mysql.createConnection(config);
    console.log('Successfully connected to MySQL!');
    
    console.log('Testing simple query...');
    const [result] = await connection.execute('SELECT 1');
    console.log('Query successful:', result);
    
    await connection.end();
    console.log('Connection closed successfully');
    return true;
  } catch (error) {
    console.error('Error connecting to MySQL:', {
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
