import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set!');
  process.exit(1);
}

// Parse DATABASE_URL for connection config
const url = new URL(process.env.DATABASE_URL);
const poolConfig = {
  host: url.hostname,
  port: parseInt(url.port),
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
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
poolConnection.on('error', (err: any) => {
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
    console.log(`Host: ${poolConfig.host}`);
    console.log(`Port: ${poolConfig.port}`);

    const connection = await mysql.createConnection(poolConfig);
    await connection.connect();
    console.log('MySQL connection successful');

    // Test query to verify database access
    const [result] = await connection.execute('SELECT 1');
    console.log('MySQL query test successful:', result);

    await connection.end();
    return true;
  } catch (error: any) {
    console.error('MySQL connection failed:', error);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      host: poolConfig.host,
      port: poolConfig.port,
    });
    return false;
  }
}