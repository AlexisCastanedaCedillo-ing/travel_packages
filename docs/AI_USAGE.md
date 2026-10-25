# Bitácora de uso de IA — Viajes Lili

## 1. Herramientas utilizadas

Durante el desarrollo de la prueba utilicé tres herramientas de IA, cada una con una función distinta:

| Herramienta | Uso principal |
|---|---|
| **ChatGPT** | Preparación de la configuración inicial del proyecto, análisis de decisiones técnicas y elaboración de prompts detallados para orientar a otras herramientas. |
| **Mermaid AI** | Generación de diagramas de arquitectura, modelo de datos, flujo de reservaciones y despliegue a partir de los requisitos de la prueba. |
| **GitHub Copilot (modo agente)** | Análisis del repositorio, elaboración de planes de implementación, generación y modificación de código, análisis de fragmentos existentes y apoyo en la depuración. |

La diferencia principal entre ChatGPT y GitHub Copilot fue el papel que desempeñaron en la planificación. Utilicé ChatGPT para preparar instrucciones que definieran con claridad el contexto, las restricciones y el resultado esperado. Después, proporcioné esas instrucciones a Copilot, que analizó el repositorio y generó los planes concretos de implementación, teniendo en cuenta el estado real del proyecto.

Mermaid AI se utilizó específicamente para facilitar la elaboración de los diagramas técnicos.

## 2. Prompts clave utilizados

Los siguientes son los cuatro prompts principales que guiaron el trabajo. Se describe su objetivo y el resultado obtenido, sin reproducir íntegramente cada instrucción.

### 2.1. Configuración inicial del proyecto

**Herramienta:** ChatGPT.

**Contexto:** Necesitaba organizar la inicialización de una aplicación full stack para una prueba técnica, utilizando las tecnologías requeridas y preparando el entorno para trabajar por etapas.

**Objetivo del prompt:** Obtener una guía de configuración inicial para el backend, frontend, dependencias e infraestructura necesaria, respetando los requisitos de la prueba y evitando decisiones que dificultaran la integración posterior.

**Resultado:** Se generó el documento `initialConfig`, que utilicé como referencia para preparar el entorno y establecer una base de trabajo antes de avanzar con la implementación.

**Validación:** Revisé las instrucciones y las contrasté con el estado del proyecto. Durante la configuración, comprobé los comandos y las dependencias mediante su ejecución y atendí los errores que aparecieron, en lugar de asumir que la guía funcionaría sin ajustes.

### 2.2. Generación de diagramas técnicos

**Herramienta:** ChatGPT para preparar el prompt y Mermaid AI para generar los diagramas.

**Contexto:** La prueba requería documentar la arquitectura y el diseño técnico. Quería generar diagramas coherentes con los requisitos antes de utilizarlos en la documentación del proyecto.

**Objetivo del prompt:** Solicitar diagramas que representaran la arquitectura general, el modelo entidad-relación, el flujo de creación de una reservación y el despliegue de los componentes, utilizando los requisitos de la prueba como referencia.

**Resultado:** Mermaid AI generó propuestas de diagramas que posteriormente pude revisar e integrar en el proyecto.

**Validación:** Revisé los diagramas para comprobar que las entidades, relaciones y componentes tuvieran sentido dentro de la arquitectura propuesta. Consideré los resultados como borradores que debían contrastarse con los requisitos y las decisiones técnicas del proyecto, no como una definición incuestionable del sistema.

### 2.3. Planeación de persistencia con TypeORM

**Herramienta:** ChatGPT para preparar el prompt y GitHub Copilot para analizar el repositorio y generar el plan.

**Contexto:** Era necesario completar la persistencia del backend con PostgreSQL y TypeORM, incluyendo entidades, relaciones, migraciones y operaciones de negocio. La implementación debía respetar la configuración existente y evitar reconstruir elementos que ya estuvieran preparados.

**Objetivo del prompt:** Pedir a Copilot una planeación secuencial, dividida en fases verificables: configuración de TypeORM, entidades, migraciones y, finalmente, servicios y controladores. La instrucción también buscaba que el plan tuviera en cuenta el repositorio real y que el trabajo pudiera revisarse antes de continuar con cada fase.

**Resultado:** Copilot generó `PLANEACION_PERSISTENCIA_TYPEORM.md`, con objetivos, tareas, orden de ejecución, verificaciones y criterios de aceptación para cada fase.

**Validación:** Leí el plan completo y revisé la coherencia de las relaciones, las restricciones, el orden de las migraciones y los criterios de aceptación. Presté especial atención a las decisiones que podían afectar la integridad de los datos, como el control de capacidad de las reservaciones y el uso de transacciones. Cuando una propuesta no estaba clara o podía entrar en conflicto con el proyecto, la revisé antes de utilizarla como guía de implementación.

