#!/bin/bash

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js no está instalado"
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Se requiere Node.js 20 o superior"
    exit 1
fi

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Error: PostgreSQL no está instalado"
    exit 1
fi

# Instalar dependencias
echo "Instalando dependencias..."
npm install

# Compilar la aplicación
echo "Compilando la aplicación..."
npm run build

# Verificar archivo .env
if [ ! -f .env ]; then
    echo "Error: Archivo .env no encontrado"
    echo "Por favor, crea el archivo .env con la configuración necesaria"
    exit 1
fi

# Inicializar base de datos
echo "Inicializando base de datos..."
npm run db:push

# Iniciar la aplicación
echo "Iniciando la aplicación..."
NODE_ENV=production npm start
