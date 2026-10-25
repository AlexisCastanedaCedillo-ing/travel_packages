# Diseño de la solución

Objetivo: validar que el candidato puede modelar un dominio sencillo, tomar decisiones técnicas justificadas y comunicarlas con claridad.

# Requisitos técnicos:

## Diagrama de componentes

```mermaid
---
title: "4. Component Diagram - Docker Compose Deployment Architecture"
---
flowchart TB
    B["Navegador del evaluador"]
    CMD["Host Windows con Docker Desktop + WSL 2<br/>o Linux con Docker<br/>docker compose up --build"]

    subgraph compose["Docker Compose — red interna definida, nombre por acordar"]
        FE["Contenedor frontend<br/>Servidor de archivos del build Vite<br/>Healthcheck HTTP"]
        API["Contenedor API NestJS<br/>Migraciones y seed al arrancar<br/>Healthcheck GET /health"]
        W["Contenedor worker<br/>Consumidor independiente<br/>Healthcheck de proceso y conexiones"]
        PG[("Contenedor PostgreSQL 15+<br/>Healthcheck pg_isready")]
        R[("Contenedor Redis<br/>Healthcheck PING")]
        MQ["Contenedor RabbitMQ<br/>Healthcheck de disponibilidad AMQP"]
        V[("Volumen persistente PostgreSQL<br/>Nombre por acordar")]
    end

    CMD -.->|"Construye y arranca"| compose
    B -->|"HTTP: puerto frontend publicado, por definir"| FE
    B -->|"HTTP: puerto API publicado, por definir<br/>REST, Swagger y /health"| API
    API -->|"SQL interno"| PG
    API -->|"Protocolo Redis interno"| R
    API -->|"AMQP interno"| MQ
    W -->|"SQL interno"| PG
    W <-->|"AMQP interno: entregas y ACK"| MQ
    PG ---|"Datos persistentes"| V

    API -.->|"depends_on: service_healthy"| PG
    API -.->|"depends_on: service_healthy"| R
    API -.->|"depends_on: service_healthy"| MQ
    W -.->|"depends_on: service_healthy<br/>Esquema y seed listos"| API
    FE -.->|"depends_on: service_healthy"| API
```

## Modelo de datos

```mermaid
---
title: "2. Data Model - Reservations Entity Relationship Model"
---
erDiagram
    direction TB

    USUARIOS ||..o{ RESERVACIONES : "es cliente de"
    USUARIOS ||..o{ RESERVACIONES : "crea"
    PAQUETES ||..o{ RESERVACIONES : "recibe"
    RESERVACIONES ||..o| NOTIFICACIONES_PROCESADAS : "tiene notificación creada"

    USUARIOS {
        uuid id PK
        varchar email UK "Normalizado para login"
        text password_hash "Nunca contraseña en claro"
        rol_usuario rol "admin, agente, cliente"
        timestamptz created_at
    }

    PAQUETES {
        uuid id PK
        varchar destino "NOT NULL"
        date fecha_inicio "NOT NULL"
        date fecha_fin "fecha_fin mayor o igual a fecha_inicio"
        numeric precio "numeric(12,2), mayor o igual a cero"
        int capacidad_total "Mayor que cero"
        int cupo_disponible "Entre cero y capacidad_total"
        timestamptz created_at
        timestamptz updated_at
    }

    RESERVACIONES {
        uuid id PK
        uuid cliente_id FK "NOT NULL, indice"
        uuid creado_por_id FK "NOT NULL, auditoria del actor"
        uuid paquete_id FK "NOT NULL, indice"
        int numero_personas "Mayor que cero"
        numeric precio_unitario "numeric(12,2), snapshot del precio"
        numeric importe_total "numeric(14,2), precio_unitario por personas"
        estado_pago estado_pago "PENDIENTE, PAGADA, CANCELADA"
        timestamptz created_at
        timestamptz updated_at
    }

    NOTIFICACIONES_PROCESADAS {
        uuid event_id PK "Igual al id de reserva para reserva.creada"
        uuid reservacion_id FK,UK "Una notificación creada por reserva"
        text mensaje "Notificación simulada persistida"
        timestamptz processed_at
    }
```

## Diagrama de secuencia del flujo "crear reservación"

