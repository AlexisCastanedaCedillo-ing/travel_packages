# Viajes Lili

Aplicacion full-stack para administrar paquetes y reservaciones de viaje. Usa
React, NestJS, PostgreSQL, Redis y RabbitMQ con un worker de notificaciones.

## Requisitos

- Docker Desktop con Docker Compose y WSL 2 (Windows), o Docker Engine y el
  plugin Docker Compose (Linux).
- Git para obtener el proyecto.
- Para desarrollo local sin contenedores de aplicacion: Node.js y npm
  compatibles con los lockfiles del backend y frontend.

### Preparacion en Windows (Docker Desktop + WSL 2)

1. Instala e inicia Docker Desktop.
2. En **Settings > General**, habilita **Use the WSL 2 based engine**.
3. En **Settings > Resources > WSL Integration**, habilita la distribucion
   Linux que vayas a usar. Tambien puedes ejecutar los comandos desde PowerShell.
4. Abre PowerShell en `travel_packages` y confirma que Docker responde:

```powershell
docker --version
docker compose version
```

### Preparacion en Linux

Instala e inicia Docker Engine y el plugin Docker Compose. El usuario debe
tener permisos para acceder al daemon de Docker. Desde `travel_packages`,
confirma la instalacion:

```bash
docker --version
docker compose version
```

## Inicio completo con Docker Compose

Desde esta carpeta (`travel_packages`), crea la configuracion local:

```powershell
Copy-Item .env.example .env
```

En Linux/macOS:

```bash
cp .env.example .env
```

Los valores de `.env.example` son exclusivamente para desarrollo local. Cambia
las contrasenas y `JWT_SECRET` antes de cualquier despliegue; no compartas ni
subas el archivo `.env`.

Construye e inicia frontend, API, worker y servicios de datos:

```bash
docker compose up --build -d
docker compose ps
```

Compose espera a que PostgreSQL, Redis y RabbitMQ esten saludables antes de
iniciar la API. La API aplica las migraciones al arrancar; el worker se inicia
cuando la API esta lista. Los datos de PostgreSQL se conservan en el volumen
`postgres_data`.

| Servicio | URL |
|---|---|
| Frontend | <http://localhost:5173> |
| API y Swagger | <http://localhost:3000/docs> |
| Salud de la API | <http://localhost:3000/health> |
| RabbitMQ Management | <http://localhost:15672> |

El panel de RabbitMQ usa `RABBITMQ_USER` y `RABBITMQ_PASSWORD` de `.env`.
PostgreSQL se publica en el puerto local `5433` para evitar conflictos, y
escucha en `5432` dentro de la red de Compose.

### Abrir y probar la aplicacion

La interfaz web esta en <http://localhost:5173>. `http://localhost:3000/` es
la raiz de la API y devuelve `Hello World` como ruta de comprobacion; no es la
pagina web. Para explorar la API abre <http://localhost:3000/docs> (Swagger)
y para confirmar las conexiones usa <http://localhost:3000/health>.

La base nueva no contiene cuentas ni paquetes de demostracion. Inicialos una
vez con el seed:

```bash
docker compose exec api npm run seed:run:prod
```

Luego inicia sesion en la interfaz con una cuenta de demostracion de la tabla
siguiente. Son datos locales de ejemplo definidos en `.env.example`; si cambias
las variables `SEED_*` en `.env`, inicia sesion con los valores nuevos.

| Rol | Email de demostracion | Contrasena de demostracion |
|---|---|---|
| Administrador | `admin@viajeslili.test` | `AdminDemo2026!` |
| Agente | `agente@viajeslili.test` | `AgentDemo2026!` |
| Cliente | `cliente@viajeslili.test` | `ClienteDemo2026!` |

El seed es idempotente: puedes repetirlo para volver a asegurar esas cuentas y
crear los paquetes de ejemplo que falten.

Para revisar logs y detener los servicios:

```bash
docker compose logs -f api worker
docker compose down
```

`docker compose down --volumes` tambien elimina permanentemente la base de datos
local.

### Variables de entorno

`.env.example` documenta las variables de Compose y sirve como plantilla. Los
puertos publicados, credenciales de servicios, clave JWT y URL publica del API
se configuran ahi. `VITE_API_URL` se incluye en el frontend durante su
construccion, por lo que debe apuntar a una URL accesible desde el navegador.
Las contrasenas de ejemplo y el JWT de esa plantilla son valores ficticios para
desarrollo local, no secretos seguros para produccion.

En GitHub Actions, usa **Secrets** para credenciales, claves privadas y tokens;
usa **Variables** para valores de configuracion no confidenciales. La CI actual
no necesita credenciales para ejecutar pruebas o construir imagenes. No uses
credenciales de `.env.example` fuera de un entorno local.

## Desarrollo sin contenedores de aplicacion

Compose puede levantar solo PostgreSQL, Redis y RabbitMQ:

```bash
docker compose up -d postgres redis rabbitmq
```

