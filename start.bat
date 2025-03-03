@echo off
setlocal EnableDelayedExpansion

:: Crear directorio de logs si no existe
if not exist "logs" mkdir logs

:: Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js no esta instalado
    echo Por favor, instale Node.js version 20 o superior
    pause
    exit /b 1
)

:: Verificar version de Node.js
for /f "tokens=2 delims=v" %%I in ('node -v') do set NODE_VERSION=%%I
for /f "tokens=1 delims=." %%I in ("!NODE_VERSION!") do (
    if %%I LSS 20 (
        echo Error: Se requiere Node.js 20 o superior
        echo Version actual: !NODE_VERSION!
        pause
        exit /b 1
    )
)

:: Agregar MySQL al PATH
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin"
set PATH=%MYSQL_PATH%;%PATH%

:: Verificar el archivo .env
if not exist .env (
    echo Error: No se encuentra el archivo .env
    echo Por favor, cree el archivo .env con la siguiente configuracion:
    echo DATABASE_URL=mysql://usuario:contrasena@IP-MYSQL:3306/backups
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

:: Start the application
echo Iniciando el servidor...
echo La aplicacion esta corriendo. Para detenerla, presione Ctrl+C
echo Los logs se guardaran en logs\server.log

:: Redirigir la salida a un archivo de log y a la consola
node dist/index.js > logs\server.log 2>&1

:: Si el servidor se detiene, mostrar el mensaje
echo.
echo El servidor se ha detenido. Presione cualquier tecla para cerrar esta ventana.
pause > nul

endlocal