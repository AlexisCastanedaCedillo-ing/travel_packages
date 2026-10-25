# Registro de incidente

Este documento presenta un ejemplo de cómo investigaría y atendería un
incidente que afecta el registro de reservaciones.

## 1. Hipótesis iniciales

Lo primero que haría sería revisar qué cambió en el despliegue realizado hace
una hora y si los errores comenzaron después. Esto no demuestra que el
despliegue sea la causa, pero es una pista importante para iniciar la
investigación.

Mis principales hipótesis serían:

- **El último despliegue introdujo un problema.** El nuevo campo de las
  reservaciones pudo generar incompatibilidades o afectar las consultas a la
  base de datos.
- **La base de datos tiene problemas de rendimiento.** Podría haber consultas
  lentas, bloqueos o demasiadas conexiones ocupadas, lo que explicaría parte de
  los errores y el aumento de la latencia.
- **El worker de RabbitMQ no está procesando los mensajes correctamente o no
  puede seguir el ritmo.** Esto podría explicar el crecimiento de la cola y
  estar relacionado con los cambios recientes.
- **Hay una sobrecarga de recursos o un aumento del tráfico.** También
  consideraría esta posibilidad, especialmente durante la temporada alta.

Estas son hipótesis iniciales, no conclusiones. Puede existir una sola causa o
varios problemas simultáneos.

## 2. Investigación

1. **Revisar el despliegue:** identificar qué archivos cambiaron, cómo se
   implementó el nuevo campo y si hubo modificaciones relacionadas con la
   creación de reservaciones o el procesamiento de eventos.
2. **Analizar los logs de la API:** identificar los errores de
   `POST /reservaciones`, buscar patrones comunes y usar el `requestId` para
   rastrear las solicitudes afectadas.
3. **Comprobar PostgreSQL:** revisar si hay consultas lentas, bloqueos o falta
   de conexiones disponibles.
4. **Revisar RabbitMQ y el worker:** verificar si los mensajes se están
   procesando, si hay errores y si la cantidad de mensajes pendientes continúa
   aumentando.
5. **Contrastar la evidencia:** determinar qué hipótesis tiene mayor respaldo.

Por ejemplo, que la cola crezca no demuestra por sí solo que RabbitMQ sea el
origen del problema. El worker podría estar fallando, o la API podría estar
generando eventos más rápido de lo que se procesan.

## 3. Mitigación y solución

Como medida preliminar, consideraría revertir el último despliegue y regresar a
la versión anterior, siempre que sea seguro y compatible con los cambios
realizados en la base de datos. Si los errores disminuyen tras la reversión,
sería una señal importante, aunque todavía habría que confirmar la causa.

Si no es viable revertir el despliegue o el problema continúa, actuaría según
los resultados del diagnóstico:

- Si la base de datos está saturada, buscaría aliviar la causa sin comprometer
  las reservaciones.
- Si el problema está en el worker, intentaría recuperar su funcionamiento y,
  si fuera necesario, aumentaría su capacidad de forma controlada.

Cada opción tiene riesgos: la reversión podría ser incompatible con la
migración; aumentar los recursos del worker podría sobrecargar la base de datos;
y modificar la base de datos sin suficiente información podría empeorar la
situación.

Una vez estabilizado el sistema, investigaría la causa raíz, corregiría el
problema y probaría la solución antes de volver a desplegarla.

## 4. Criterios para considerar resuelto el incidente

Verificaría que:

- Disminuyan los errores y la latencia.
- Las nuevas reservaciones se registren correctamente.
- La cola de RabbitMQ deje de crecer y empiece a vaciarse.
- No haya reservaciones duplicadas o inconsistentes como consecuencia de los
  errores y reintentos.

Mi prioridad sería recuperar el servicio sin poner en riesgo las reservaciones
existentes. Tomaría las decisiones con base en la evidencia disponible,
entendiendo que las primeras medidas son intentos de mitigación y que no puede
considerarse resuelto el incidente hasta comprobar sus resultados.

## 5. Alerta preventiva en Grafana

Configuraría una alerta para detectar problemas en la creación de reservaciones
antes de que afecten a más usuarios:

- **Métrica:** porcentaje de respuestas HTTP 500 en `POST /reservaciones`.
- **Umbral inicial:** más del 5 % de las solicitudes devuelve errores 500.
- **Ventana de evaluación:** 5 minutos consecutivos; se evalúa el porcentaje
  de errores durante ese periodo.
- **Notificación:** enviar una alerta al equipo técnico responsable de la API y
  a la persona de guardia, para que investiguen antes de que el problema
  escale.

Como complemento, configuraría otra alerta cuando la cola `reserva.creada`
supere los 1,000 mensajes y continúe creciendo durante 5 minutos.

Estos umbrales son iniciales y deberían ajustarse según el comportamiento
normal del sistema. La intención es detectar tanto los errores que experimentan
los usuarios como los problemas de procesamiento que pueden acumularse en
segundo plano.

## 6. Comunicación durante el incidente

### Mensaje para el área de ventas

> Estamos atendiendo un problema que está provocando lentitud y errores al
> registrar algunas reservaciones. El equipo técnico ya está investigando y
> evaluando las medidas necesarias para recuperar el servicio de forma segura.
>
> Por el momento, les pedimos que no repitan una reservación sin confirmar
> primero si quedó registrada, para prevenir duplicados. Compartiremos una
> actualización en cuanto tengamos más información.

### Mensaje para el equipo técnico

> Tenemos un incidente en `POST /reservaciones`: aproximadamente el 12 % de las
> solicitudes devuelve un error 500, la latencia p95 subió a 4 s y la cola
> `reserva.creada` ya supera los 15,000 mensajes y sigue creciendo.
>
> Propongo revisar primero qué cambió en el último despliegue y correlacionar
> los errores con los logs, PostgreSQL y el estado del worker. Evaluemos
> revertir la versión si es seguro hacerlo, teniendo en cuenta la migración de
> la base de datos. Después de aplicar cualquier medida, validemos si mejoran
> los errores, la latencia y el procesamiento de la cola, y comprobemos que no
> haya reservaciones duplicadas o inconsistentes.