Crea los archivos `.env` a partir de sus ejemplos en `backend` y `frontend`;
ajusta los hosts del backend a `localhost` y usa `frontend/.env.example` para
configurar `VITE_API_URL`. Para migraciones, seed y ejecucion local, consulta
[docs/DESPLIEGUE.md](./docs/DESPLIEGUE.md).

## Integracion continua

**CI** significa *Continuous Integration* (integracion continua): cada cambio
se valida automaticamente en un entorno limpio para detectar errores antes de
integrarlo a la rama principal. `.github/workflows/ci.yml` ejecuta con `push` y
`pull_request`:

- Lint, pruebas y build de backend y frontend.
- Build multi-stage de las imagenes Docker de API, worker y frontend.
- Cache de npm y de Docker BuildKit.

### Probar las mismas validaciones manualmente

Desde PowerShell, en esta carpeta:

```powershell
Set-Location backend
npm ci
npm run lint
npm test -- --runInBand
npm run build

Set-Location ..\frontend
npm ci
npm run lint
npm test
npm run build

Set-Location ..
docker compose build api worker frontend
```

Cada comando debe terminar con codigo de salida `0`; cualquier error hace
fallar ese paso. `npm ci` instala las versiones fijadas en el lockfile, lint
revisa estilo/problemas estaticos, test ejecuta las pruebas automatizadas y
build compila la aplicacion. El build Docker valida las imagenes del API,
worker y frontend sin publicarlas.

### Ejecutar pruebas y generar cobertura

Las pruebas unitarias del backend y del frontend se ejecutan por separado. En
Windows, abre PowerShell desde `travel_packages` y usa:

```powershell
Set-Location backend
npm ci
npm test -- --runInBand
npm run test:cov -- --runInBand

Set-Location ..\frontend
npm ci
npm test
```

En Linux, desde `travel_packages`, usa:

```bash
cd backend
npm ci
npm test -- --runInBand
npm run test:cov -- --runInBand

cd ../frontend
npm ci
npm test
```

`npm run test:cov` genera el reporte de cobertura **del backend** en
`backend/coverage/`; abre `backend/coverage/lcov-report/index.html` para
consultarlo. Jest aplica el umbral configurado de al menos 60 % en sentencias y
lineas. Actualmente Vitest ejecuta las pruebas del frontend, pero no tiene
configurado un reporte de cobertura para ese proyecto.

### Como lo ejecuta el evaluador en GitHub

1. El evaluador publica el repositorio en GitHub y abre la pestana **Actions**.
2. Un `push` a cualquier rama o la apertura/actualizacion de un pull request
   inicia el workflow `CI`.
3. Los jobs `Backend checks` y `Frontend checks` instalan dependencias con
   `npm ci` y ejecutan lint, pruebas y build.
4. Si ambos jobs pasan, `Build Docker images` construye las imagenes de API,
   worker y frontend. Un paso rojo indica el comando que fallo; los logs del
   job muestran su salida.
5. El resultado completo se considera satisfactorio cuando todos los jobs
   aparecen en verde. La cache acelera ejecuciones futuras; no cambia que se
   vuelvan a validar los cambios.

Este workflow **no despliega**, no sube imagenes a un registry y no se conecta a
servicios externos; solo valida el codigo y construye imagenes localmente en el
runner de GitHub.

### Que guardar en GitHub Secrets

Un **Secret** es un valor confidencial guardado en la configuracion del
repositorio/entorno de GitHub y disponible para un workflow solo si este lo
referencia. Se usa para contrasenas reales, `JWT_SECRET`, tokens de acceso a
registries o credenciales de despliegue. Se crea en **Settings > Secrets and
variables > Actions > New repository secret** (o dentro de un Environment).
Luego el workflow lo referencia como `${{ secrets.NOMBRE }}`; no se imprime ni
se guarda en el repositorio.

Para el workflow de esta prueba **no es necesario crear ningun Secret**: sus
pasos actuales no usan credenciales privadas. Solo se anadirian cuando se
incorpore una tarea que requiera autenticarse, por ejemplo publicar una imagen
o desplegar. Una **Variable** de GitHub sirve para configuracion no confidencial
(como un nombre de entorno); el workflow la obtiene con
`${{ vars.NOMBRE }}`. No guardes secretos en Variables, en `.env.example` ni en
el archivo YAML.

La API documentada en Swagger esta protegida segun roles para los recursos de
paquetes y reservaciones; los usuarios inician sesion en `POST /auth/login`.

## Pendiente y limitaciones conocidas

- El worker guarda una notificacion simulada en la base de datos; no envia
  correos ni mensajes a un servicio externo.
- La publicacion del evento ocurre despues de confirmar la reservacion. Si
  RabbitMQ falla en esa ventana, no hay un registro durable para reintentar la
  publicacion; implementar un patron Transactional Outbox mejoraria esa
  garantia.
- El cambio de estatus para marcar como pagada no utiliza realmente una 
  transaccion monetaria ni utiliza un servicio externo para realizar pagos,
  para esta prueba se simula que los pagos concluyen correctamente y permite
  el cambio de estatus manualmente.