```mermaid
---
title: "3. Secuencial Diagram - PostgreSQL Reservation Transaction Flow"
---
sequenceDiagram
    autonumber
    participant F as Cliente / Frontend
    participant A as API NestJS
    participant G as JWT / RBAC / DTO
    participant S as Servicio de reservaciones
    participant DB as PostgreSQL
    participant R as Redis
    participant Q as RabbitMQ
    participant W as Worker independiente

    F->>A: POST /reservaciones + JWT<br/>paqueteId, numeroPersonas, clienteId si agente
    A->>A: Asignar requestId y contexto de logs
    A->>G: Validar JWT, permisos y datos

    break JWT ausente, inválido o expirado
        G-->>A: No autenticado
        A-->>F: 401 Unauthorized
    end
    break Rol sin permiso o cliente intenta reservar para otro
        G-->>A: Operación no autorizada
        A-->>F: 403 Forbidden
    end
    break DTO inválido
        G-->>A: Datos inválidos
        A-->>F: 400 Bad Request
    end

    G-->>A: Actor y datos válidos<br/>clienteId propio o cliente indicado por agente
    A->>S: Crear reservación
    S->>DB: BEGIN con EntityManager transaccional
    S->>DB: Validar usuario destino y rol cliente

    break Cliente destino inexistente o con rol incorrecto
        S->>DB: ROLLBACK
        S-->>A: Destino inválido
        A-->>F: 400 Bad Request
    end

    S->>DB: SELECT paquete WHERE id = paqueteId FOR UPDATE
    Note over S,DB: La fila queda bloqueada hasta COMMIT o ROLLBACK.<br/>Otra solicitud del mismo paquete espera y reevalúa el cupo actualizado.
    DB-->>S: Paquete bloqueado o inexistente

    break Paquete inexistente
        S->>DB: ROLLBACK
        S-->>A: Paquete no encontrado
        A-->>F: 404 Not Found
    end
    break Cupo disponible menor que numeroPersonas
        S->>DB: ROLLBACK
        S-->>A: Sin cupo suficiente
        A-->>F: 409 Conflict
    end

    S->>DB: UPDATE paquete SET cupo_disponible = cupo_disponible - personas
    S->>DB: INSERT reservación PENDIENTE<br/>Precio y total calculados por el servidor

    alt Fallo de persistencia antes de confirmar
        DB-->>S: Error
        S->>DB: ROLLBACK
        S-->>A: Error controlado + requestId
        A-->>F: 500 Internal Server Error<br/>o 503 por indisponibilidad temporal identificada
    else Escrituras correctas
        S->>DB: COMMIT
        DB-->>S: Confirmación recibida
        Note over S,DB: Solo desde aquí existe una reserva confirmada.<br/>Redis y RabbitMQ no participan en esta transacción.

        S->>R: INCR versión del listado, con timeout acotado
        alt Redis disponible
            R-->>S: Nueva versión
        else Redis no disponible
            S->>S: Log de invalidación fallida<br/>Reserva permanece confirmada
        end

        S->>Q: Publicar reserva.creada, mensaje persistente<br/>eventId = reservacionId, correlationId = requestId
        alt Publicación confirmada y enrutada
            Q-->>S: Publisher confirm, sin basic.return
            S-->>A: Reservación creada
            par Respuesta HTTP
                A-->>F: 201 Created + reservación
            and Procesamiento independiente
                Q-)W: Entregar reserva.creada
                W->>DB: BEGIN e INSERT notificación<br/>ON CONFLICT DO NOTHING RETURNING event_id
                alt Evento nuevo
                    DB-->>W: Una fila insertada
                else Evento duplicado
                    DB-->>W: Cero filas insertadas, sin nuevo efecto
                end
                alt Persistencia correcta
                    W->>DB: COMMIT
                    DB-->>W: Confirmación
                    W->>Q: ACK manual
                else Fallo al persistir la notificación
                    W->>DB: ROLLBACK
                    W->>Q: NACK según política acotada de reintentos
                end
            end
        else Fallo, devolución o timeout de publicación
            S->>S: Log crítico con reservacionId y eventId<br/>Entrega pendiente o incierta, sin registro durable de reintento
            S-->>A: Reservación confirmada, notificación no garantizada
            A-->>F: 201 Created + reservación
            Note over S,Q: No revertir ni recrear la reserva por este fallo.<br/>Sin Outbox puede perderse el evento.<br/>Una recuperación debe reutilizar el mismo eventId.
        end
    end

    Note over A,DB: El manejador transaccional cubre errores en cualquier operación SQL.<br/>Si se pierde la conexión durante COMMIT, el resultado puede ser incierto:<br/>no afirmar rollback ni recomendar un reintento ciego.
```
### Diagrama adicional para facilitar la vista de la secuencia de una reservación

