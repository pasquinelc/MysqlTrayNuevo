@echo off
setlocal

:: Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js no esta instalado
    exit /b 1
)

:: Verificar version de Node.js
for /f "tokens=2 delims=v" %%I in ('node -v') do set NODE_VERSION=%%I
for /f "tokens=1 delims=." %%I in ("%NODE_VERSION%") do (
    if %%I LSS 20 (
        echo Error: Se requiere Node.js 20 o superior
        exit /b 1
    )
)

:: Instalar dependencias
echo Instalando dependencias...
call npm install

:: Compilar la aplicacion
echo Compilando la aplicacion...
call npm run build

:: Verificar archivo .env
if not exist .env (
    echo Error: Archivo .env no encontrado
    echo Por favor, crea el archivo .env con la configuracion necesaria
    exit /b 1
)

:: Iniciar la aplicacion
echo Iniciando la aplicacion...
call npm start

endlocal