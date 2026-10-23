# Diseno de la solucion

## Objetivo

Construir una plataforma full-stack para consultar paquetes de viaje y gestionar reservaciones, con control de acceso por roles y validacion de inventario.

## Componentes

- **Frontend:** React y TypeScript, servido durante el desarrollo con Vite.
- **Backend:** API REST con NestJS y TypeScript.
- **Persistencia:** PostgreSQL, con TypeORM y migraciones.
- **Cache:** Redis para el listado de paquetes y su invalidacion.
- **Mensajeria:** RabbitMQ para publicar el evento `reserva.creada` y procesar notificaciones de forma asincrona.

## Flujo de una reservacion

1. El cliente envia una solicitud autenticada a la API.
2. El backend valida permisos, datos e inventario disponible.
3. La reservacion y la actualizacion de inventario se guardan en PostgreSQL dentro de una transaccion.
4. Tras confirmar la operacion, se publica `reserva.creada` para que un worker procese la notificacion.

La implementacion de las entidades, migraciones, autenticacion y worker se completara durante el desarrollo. No habilitar `synchronize: true` en TypeORM.

## Servicios locales

`docker-compose.yml` proporciona PostgreSQL, Redis y RabbitMQ con comprobaciones de salud. Para ejecutar la API directamente en el equipo, los hosts de `.env` deben ser `localhost`. Si se agrega la API a Docker Compose, se deben usar los nombres de servicio (`postgres`, `redis` y `rabbitmq`).

## Decisiones pendientes de implementacion

- Definir las entidades y migraciones de usuarios, paquetes y reservaciones.
- Definir los roles y permisos requeridos por la prueba.
- Implementar manejo idempotente de mensajes y errores de procesamiento del worker.
- Agregar pruebas unitarias y de integracion para la concurrencia de inventario.