```mermaid
---
title: "1. Additional - Reservations NestJS Architecture"
---
flowchart LR
    subgraph browser["Navegador"]
        FE["Frontend React + TypeScript + Vite<br/>Zustand · Tailwind CSS<br/>React Hook Form + Zod"]
    end

    subgraph api["API NestJS — un proceso modular"]
        HTTP["Controladores REST<br/>Swagger /docs<br/>Validación y errores<br/>Logs JSON + requestId"]
        AUTH["Autenticación y autorización<br/>JWT · RBAC · propiedad del recurso"]
        PKG["Módulo de paquetes<br/>Filtros y paginación"]
        RES["Módulo de reservaciones<br/>Transacciones y control de cupo"]
        CACHE["Adaptador de caché<br/>TTL y versión del listado"]
        PUB["Publicador de eventos<br/>Publisher confirms"]
        HEALTH["GET /health<br/>Verificación de dependencias"]
        HTTP --> AUTH
        AUTH --> PKG
        AUTH --> RES
        HTTP --> HEALTH
        PKG --> CACHE
        RES --> CACHE
        RES --> PUB
    end

    PG[("PostgreSQL<br/>Fuente de verdad<br/>Usuarios, paquetes y reservaciones<br/>Notificaciones procesadas")]
    REDIS[("Redis<br/>Optimización del listado<br/>No decide el cupo")]
    MQ["RabbitMQ<br/>Cola durable reserva.creada<br/>No almacena las reservaciones"]
    WORKER["Worker independiente<br/>Consumidor idempotente<br/>Notificación simulada en tabla"]

    FE -->|"HTTP / JSON + Bearer JWT"| HTTP
    AUTH -->|"SQL: usuarios y propiedad"| PG
    PKG -->|"SQL: consultas y CRUD"| PG
    RES -->|"SQL: bloqueo, escritura y COMMIT"| PG
    CACHE <-->|"GET / SET con TTL / INCR versión"| REDIS
    PUB -->|"AMQP: reserva.creada después de COMMIT"| MQ
    MQ -.->|"Entrega asíncrona"| WORKER
    WORKER -->|"SQL: INSERT idempotente"| PG
    WORKER -.->|"ACK después de COMMIT"| MQ
    HEALTH -.->|"Comprobar conexión"| PG
    HEALTH -.->|"Comprobar conexión"| REDIS
    HEALTH -.->|"Comprobar conexión"| MQ
```

## Decisiones técnicas

**Proyecto:** Sistema de gestión de paquetes turísticos y reservaciones --- Viajes Lili

**Propósito:** Documentar las principales decisiones de arquitectura y
explicar cómo responden a los requisitos de la prueba técnica.

## 1. Stack tecnológico, persistencia y acceso a datos

- **Decisión:** Utilizar React con TypeScript para el frontend, NestJS con
  TypeScript para la API y PostgreSQL como fuente de verdad, accedido mediante
  TypeORM y migraciones.
- **Justificación:** TypeScript aporta tipado estático en ambas capas y NestJS
  permite separar responsabilidades en módulos. PostgreSQL ofrece la
  consistencia transaccional que requieren las reservaciones y la disponibilidad;
  TypeORM permite definir entidades, relaciones y migraciones.
- **Aplicación:** Organizar el backend en controladores, servicios, DTOs y
  módulos. Gestionar cambios de cupo y reservaciones dentro de transacciones,
  usando siempre el `EntityManager` transaccional. Versionar el esquema con
  migraciones y no habilitar `synchronize: true` en entornos de entrega.

## 2. Control de concurrencia para evitar sobreventa

- **Decisión:** Bloquear la fila del paquete durante la validación y actualización
  de disponibilidad, mediante una transacción y un bloqueo pesimista de escritura
  (`SELECT ... FOR UPDATE`).
- **Justificación:** El bloqueo serializa las solicitudes concurrentes sobre el
  mismo paquete y permite volver a validar el cupo antes de descontarlo.
- **Aplicación:** Dentro de una misma transacción, bloquear el paquete, comprobar
  disponibilidad, crear la reservación y descontar los lugares. Si no hay cupo,
  no modificar los datos y responder con `409 Conflict`. Verificar con pruebas
  que el cupo nunca sea negativo ni se sobrevendan lugares.

## 3. Redis para caché, no para controlar inventario

- **Decisión:** Cachear temporalmente con TTL los resultados frecuentes del
  listado de paquetes.
- **Justificación:** Redis reduce lecturas repetidas a PostgreSQL, pero sus datos
  pueden estar desactualizados y no deben decidir si una reservación puede
  confirmarse.
