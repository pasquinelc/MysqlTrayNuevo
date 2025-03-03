import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

console.log("✅ db.ts se está ejecutando...");

// 🚀 Cargar variables de entorno
dotenv.config();

// 🔎 Verificar variables de entorno de MySQL
console.log("🚀 Iniciando la carga de MySQL...");
console.log("🔹 ENV Variables:");
console.log("MYSQL_HOST:", process.env.MYSQL_HOST);
console.log("MYSQL_USER:", process.env.MYSQL_USER);
console.log("MYSQL_PASSWORD:", process.env.MYSQL_PASSWORD ? "********" : "NO PASSWORD");
console.log("MYSQL_PORT:", process.env.MYSQL_PORT);

// Configuración de la conexión MySQL
const poolConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: 'backups',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
  connectTimeout: 30000, // 30s timeout
  timezone: 'Z', // ✅ Corregir problema de zona horaria
};

// ✅ Confirmar configuración antes de conectar
console.log("✅ MySQL Configuration:", {
  ...poolConfig,
  password: '********'
});

// 📌 Crear conexión a MySQL
const poolConnection = mysql.createPool(poolConfig);

// 📌 Manejador de errores en la conexión
poolConnection.on("error", (err) => {
  console.error("❌ Unexpected error on idle MySQL connection:", err);
});

// 📌 Exportar conexión con Drizzle ORM
export const db = drizzle(poolConnection, { schema, mode: "default" });

// 📌 Función de prueba de conexión
export async function testConnection(): Promise<boolean> {
  try {
    console.log("🔄 Testing MySQL connection...");
    console.log(`🔹 Host: ${poolConfig.host}`);
    console.log(`🔹 Port: ${poolConfig.port}`);
    console.log(`🔹 User: ${poolConfig.user}`);

    const connection = await mysql.createConnection({
      ...poolConfig,
      timeout: 10000, // Reducir timeout para prueba inicial
    });

    console.log("🔄 Intentando conectar...");
    await connection.connect();
    console.log("✅ MySQL connection successful");

    // 🔎 Prueba de consulta
    console.log("🔄 Probando consulta simple...");
    const [result] = await connection.execute("SELECT 1");
    console.log("✅ MySQL query test successful:", result);

    await connection.end();
    return true;
  } catch (error: any) {
    console.error("❌ MySQL connection failed:", {
      message: error.message,
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