### 2.4. Planeación de implementación del frontend

**Herramienta:** ChatGPT para preparar el prompt y GitHub Copilot para analizar el repositorio y generar el plan.

**Contexto:** Una vez que el backend estaba desarrollado y validado, necesitaba organizar exclusivamente el desarrollo del frontend con React, TypeScript, Zustand y las demás tecnologías seleccionadas.

**Objetivo del prompt:** Solicitar un plan de frontend dividido en fases, que contemplara pantallas, navegación, roles, formularios, estado global, integración con la API y pruebas. También se especificó que el backend existente debía conservarse y que su inspección solo debía servir para conocer los contratos y facilitar la integración.

**Resultado:** Copilot generó `PLAN_IMPLEMENTACION.md`, con el alcance del frontend, las pantallas, los flujos por rol, la arquitectura propuesta y los criterios de aceptación.

**Validación:** Revisé el plan completo y comprobé que respetara el alcance solicitado. También verifiqué que las rutas y los campos propuestos para el frontend debían contrastarse con los contratos reales de la API, evitando asumir que los nombres utilizados en un plan coincidían necesariamente con los implementados en el backend.

## 3. Cómo validé los resultados

Mi criterio durante toda la prueba fue no aceptar una respuesta únicamente porque pareciera correcta o estuviera bien redactada.

Las principales medidas de validación fueron:

- **Lectura completa:** revisé los resultados generados, incluidos los planes extensos, antes de utilizarlos como guía de trabajo.
- **Revisión de coherencia:** comprobé que las propuestas respetaran los requisitos de la prueba, la arquitectura existente y las decisiones tomadas previamente.
- **Investigación adicional:** cuando una tecnología, un comando o una decisión no me resultaba familiar, o algo me parecía extraño, investigaba su significado y funcionamiento antes de aceptarlo.
- **Pruebas prácticas:** siempre que algo podía ejecutarse o probarse, lo comprobaba. Esto incluyó comandos, instalación de dependencias, compilación, pruebas automatizadas y comportamiento funcional.
- **Pruebas de escenarios reales:** además de comprobar los casos principales, probé situaciones adicionales que podían aparecer durante el uso normal, aunque no estuvieran descritas explícitamente en cada requisito.
- **Corrección iterativa:** cuando encontraba un error, una incompatibilidad o una propuesta que no encajaba con el proyecto, ajustaba las instrucciones o la implementación y volvía a comprobar el resultado.

La validación no se limitó a verificar que el código compilara. También consideré los permisos, los estados de error, la integridad de las operaciones y la coherencia entre frontend y backend.

## 4. Ejemplos de errores o propuestas que requirieron revisión

### 4.1. Incompatibilidad entre dependencias del frontend

Durante la instalación de dependencias del frontend apareció un conflicto entre versiones de React Hook Form y su resolver para validaciones.

La instalación tenía `react-hook-form@8.0.0-beta.5`, mientras que `@hookform/resolvers@5.4.0` esperaba una versión compatible con `react-hook-form@^7.55.0`. npm reportó el conflicto mediante el error `ERESOLVE`.

**Cómo lo detecté:** no asumí que la instalación estaba bien solo porque las dependencias se habían recomendado para el proyecto. Revisé el mensaje de npm y las versiones involucradas para identificar la incompatibilidad.

**Cómo lo corregí:** ajusté la dependencia de React Hook Form a la rama estable compatible de la versión 7 y volví a comprobar el árbol de dependencias y la instalación.

Este caso me recordó que una selección de bibliotecas adecuada no garantiza que cualquier combinación de versiones sea compatible. La compatibilidad real debe verificarse con las versiones instaladas.

### 4.2. Una planeación que excedía el alcance solicitado

Durante la preparación del plan del frontend, Copilot comenzó a orientar parte de la planeación hacia el backend, aunque esa parte del proyecto ya estaba desarrollada y validada.

**Cómo lo detecté:** al revisar el resultado, observé que la propuesta no respetaba completamente el alcance de la tarea.

**Cómo lo corregí:** ajusté las instrucciones para delimitar explícitamente el trabajo al frontend. El backend solo debía inspeccionarse para conocer los endpoints, permisos y formatos de respuesta necesarios para la integración. Cualquier incompatibilidad encontrada debía documentarse como una dependencia o incidencia, sin reconstruir el backend automáticamente.

Este ejemplo demuestra que, además de revisar si una propuesta es técnicamente correcta, también es necesario comprobar que resuelva el problema solicitado y respete el estado actual del proyecto.

### 4.3 Detalles incorrectos detectados durante el uso de IA