- **Aplicación:** Consultar PostgreSQL ante un cache miss e invalidar el listado
  cuando se cree o edite un paquete, o cambie su disponibilidad por una
  reservación o cancelación. La validación final del cupo siempre se hace contra
  PostgreSQL dentro de la transacción.

## 4. RabbitMQ y procesamiento asíncrono mediante un worker

- **Decisión:** Publicar el evento `reserva.creada` en RabbitMQ para que lo
  procese un worker independiente de la API.
- **Justificación:** Desacoplar la persistencia de la reservación del
  procesamiento de notificaciones evita ejecutar ambas tareas dentro de la
  misma petición HTTP.
- **Aplicación:** Confirmar la transacción de PostgreSQL antes de publicar.
  El worker registra una notificación simulada y confirma el mensaje con ACK
  después de persistirla. Existe una ventana en la que la reserva puede quedar
  confirmada aunque falle la publicación; un patrón Transactional Outbox sería
  una alternativa para mejorar esa garantía.

## 5. Idempotencia del worker

- **Decisión:** Hacer idempotente el procesamiento de `reserva.creada` mediante
  un identificador único del evento respaldado por una restricción en PostgreSQL.
- **Justificación:** RabbitMQ puede entregar de nuevo un mensaje si el worker
  falla antes de confirmar el ACK; esos reintentos no deben duplicar
  notificaciones.
- **Aplicación:** Registrar el evento de forma atómica, por ejemplo con
  `INSERT ... ON CONFLICT DO NOTHING`, y confirmar el mensaje solo después de
  guardar el resultado. La clave de idempotencia debe identificar de forma
  inequívoca el efecto que se procesa.

## 6. Autenticación, autorización y validación de solicitudes

- **Decisión:** Usar JWT para autenticar y aplicar autorización por rol y
  propiedad del recurso; validar entradas con DTOs y `class-validator`.
- **Justificación:** Los roles admin, agente y cliente tienen permisos
  distintos. La validación y los errores HTTP consistentes ayudan a proteger
  los datos y a que los clientes de la API reaccionen de forma predecible.
- **Aplicación:** Comprobar permisos y propiedad de las reservaciones; responder
  `401` si la autenticación falta o no es válida, `403` si el usuario no tiene
  permiso, `400` ante datos inválidos, `404` ante recursos inexistentes y `409`
  ante conflictos como falta de cupo. Almacenar contraseñas con bcrypt,
  configurar CORS explícitamente, limitar intentos de inicio de sesión y no
  exponer trazas ni datos sensibles en errores de producción.

## 7. Observabilidad y entorno reproducible

- **Decisión:** Exponer `GET /health`, documentar la API con OpenAPI/Swagger y
  ejecutar frontend, API, worker, PostgreSQL, Redis y RabbitMQ mediante Docker
  Compose.
- **Justificación:** Los health checks y logs con contexto facilitan el
  diagnóstico; Swagger facilita probar la API y Compose reduce diferencias entre
  entornos.
- **Aplicación:** Comprobar PostgreSQL, Redis y RabbitMQ en el health check;
  incluir identificadores de solicitud en logs sin registrar secretos. Definir
  health checks y dependencias de inicio, persistir PostgreSQL en un volumen,
  gestionar configuración con variables de entorno y mantener un `.env.example`
  sin secretos reales. Dentro de Compose, conectar los servicios mediante sus
  nombres de servicio.

## 8. Estrategia de pruebas

- **Decisión:** Combinar pruebas unitarias de servicios de dominio con pruebas
  del frontend y pruebas de integración o extremo a extremo para flujos críticos.
- **Justificación:** Las reglas de reservación y concurrencia requieren
  verificarse más allá de que la aplicación compile.
- **Aplicación:** Cubrir creación con cupo disponible, rechazo por cupo
  insuficiente, cancelación y restitución del cupo, autorización por propiedad y
  procesamiento idempotente. Probar también filtros y formularios del frontend,
  respetando los mínimos definidos en la prueba técnica.

## Resumen de decisiones

- **Stack, persistencia y acceso a datos:** React, NestJS, PostgreSQL y TypeORM
  con migraciones.
- **Concurrencia:** transacciones y bloqueo de fila para evitar sobreventa.
- **Caché:** Redis acelera listados, pero no decide la disponibilidad real.
- **Mensajería:** RabbitMQ y worker desacoplan las notificaciones.
- **Idempotencia:** los reintentos no duplican efectos.
- **Seguridad y validación:** JWT, roles, propiedad del recurso y DTOs.
- **Operación:** health checks, logs, Swagger y Compose favorecen diagnóstico y
  reproducibilidad.
- **Pruebas:** verifican reglas críticas del backend y frontend.
