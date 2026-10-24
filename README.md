# travel_packages
Full-stack travel package management platform featuring role-based access control, package search, reservation management, inventory validation, and asynchronous notifications. Built with React, NestJS, PostgreSQL, Redis, and RabbitMQ.

## Entorno local

Desde esta carpeta, crea los archivos locales a partir de los ejemplos:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Mantén las credenciales de PostgreSQL y RabbitMQ sincronizadas entre `.env` y `backend\.env`; no subas esos archivos. PostgreSQL se publica en el puerto `5433` del equipo para evitar conflictos con instalaciones locales, aunque escucha en `5432` dentro de Docker.

Levanta y revisa los servicios:

```powershell
docker compose up -d
docker compose ps
docker compose exec postgres pg_isready
```

El backend NestJS lee `backend\.env` y al iniciar verifica sus conexiones con PostgreSQL, Redis y RabbitMQ. El frontend lee `frontend\.env`; la variable `VITE_API_URL` configura la URL base de Axios.

### API

Con la API iniciada, Swagger está disponible en `http://localhost:3000/docs` y
`GET http://localhost:3000/health` comprueba PostgreSQL, Redis y RabbitMQ. 
