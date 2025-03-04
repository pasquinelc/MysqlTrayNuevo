import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testConnection } from "./db";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware para logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });
  next();
});

// Función asíncrona para iniciar la aplicación
(async () => {
  try {
    console.log("🔄 Probando conexión a MySQL...");
    const isDbConnected = await testConnection();
    if (!isDbConnected) {
      console.error("❌ Error: No se pudo conectar a MySQL. Cerrando la aplicación.");
      process.exit(1);
    }

    console.log("✅ Conexión a MySQL exitosa. Iniciando servidor Express...");

    // Registrar rutas
    const server = registerRoutes(app);

    // Manejo de errores global
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("❌ Error en la aplicación:", err);
      res.status(status).json({ message });
    });

    // Forzar modo desarrollo temporalmente
    console.log("🔧 Iniciando en modo desarrollo...");
    await setupVite(app, server);

    // Puerto fijo en 5000 como indican las instrucciones
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Servidor iniciado en http://0.0.0.0:${PORT}`);
      log(`Servidor corriendo en puerto ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Error fatal durante el inicio del servidor:", error);
    process.exit(1);
  }
})();