@echo off
setlocal EnableDelayedExpansion

:: Crear directorio de logs si no existe
if not exist "logs" mkdir logs

:: Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js no está instalado
    pause
    exit /b 1
)

:: Verificar el archivo .env
if not exist .env (
    echo Error: No se encuentra el archivo .env
    pause
    exit /b 1
)

:: Verificar que dist/index.js existe
if not exist "dist\index.js" (
    echo Error: No se encuentra el archivo dist/index.js
    echo Por favor, ejecute primero: npm run build
    pause
    exit /b 1
)

:: Iniciar la aplicación con dotenv-cli
echo Iniciando el servidor...
dotenv -e .env -- node dist/index.js > logs\server.log 2>&1

:: Evitar que la ventana se cierre automáticamente
pause
