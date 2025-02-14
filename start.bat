@echo off
setlocal

:: Set environment variables
set NODE_ENV=production

:: Verificar el archivo .env
if not exist .env (
    echo Error: No se encuentra el archivo .env
    echo Por favor, cree el archivo .env con la siguiente configuración:
    echo DATABASE_URL=mysql://usuario:contraseña@IP-MYSQL:3306/backups
    exit /b 1
)

:: Start the application
node dist/index.js