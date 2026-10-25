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
`GET http://localhost:3000/health` comprueba PostgreSQL, Redis y RabbitMQ. Los
endpoints de paquetes (`/paquetes`) y reservaciones (`/reservaciones`) requieren
un JWT obtenido con `POST /auth/login`.

### Seed local

Antes de ejecutar la semilla, configura estas variables en `backend\.env`.
Puedes usar estas cuentas ficticias para desarrollo y pruebas locales:

```dotenv
SEED_ADMIN_EMAIL=admin@viajeslili.test
SEED_ADMIN_PASSWORD=AdminDemo2026!
SEED_AGENT_EMAIL=agente@viajeslili.test
SEED_AGENT_PASSWORD=AgentDemo2026!
SEED_CUSTOMER_EMAIL=cliente@viajeslili.test
SEED_CUSTOMER_PASSWORD=ClienteDemo2026!
```

Las credenciales de inicio de sesión son:

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@viajeslili.test` | `AdminDemo2026!` |
| Agente | `agente@viajeslili.test` | `AgentDemo2026!` |
| Cliente | `cliente@viajeslili.test` | `ClienteDemo2026!` |

Son datos de prueba, no uses información personal ni estas credenciales en
producción. Las contraseñas deben tener al menos 12 caracteres. Si cambias los
valores en `backend\.env`, usa los nuevos valores para iniciar sesión.

Una vez hecho esto desde `travel_packages\backend`, ejecuta:

```powershell
npm run migration:run
npm run seed:run
```

La semilla es idempotente: actualiza las cuentas configuradas y crea los paquetes
de ejemplo si todavía no existen.

Para ejecutar el worker de notificaciones en otra terminal desde
`travel_packages\backend`:

```powershell
npm run start:worker:dev
```

El worker consume `reserva.creada`, persiste el procesamiento de forma idempotente
en `processed_notifications`, reintenta hasta tres veces y guarda los mensajes
que agoten los reintentos en la cola durable `reservation.created.dead`.
