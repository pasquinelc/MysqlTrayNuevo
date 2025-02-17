import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// Pool configuration with better error handling and timezone
const poolConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'backups',
  timezone: 'Z', // Use UTC timezone
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
  connectTimeout: 30000, // 30 second timeout
};

console.log('MySQL Configuration:', {
  host: poolConfig.host,
  port: poolConfig.port,
  user: poolConfig.user,
  database: poolConfig.database,
});

const poolConnection = mysql.createPool(poolConfig);

// Add error handler to the pool
poolConnection.on('error', (err) => {
  console.error('Unexpected error on idle MySQL connection:', err);
  console.error('Error details:', {
    code: err.code,
    errno: err.errno,
    sqlState: err.sqlState,
    sqlMessage: err.sqlMessage
  });
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });

// Enhanced connection test function
export async function testConnection() {
  try {
    console.log('Testing MySQL connection...');
    console.log(`Host: ${process.env.MYSQL_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.MYSQL_PORT || '3306'}`);

    const connection = await mysql.createConnection({
      ...poolConfig,
      connectTimeout: 30000
    });

    await connection.connect();
    console.log('MySQL connection successful');

    // Test query to verify database access
    const [result] = await connection.execute('SELECT 1');
    console.log('MySQL query test successful:', result);

    await connection.end();
    return true;
  } catch (error) {
    console.error('MySQL connection failed:', error);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
    });
    return false;
  }
}