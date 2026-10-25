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

## 1. Stack tecnológico y organización del backend

-   **Decisión:** Utilizar React con TypeScript para el frontend y
    NestJS con TypeScript para la API.
-   **Justificación:** TypeScript aporta tipado estático en ambas capas,
    mientras que NestJS permite organizar el backend en módulos y
    separar responsabilidades como autenticación, usuarios, paquetes y
    reservaciones.
-   **Aplicación:** Mantener controladores, servicios, DTOs y módulos
    con responsabilidades claras, facilitando pruebas y mantenimiento.

## 2. PostgreSQL como fuente de verdad

-   **Decisión:** Utilizar PostgreSQL como almacenamiento persistente
    principal para usuarios, paquetes y reservaciones.
-   **Justificación:** Las reservaciones y la disponibilidad de lugares
    requieren consistencia transaccional. La base de datos debe ser la
    autoridad definitiva sobre el cupo disponible y el estado de cada
    reservación.
-   **Aplicación:** Gestionar los cambios de cupo y la creación o
    cancelación de reservaciones dentro de transacciones. Utilizar
    migraciones para versionar los cambios del esquema y evitar
    `synchronize: true` en entornos de entrega.

## 3. TypeORM para acceso a datos

-   **Decisión:** Utilizar TypeORM como ORM para conectar NestJS con
    PostgreSQL.
-   **Justificación:** Permite definir entidades, relaciones y
    migraciones, además de ejecutar operaciones dentro de transacciones.
-   **Aplicación:** En una transacción, todas las consultas y escrituras
    relacionadas deben utilizar el `EntityManager` transaccional
    proporcionado por TypeORM, evitando mezclar operaciones
    transaccionales con el administrador global.

## 4. Control de concurrencia para evitar sobreventa

-   **Decisión:** Bloquear la fila del paquete durante la validación y
    actualización de disponibilidad mediante una transacción y un
    bloqueo pesimista de escritura, por ejemplo `SELECT ... FOR UPDATE`.
-   **Justificación:** Dos solicitudes simultáneas podrían leer el mismo
    cupo disponible e intentar reservar los mismos lugares. El bloqueo
    serializa las operaciones que afectan esa fila y permite volver a
    validar el cupo antes de descontarlo.
-   **Aplicación:** Dentro de la transacción, obtener el paquete con el
    bloqueo, comprobar que el cupo sea suficiente, crear la reservación
    y actualizar la disponibilidad. Si no hay cupo, rechazar la
    operación sin modificar los datos y responder con un conflicto HTTP
    `409`.
-   **Consideración:** El bloqueo debe ejecutarse dentro de una
    transacción real y sobre la misma conexión transaccional. La
    estrategia debe probarse con solicitudes concurrentes para confirmar
    que el cupo nunca quede negativo ni se sobrevendan lugares.

## 5. Redis para caché, no para controlar inventario

-   **Decisión:** Utilizar Redis para almacenar temporalmente resultados
    de consultas frecuentes del listado de paquetes, con un TTL
    definido.
-   **Justificación:** El caché puede reducir lecturas repetidas a
    PostgreSQL y mejorar el tiempo de respuesta. Sin embargo, su
    contenido puede estar desactualizado y no debe utilizarse como
    fuente definitiva para confirmar una reservación.
-   **Aplicación:** Ante una consulta, revisar primero el caché y
    consultar PostgreSQL si no existe una entrada válida. Invalidar las
    entradas relevantes cuando se cree o edite un paquete o cambie la
    disponibilidad por una reservación o cancelación.
-   **Consideración:** La operación de creación de reservaciones siempre
    valida el cupo contra PostgreSQL dentro de la transacción, aunque el
    listado almacenado en Redis muestre disponibilidad.

## 6. RabbitMQ y procesamiento asíncrono mediante un worker

-   **Decisión:** Utilizar RabbitMQ para distribuir el evento
    `reserva.creada` a un worker independiente de la API.
-   **Justificación:** Separar el registro de la reservación del
    procesamiento de notificaciones evita acoplar ambas tareas en la
    misma petición HTTP y permite procesar el evento de manera
    independiente.
-   **Aplicación:** La API confirma la transacción de PostgreSQL y
    después publica el evento. El worker consume el mensaje, registra
    una notificación simulada y confirma el procesamiento mediante ACK
    cuando la operación concluye correctamente.
-   **Consideración de fiabilidad:** Publicar después del `COMMIT` evita
    notificar una transacción que haya sido revertida, pero existe una
    ventana en la que la base de datos puede confirmar la reservación y
    la publicación fallar. Para una solución más robusta podría
    incorporarse el patrón Transactional Outbox.

## 7. Idempotencia del worker

-   **Decisión:** Hacer que el procesamiento de `reserva.creada` sea
    idempotente mediante un identificador único del evento o una clave
    de negocio apropiada, respaldada por una restricción única en
    PostgreSQL.
-   **Justificación:** RabbitMQ puede volver a entregar un mensaje si el
    worker falla o pierde la conexión antes de confirmar el ACK. El
    procesamiento debe tolerar entregas repetidas sin crear
    notificaciones duplicadas.
-   **Aplicación:** Registrar el evento procesado o la notificación
    usando una operación atómica, por ejemplo
    `INSERT ... ON CONFLICT DO NOTHING`, y confirmar el mensaje solo
    después de que el resultado se haya guardado correctamente.
