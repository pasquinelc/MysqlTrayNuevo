node --version  # Debe mostrar v20.x.x
     npm --version   # Debe mostrar 8.x.x o superior
     ```

2. Clonar el repositorio:
   - Instalar Git desde [git-scm.com](https://git-scm.com/download/win)
   - Abrir Command Prompt y ejecutar:
     ```cmd
     git clone <tu-repositorio>
     cd <directorio>
     ```

3. Instalar dependencias:
   ```cmd
   npm install
   ```

4. Configurar archivo `.env`:
   - Crear un archivo llamado `.env` en la carpeta del proyecto
   - Copiar y ajustar el siguiente contenido:
     ```env
     # Base de datos
     DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_db

     # SMTP para emails
     SMTP_HOST=smtp.ejemplo.com
     SMTP_PORT=587
     SMTP_USER=usuario
     SMTP_PASS=contraseña
     SMTP_FROM=respaldos@tudominio.com
     NOTIFICATION_EMAILS=admin@tudominio.com

     # Directorio para respaldos (usar doble backslash en Windows)
     BACKUP_DIR=C:\\respaldos\\mysql
     ```

5. Iniciar en desarrollo:
   ```cmd
   npm run dev
   ```

La aplicación estará disponible en `http://localhost:5000`

## Despliegue en Servidor Windows

1. Requisitos del servidor:
   - Windows Server 2019 o superior
   - Mínimo 2GB RAM
   - 20GB espacio en disco

2. Instalar PostgreSQL:
   - Descargar PostgreSQL desde [postgresql.org](https://www.postgresql.org/download/windows/)
   - Durante la instalación:
     - Anotar la contraseña del usuario postgres
     - Mantener el puerto por defecto (5432)
     - Instalar todos los componentes ofrecidos

3. Crear base de datos:
   - Abrir pgAdmin 4 (instalado con PostgreSQL)
   - Crear un nuevo usuario y base de datos
   - Anotar las credenciales para el archivo `.env`

4. Instalar Node.js:
   - Descargar e instalar Node.js 20 desde [nodejs.org](https://nodejs.org/)
   - Verificar la instalación en PowerShell:
     ```powershell
     node --version
     npm --version
     ```

5. Configurar la aplicación:
   - Clonar el repositorio en el servidor
   - Instalar dependencias: `npm install`
   - Crear y configurar el archivo `.env`
   - Crear el directorio para respaldos y dar permisos

6. Inicializar base de datos:
   ```cmd
   npm run db:push
   ```

7. Compilar e iniciar:
   ```cmd
   npm run build
   npm start