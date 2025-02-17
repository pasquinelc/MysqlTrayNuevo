@echo off
setlocal EnableDelayedExpansion

echo Testing MySQL Connection...
echo.

:: Read environment variables from .env file if it exists
if exist .env (
    for /f "tokens=*" %%a in (.env) do (
        set %%a
    )
)

:: Set default values if not found in .env
if not defined MYSQL_HOST set MYSQL_HOST=192.168.0.99
if not defined MYSQL_PORT set MYSQL_PORT=3349
if not defined MYSQL_USER set MYSQL_USER=root2
if not defined MYSQL_PASSWORD set MYSQL_PASSWORD=pacman

echo Configuration:
echo Host: %MYSQL_HOST%
echo Port: %MYSQL_PORT%
echo User: %MYSQL_USER%
echo.

echo Testing network connectivity...
ping -n 1 %MYSQL_HOST%
if %ERRORLEVEL% neq 0 (
    echo ERROR: Cannot ping MySQL host
    echo Please check if the host is reachable
    pause
    exit /b 1
)

echo.
echo Testing MySQL connection...
mysql -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASSWORD% -e "SELECT 1;" 2>mysql_error.log
if %ERRORLEVEL% neq 0 (
    echo ERROR: Cannot connect to MySQL
    echo See mysql_error.log for details
    type mysql_error.log
    del mysql_error.log
    pause
    exit /b 1
)

echo.
echo Connection successful!
echo.
echo Press any key to exit...
pause > nul