Durante el desarrollo encontré algunos errores y omisiones en los resultados generados por la IA. Estos casos comprueban la importancia de revisar los cambios y no asumir que una respuesta es correcta solo porque parece completa.

- **Configuración de RabbitMQ:** Al preparar la configuración de `.env` para trabajar con Docker, inicialmente se utilizaba una URL directa de conexión. Después, la configuración cambió para utilizar cuatro variables independientes, como el host y el usuario. Aunque la IA actualizó el archivo `.env` de la raíz y eliminó la configuración anterior de ahí, dejó en el backend la declaración de la URL que ya estaba en desuso. Esto podía provocar que la aplicación siguiera utilizando una configuración obsoleta. Fue necesario revisar los archivos relacionados y detectar que el cambio no se había aplicado en todos los lugares.

- **Revisión de ortografía y redacción:** En algunas ocasiones, al solicitar correcciones de ortografía, la IA también eliminaba palabras u oraciones que consideraba innecesarias, aunque aportaban información importante. Por ejemplo, llegó a quitar el nombre de la empresa Viajes Lili de la documentación. Esto me llevó a distinguir entre corregir la redacción y modificar el contenido, revisando que se conservaran los nombres y la información relevante.

- **Omisiones en el plan de implementación del frontend:** Al generar el prompt para planificar el frontend, la IA omitió algunas funcionalidades solicitadas, como la paginación y los filtros. Por ello, fue necesario revisar el plan contra los requisitos originales y señalar los elementos faltantes antes de continuar con la implementación.

## 5. Qué decidí no delegar a la IA

Aunque utilicé IA para acelerar distintas tareas, mantuve bajo mi responsabilidad las decisiones finales sobre el alcance, la aceptación de los planes y la validación de los resultados.

En particular, no consideré que la IA pudiera sustituir:

- **La revisión de los requisitos y la decisión sobre qué debía incluir la entrega:** porque era necesario asegurar que se cumplieran los objetivos de la prueba y no se omitieran funcionalidades importantes.
- **La comprobación de la integridad de los datos, los permisos y los flujos críticos:** porque son aspectos importantes para evitar errores y asegurar que el sistema se comporte correctamente.
- **La decisión específica de la organización de carpetas y archivos:** porque muchas veces la IA implementa una organizacion principalmente eficiente, pero suele ser mas complicado verlo como desarrollador.
- **La verificación práctica de que el resultado funcionara correctamente:** porque generar código no garantiza que funcione como se espera en situaciones reales.
- **Los colores base del sistema:** porque quería mantener una apariencia visual consistente con el estilo que buscaba, que en este caso son los colores de Viajes Lili.
- **Elementos de UX, como botones y alineaciones de componentes:** porque necesitaba revisar que la interfaz fuera clara, cómoda y coherente, fungiendo yo como el usuario.
- **Los nombres de variables y las traducciones de errores:** porque buscaba mantener nombres comprensibles y mensajes adecuados al contexto de la aplicación, como por ejemplo los errores por estatus.
- **La decisión sobre cómo trabajar con los formularios y si debían ser independientes:** porque dependía de cómo se utilizarían y de la organización que mejor se adaptara a las necesidades del sistema.

## 6. Propuesta para mejorar el proceso de desarrollo del equipo

Una forma de aprovechar la IA dentro de un equipo de desarrollo sería utilizarla primero para preparar instrucciones detalladas y después emplear un agente de programación para ejecutar el trabajo a partir de ellas.

Por ejemplo, antes de pedir a un agente que implemente un módulo complejo, se podría elaborar un prompt que incluya el contexto, los requisitos, las restricciones, la arquitectura existente y los criterios de aceptación. Esto reduce las ambigüedades y ayuda a que el agente trabaje con un objetivo más claro.

También utilizaría la IA para generar planes de implementación por fases cuando un módulo sea grande o tenga varias dependencias. Cada fase tendría objetivos concretos, tareas, verificaciones y condiciones para continuar. De esta manera, el equipo podría implementar y revisar el trabajo progresivamente, manteniendo el contexto general sin intentar resolver todo en una sola operación.

El objetivo no sería delegar el criterio técnico, sino reducir el tiempo dedicado a organizar el trabajo, mejorar la consistencia de las instrucciones y facilitar que los cambios se revisen antes de avanzar.

## 7. Conclusión

La IA fue una herramienta de apoyo para organizar, documentar, implementar y revisar el proyecto, pero no la utilicé como fuente incuestionable de verdad.

El criterio aplicado fue combinar la generación asistida con lectura crítica, investigación y pruebas reales. La utilidad de estas herramientas dependió tanto de la calidad de las instrucciones como de la capacidad de detectar errores, corregir propuestas y comprobar que los resultados cumplieran con los requisitos de la prueba.
