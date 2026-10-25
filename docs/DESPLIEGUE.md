# Despliegue y ejecucion local

## Requisitos por sistema operativo

### Windows

1. Instala Docker Desktop.
2. Activa el backend WSL 2 en Docker Desktop y asegurate de que la distribucion
   WSL que usas tenga integracion habilitada.
3. Abre PowerShell en la carpeta `travel_packages`.

### Linux

Instala Docker Engine y el plugin Docker Compose. Ejecuta `docker compose` desde
la carpeta `travel_packages` con permisos para acceder al daemon de Docker.

## Configuracion con Docker Compose

Crea `.env` en la raiz del proyecto copiando `.env.example`:

```powershell
Copy-Item .env.example .env
```

```bash
cp .env.example .env
```

Configura las credenciales de PostgreSQL y RabbitMQ y una `JWT_SECRET` de al
menos 32 caracteres. Los valores de ejemplo solo son apropiados para desarrollo
local; nunca publiques `.env`.

Levanta la aplicacion completa:

```bash
docker compose up --build -d
docker compose ps
```

La API espera la disponibilidad de PostgreSQL, Redis y RabbitMQ, ejecuta las
migraciones TypeORM compiladas y expone el endpoint `/health`. El frontend y el
worker esperan a que la API este saludable. PostgreSQL utiliza el volumen
`postgres_data`. Para ver logs o detener el entorno:

```bash
docker compose logs -f
docker compose down
```

Usa `docker compose down --volumes` unicamente si quieres borrar tambien los
datos persistidos de PostgreSQL.

### Seed de desarrollo

El seed no se ejecuta automaticamente. Configura las variables `SEED_*` en
`.env` y, con Compose activo, ejecuta:

```bash
docker compose exec api npm run seed:run:prod
```

El seed crea usuarios ficticios y paquetes de demostracion. No uses esos
usuarios, contrasenas ni datos en produccion.

## Configuracion para GitHub

El workflow `.github/workflows/ci.yml` valida push y pull requests sin acceder a
servicios o credenciales externas. Si se agrega un despliegue automatizado:

- Guarda contrasenas, `JWT_SECRET`, tokens y claves de observabilidad como
  **GitHub Secrets** del repositorio o del entorno.
- Guarda valores no confidenciales (por ejemplo, un nombre de entorno o una
  URL publica) como **GitHub Variables**.
- No escribas secretos en el workflow, en el repositorio ni en los logs.

La configuracion de `.env.example` es una plantilla local, no un archivo de
secretos para produccion.

## Desarrollo ejecutando backend y frontend localmente

Levanta las dependencias:

```bash
docker compose up -d postgres redis rabbitmq
```

En Windows, copia los ejemplos locales desde `travel_packages`:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

En Linux:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Asegurate de que las credenciales del backend coincidan con las de la raiz
`.env`; desde procesos ejecutados en el equipo usa `localhost` y el puerto host
de PostgreSQL (`5433`). Ejecuta migraciones y seed desde `backend`:

```bash
npm ci
npm run migration:run
npm run seed:run
npm run start:dev
```

En otra terminal, inicia el frontend:

```bash
cd frontend
npm ci
npm run dev
```

El frontend Vite queda normalmente en `http://localhost:5173`. Swagger esta en
`http://localhost:3000/docs`, y el worker de desarrollo se inicia desde
`backend` con `npm run start:worker:dev`.