-   **Consideración:** La clave de idempotencia debe representar
    inequívocamente el evento que se procesa. Si se permiten varios
    tipos de notificación por reservación, una restricción única solo
    por `reservation_id` podría ser demasiado restrictiva; debe
    definirse la clave según el modelo real.

## 8. Autenticación y autorización por roles

-   **Decisión:** Utilizar JWT para autenticar solicitudes y controles
    de autorización basados en roles y propiedad del recurso.
-   **Justificación:** La prueba distingue entre administradores,
    agentes y clientes. Autenticarse no significa tener permiso para
    realizar cualquier acción: la API debe comprobar tanto el rol como
    el acceso al recurso solicitado.
-   **Aplicación:** Proteger las rutas correspondientes y verificar que
    un cliente solo pueda consultar o cancelar sus propias
    reservaciones, mientras que los roles autorizados puedan realizar
    las operaciones administrativas definidas. Responder `401` cuando
    falte una autenticación válida y `403` cuando un usuario autenticado
    no tenga permiso.
-   **Seguridad complementaria:** Validar entradas mediante DTOs y
    `class-validator`, almacenar contraseñas con un algoritmo de hash
    adecuado como bcrypt, configurar CORS explícitamente y limitar
    intentos de inicio de sesión.

## 9. Validación de datos y respuestas HTTP consistentes

-   **Decisión:** Validar los datos entrantes en la API y centralizar el
    manejo de errores.
-   **Justificación:** La validación temprana reduce datos inválidos y
    facilita que el frontend interprete los errores de forma predecible.
-   **Aplicación:** Usar DTOs y validaciones para los cuerpos y
    parámetros; responder con códigos HTTP adecuados, incluyendo `400`
    para datos inválidos, `401` para solicitudes no autenticadas, `403`
    para acceso prohibido, `404` para recursos inexistentes y `409` para
    conflictos como falta de cupo.
-   **Seguridad:** No exponer trazas internas ni detalles sensibles en
    respuestas de error de producción.

## 10. Health checks, logging y documentación de API

-   **Decisión:** Exponer `GET /health`, generar logs estructurados con
    un identificador de solicitud y publicar documentación
    OpenAPI/Swagger.
-   **Justificación:** Estas herramientas facilitan verificar el estado
    de los servicios, rastrear errores entre componentes y probar la API
    durante la evaluación.
-   **Aplicación:** El health check debe comprobar las dependencias
    relevantes ---PostgreSQL, Redis y RabbitMQ--- e indicar un estado
    degradado o no saludable cuando corresponda. Los logs deben incluir
    contexto útil sin registrar contraseñas, tokens ni datos sensibles.
    Swagger debe describir endpoints, DTOs, autenticación y respuestas
    de error.

## 11. Contenedores y entorno reproducible

-   **Decisión:** Utilizar Docker Compose para ejecutar frontend, API,
    worker, PostgreSQL, Redis y RabbitMQ.
-   **Justificación:** Un entorno declarado como código reduce
    diferencias entre máquinas y permite levantar la solución con un
    flujo reproducible.
-   **Aplicación:** Definir health checks y dependencias de inicio,
    persistir los datos de PostgreSQL mediante un volumen, gestionar la
    configuración mediante variables de entorno y proporcionar un
    archivo `.env.example` sin secretos reales. La configuración de
    entrega debe incluir migraciones y datos semilla cuando sean
    necesarios.
-   **Consideración:** Dentro de la red de Compose, los servicios deben
    conectarse mediante los nombres de servicio definidos en Compose, no
    mediante `localhost`.

## 12. Estrategia de pruebas

-   **Decisión:** Combinar pruebas unitarias de servicios de dominio con
    pruebas del frontend y pruebas de integración o extremo a extremo
    para los flujos críticos.
-   **Justificación:** La lógica de reservaciones contiene reglas de
    negocio y condiciones de concurrencia que deben verificarse más allá
    de que la aplicación compile.
-   **Aplicación:** Cubrir al menos la creación de reservaciones con
    cupo disponible, el rechazo por cupo insuficiente, la cancelación y
    restitución del cupo, la autorización por propiedad de la
    reservación y el procesamiento idempotente de mensajes. Probar
    también el comportamiento de filtros y formularios en el frontend,
    respetando los mínimos definidos en la prueba técnica.

## Resumen de decisiones

-   **NestJS y React con TypeScript:** separar frontend y API con tipado
    compartido como enfoque de desarrollo.
-   **PostgreSQL:** fuente de verdad para datos y disponibilidad.
-   **TypeORM y migraciones:** acceso estructurado a datos y evolución
    controlada del esquema.
-   **Transacciones y bloqueo de fila:** evitar sobreventa bajo
    concurrencia.
-   **Redis:** acelerar listados; nunca autorizar reservas basándose
    únicamente en el caché.
-   **RabbitMQ y worker:** desacoplar el procesamiento de
    notificaciones.
-   **Idempotencia:** evitar efectos duplicados ante la redelivery de
    mensajes.
-   **JWT, roles y propiedad del recurso:** proteger operaciones y
    datos.
-   **Health checks, logs y Swagger:** facilitar diagnóstico,
    trazabilidad y evaluación.
-   **Docker Compose y pruebas automatizadas:** mejorar reproducibilidad
    y verificar los flujos críticos.
