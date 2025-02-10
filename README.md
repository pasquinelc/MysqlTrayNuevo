curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```
   - macOS con Homebrew:
     ```bash
     brew install node@20
     ```

2. Verificar la instalación:
   ```bash
   node --version  # Debe mostrar v20.x.x
   npm --version   # Debe mostrar 8.x.x o superior
   ```

3. Clonar el repositorio:
   ```bash
   git clone <tu-repositorio>
   cd <directorio>
   ```

4. Instalar dependencias:
   ```bash
   npm install
   ```

### Ambiente de Producción (Servidor)

1. Requisitos del servidor:
   - Ubuntu 20.04 o superior recomendado
   - 2GB RAM mínimo
   - 20GB espacio en disco

2. Instalar Node.js 20:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Instalar PostgreSQL:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

4. Configurar PostgreSQL:
   ```bash
   sudo -u postgres createuser --interactive
   sudo -u postgres createdb nombre_db
   ```

5. Configurar variables de entorno:
   Crear archivo `.env` con:
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

   # Directorio para respaldos
   BACKUP_DIR=/ruta/a/directorio/respaldos
   ```

6. Inicializar la base de datos:
   ```bash
   npm run db:push
   ```

7. Compilar la aplicación:
   ```bash
   npm run build
   ```

8. Iniciar en producción:
   ```bash
   npm start
   ```

La aplicación estará disponible en `http://localhost:5000`

## Verificación de la Instalación

1. Verificar que el servidor web responde:
   ```bash
   curl http://localhost:5000
   ```

2. Verificar conexión a la base de datos:
   ```bash
   npm run db:push
   ```

3. Verificar permisos del directorio de respaldos:
   ```bash
   sudo chown -R nodeuser:nodeuser $BACKUP_DIR
   sudo chmod 755 $BACKUP_DIR