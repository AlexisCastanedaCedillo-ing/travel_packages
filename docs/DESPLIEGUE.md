# Despliegue y ejecucion local

## Requisitos

- Node.js compatible con las dependencias del proyecto.
- npm.
- Docker Desktop con Docker Compose.

## Preparar variables

Desde la raiz del repositorio, copia `.env.example` como `.env` y ajusta los valores para tu equipo. El archivo `.env` contiene configuracion local y no debe subirse al repositorio.

## Iniciar los servicios de datos

```powershell
docker compose up -d
docker compose ps
```

Compose inicia PostgreSQL, Redis y RabbitMQ. PostgreSQL conserva sus datos en el volumen `postgres_data`. RabbitMQ Management queda disponible en `http://localhost:15672`; usa las credenciales definidas por `RABBITMQ_USER` y `RABBITMQ_PASSWORD`.

## Ejecutar aplicaciones durante el desarrollo

En una terminal:

```powershell
Set-Location backend
npm ci
npm run start:dev
```

En otra terminal:

```powershell
Set-Location frontend
npm ci
npm run dev
```

El frontend de Vite normalmente queda disponible en `http://localhost:5173`. La configuracion de conexion del backend debe apuntar a `localhost` para los servicios ejecutados en Docker. Las migraciones y la configuracion completa de la API se agregaran al implementar persistencia.

## Detener los servicios

```powershell
docker compose down
```

Para borrar tambien los datos persistidos, usa `docker compose down --volumes`. Esta accion elimina los datos locales de PostgreSQL.

## Produccion

Este archivo Compose esta destinado al desarrollo local. Antes de desplegar en produccion, configura secretos en un gestor seguro, TLS, copias de seguridad, limites de recursos, monitoreo y servicios administrados; no reutilices las credenciales de ejemplo.
