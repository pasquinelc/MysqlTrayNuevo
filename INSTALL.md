3. Abre una terminal (CMD o PowerShell) como administrador y navega a la carpeta del proyecto

4. Ejecuta los siguientes comandos para instalar y compilar:
```cmd
npm install
npm run build
```

5. Para iniciar el servidor, usa:
```cmd
start.bat
```

Nota: Si prefieres usar PowerShell, también puedes iniciar el servidor con:
```powershell
$env:NODE_ENV="production"; node dist/index.js
```

## Configuración Distribuida

### Servidor MySQL (XAMPP)
1. Asegúrate de que MySQL esté escuchando en todas las interfaces:
   - Edita my.ini en XAMPP
   - Cambia bind-address a 0.0.0.0
   - Reinicia MySQL

2. Crea un usuario con acceso remoto:
```sql
CREATE USER 'backup_user'@'%' IDENTIFIED BY 'tu_contraseña';
GRANT ALL PRIVILEGES ON backups.* TO 'backup_user'@'%';
FLUSH PRIVILEGES;
```

### Servidor Node.js (con GlassFish)
1. Instala Node.js 20 o superior
2. Copia los archivos del proyecto
3. Crea el archivo .env con la IP correcta del servidor MySQL
4. Ejecuta start.bat

### Servidor Web (XAMPP)
1. Habilita los módulos necesarios en Apache:
```bash
a2enmod proxy
a2enmod proxy_http
a2enmod headers