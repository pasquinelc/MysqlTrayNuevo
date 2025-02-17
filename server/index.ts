import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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

(async () => {
  const server = registerRoutes(app);

  // Manejo de errores global
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('Error en la aplicación:', err);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Función para intentar iniciar el servidor
  const startServer = (port: number) => {
    return new Promise((resolve, reject) => {
      server.listen(port, "0.0.0.0")
        .once('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`Puerto ${port} en uso, intentando con puerto alternativo...`);
            resolve(false);
          } else {
            console.error('Error al iniciar servidor:', error);
            reject(error);
          }
        })
        .once('listening', () => {
          console.log(`Servidor iniciado en http://0.0.0.0:${port}`);
          resolve(true);
        });
    });
  };

  // Intentar puertos alternativos si el 5000 está en uso
  const ports = [5000, 5001, 5002, 5003];
  for (const port of ports) {
    try {
      const success = await startServer(port);
      if (success) {
        log(`Servidor corriendo en puerto ${port}`);
        break;
      }
    } catch (error) {
      console.error(`Error fatal al intentar puerto ${port}:`, error);
      process.exit(1);
    }
  }
})();