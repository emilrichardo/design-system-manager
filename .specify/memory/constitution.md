<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 2.0.0
Tipo de cambio: MAJOR (redefinición del Principio IV — se elimina una obligación tecnológica
                concreta que contradecía la implementación real, cerrada y probada, del pipeline
                de build/export; ADR-0028/0029/0030 y la auditoría de `011` documentan el hallazgo).

Motivo: el Principio IV exigía Style Dictionary como "la herramienta principal prevista" para el
pipeline de generación. La implementación real de `006-build-export` (ADR-0022 a ADR-0025, cerrada,
probada, 1576/1576 tests en su momento) construyó un pipeline propio, determinista, DTCG-first, sin
esa dependencia. Mantener el principio sin cambios convertía una decisión de implementación válida
en una contradicción constitucional permanente. Se resuelve mediante enmienda explícita (no de forma
tácita), conservando los objetivos originales del principio y retirando solo la obligación de
herramienta concreta.

Principio modificado:
  IV.   Style Dictionary como pipeline de generación
        → Build y export deterministas, reproducibles y extensibles mediante adapters

Objetivos preservados del principio original: standards compliance (DTCG), determinism, multi-format
output, separation between source and artifacts, reproducibility, interoperability.
Obligación eliminada: el mandato de usar Style Dictionary como "la herramienta principal prevista".
Style Dictionary pasa a ser un adapter/integración opcional de salida, nunca la autoridad del Core.

Principios sin cambios: I, II, III, V–XVII (17 principios en total, sin alteración de numeración,
alcance ni prioridad relativa).

Secciones añadidas: ninguna nueva en esta enmienda (ver v1.0.0 para las secciones fundacionales).
Secciones eliminadas: ninguna.

Plantillas y artefactos dependientes — estado de alineación tras la enmienda:
  ✅ .specify/templates/plan-template.md   — sección "Constitution Check" es genérica; sin cambio.
  ✅ .specify/templates/spec-template.md   — sin cambio.
  ✅ .specify/templates/tasks-template.md  — sin cambio.
  ✅ README.md                             — no afirma Style Dictionary como obligatorio; sin cambio.
  ✅ docs/adr/0022–0025-*.md               — quedan reconciliados con la constitución por esta
                                              enmienda (antes eran una excepción tácita sin ADR).
  ✅ docs/product/complete-design-system-model.md, specs/011/research.md — actualizados en un commit
     posterior de esta misma sesión para reflejar la enmienda ya ratificada.

TODOs diferidos: ninguno. Enmienda ratificada en la fecha indicada abajo (Last Amended).
-->

# Neuraz Design System Manager Constitution

Neuraz Design System Manager (en adelante, "el gestor") es un paquete npm que se instala
como dependencia de desarrollo dentro de un proyecto anfitrión y provee una interfaz local
para visualizar, crear, editar, validar y generar el Design System de ese proyecto.

Esta constitución define los principios **obligatorios y permanentes** que toda
especificación, plan, conjunto de tareas e implementación futura DEBE respetar. Ante
cualquier conflicto entre un artefacto del proyecto y esta constitución, prevalece la
constitución (ver _Governance_).

## Core Principles

### I. Un Design System por proyecto

Cada instalación del gestor administra **exclusivamente** el Design System del repositorio
anfitrión en el que fue instalado. El gestor NO se diseña inicialmente como plataforma SaaS
multiempresa, gestor central de múltiples Design Systems, aplicación multiusuario ni
catálogo remoto obligatorio. Cada repositorio mantiene su propia configuración, archivos,
assets e historial Git.

**Rationale**: Acotar el alcance a un único Design System local mantiene el modelo mental
simple, evita complejidad prematura (tenancy, sincronización, permisos) y refuerza que la
fuente de verdad vive en el repositorio anfitrión.

### II. Archivos locales como fuente de verdad

Los datos canónicos del Design System DEBEN almacenarse como archivos versionables dentro
del repositorio anfitrión. La interfaz DEBE leer y modificar esos archivos reales. Una base
de datos interna NO PUEDE ser la única fuente de verdad. Una base de datos futura PODRÁ usarse
como índice, caché o soporte operativo, pero los datos esenciales DEBEN poder exportarse,
versionarse y reconstruirse completamente a partir de los archivos del proyecto.

**Rationale**: Garantiza auditabilidad mediante Git, portabilidad y resiliencia frente a la
desaparición de cualquier componente de runtime.

### III. DTCG como formato canónico de tokens

Los design tokens DEBEN representarse según el estándar Design Tokens Community Group (DTCG),
conservando correctamente `$value`, `$type`, `$description`, `$extensions`, grupos, aliases y
referencias, tipos compuestos y herencia cuando corresponda. NO se DEBE inventar un formato
propietario que reemplace DTCG. Toda extensión propia DEBE alojarse bajo `$extensions` y estar
documentada.

**Rationale**: Adoptar un estándar abierto preserva la interoperabilidad y evita el bloqueo
tecnológico (lock-in) a la herramienta.

### IV. Build y export deterministas, reproducibles y extensibles mediante adapters

El build y export del Design System DEBE ser **determinista** (misma fuente → mismos bytes),
**reproducible** entre ejecuciones sucesivas sin depender de estado oculto ni de la máquina donde se
ejecuta, **compatible con los contratos DTCG soportados**, y **extensible mediante adapters** de
salida. DEBE mantenerse la dirección unidireccional:

```text
Tokens DTCG → Validación → Resolución de referencias → Pipeline de build/export → Salidas
                                                          (CSS, JS/TS, JSON, SCSS, theme.json, etc.)
```

Los archivos generados son **artefactos derivados** y DEBEN poder reconstruirse en cualquier momento
a partir de la fuente DTCG. **Style Dictionary PUEDE utilizarse como adapter o integración opcional**
de un formato de salida, pero NO ES una dependencia obligatoria ni la autoridad del Core: el Core
PUEDE implementar y mantener su propio pipeline determinista siempre que cumpla los mismos objetivos
de este principio (cumplimiento de estándares, determinismo, salida multi-formato, separación entre
fuente y artefactos, reproducibilidad e interoperabilidad).

**Rationale**: Separar fuente y artefacto evita derivas y corrupción de datos, y permite regenerar
salidas de forma determinista. Exigir una librería concreta como autoridad arquitectónica del pipeline
contradice el Principio V (independencia de framework) y el Principio IX (contratos antes que
implementaciones) cuando el Core ya demuestra — con tests cerrados y ADR-0022 a ADR-0025 — que puede
cumplir estos objetivos sin esa dependencia. El principio fija el **contrato de comportamiento**
(determinismo, reproducibilidad, multi-formato, separación fuente/artefacto, interoperabilidad), no
la implementación que lo satisface.

### V. Independencia del framework

El núcleo del Design System NO DEBE depender de React, Next.js, Astro, Vue, WordPress, Tailwind
ni de ningún framework concreto. Componentes, patrones y reglas DEBEN definirse primero mediante
contratos independientes de framework. Las implementaciones específicas para un framework DEBEN
tratarse como _adapters_ o consumidores externos al núcleo.

**Rationale**: La independencia tecnológica permite que el mismo Design System sirva a
proyectos WordPress, Astro, Next.js u otros sin acoplamiento.

### VI. El gestor es una herramienta, no el Design System

El paquete npm contiene la herramienta: interfaz, validadores, CLI, schemas, pipeline de
generación, utilidades de inspección e integraciones futuras. El repositorio anfitrión contiene
el Design System: tokens, temas, contratos de componentes, patrones, páginas de demostración,
assets, reglas, configuración y artefactos generados cuando corresponda. Actualizar el paquete
del gestor NO DEBE reemplazar ni sobrescribir silenciosamente el Design System del proyecto.

**Rationale**: Separar herramienta y datos permite actualizar el gestor sin riesgo para el
trabajo del usuario y refuerza el Principio XVII (portabilidad).

### VII. Edición visual sin ocultar el formato fuente

La interfaz DEBE facilitar la edición visual pero NUNCA ocultar completamente los archivos
canónicos. El usuario DEBE poder: identificar qué archivo se modifica, ver el valor fuente,
inspeccionar aliases, conocer las validaciones aplicadas, revisar los cambios y auditar las
modificaciones con Git. La interfaz NO DEBE producir configuraciones imposibles de entender
fuera del gestor.

**Rationale**: La transparencia evita el lock-in cognitivo y mantiene los archivos legibles y
editables por humanos y otras herramientas.

### VIII. Validación antes de generación

Antes de generar artefactos DEBEN verificarse: estructura DTCG, tipos, aliases, referencias
inexistentes, ciclos, compatibilidad de valores, contratos y errores de configuración. Los
errores críticos DEBEN impedir el build. Las advertencias no críticas DEBEN mostrarse con
claridad sin bloquear necesariamente el guardado.

**Rationale**: Validar antes de generar evita propagar datos inválidos a los artefactos y a los
proyectos consumidores.

### IX. Contratos antes que implementaciones

Componentes y patrones DEBEN definirse primero mediante contratos. Un contrato PUEDE declarar
identidad, propósito, propiedades, slots, variantes, estados, tokens consumidos, reglas de
accesibilidad, restricciones y compatibilidad. NO se DEBE almacenar código ejecutable arbitrario
como parte del contrato canónico; las implementaciones específicas pertenecen a _adapters_ o al
proyecto consumidor.

**Rationale**: Los contratos declarativos son portables, verificables y seguros, y habilitan la
independencia de framework (Principio V).

### X. Accesibilidad como requisito estructural

La accesibilidad NO DEBE tratarse como una revisión opcional al final. Los contratos de
componentes DEBEN incluir reglas de accesibilidad. La interfaz DEBE ayudar a detectar, cuando
sea posible: contraste insuficiente, estados de foco ausentes, problemas de jerarquía,
dependencias exclusivas del color, tamaños inadecuados y configuraciones incompatibles. Cada
especificación futura DEBE declarar su nivel de accesibilidad objetivo.

**Rationale**: Incorporar accesibilidad desde el contrato es más barato y más fiable que
añadirla a posteriori.

### XI. Páginas y secciones como validación del sistema

El gestor PODRÁ permitir crear páginas, secciones y composiciones de demostración cuya función
inicial es probar componentes, evaluar temas, comprobar combinaciones, revisar responsive,
documentar patrones y validar consistencia. Estas páginas NO DEBEN convertirse automáticamente
en un CMS editorial, un constructor universal de sitios, la fuente obligatoria del contenido
final ni un reemplazo de WordPress, Payload u otro CMS.

**Rationale**: Mantener el propósito de validación/documentación evita la expansión de alcance
hacia un producto distinto (Principio XVI).

### XII. Contenido como contexto opcional

El contenido PODRÁ provenir de Markdown, JSON, WordPress, Payload CMS, REST, GraphQL u otras
fuentes, y sirve inicialmente para comprender tipos de información, densidad, longitud,
necesidades visuales, componentes requeridos y patrones editoriales. El gestor NO DEBE asumir la
propiedad ni la gestión obligatoria del contenido.

**Rationale**: El contenido es insumo de diseño, no responsabilidad del gestor; esto preserva la
separación de responsabilidades con los CMS existentes.

### XIII. Funcionamiento local-first

Las funciones esenciales DEBEN poder ejecutarse localmente sin servicios cloud obligatorios. El
proyecto DEBE poder inicializarse, editarse, validarse, previsualizarse, compilarse y exportarse
sin depender de una cuenta remota. Las integraciones cloud futuras DEBEN ser opcionales y
reemplazables.

**Rationale**: Local-first garantiza disponibilidad, privacidad y ausencia de dependencias
externas críticas.

### XIV. Seguridad en las modificaciones

El gestor NO DEBE: ejecutar código arbitrario almacenado en contratos; escribir fuera de las
rutas autorizadas; eliminar archivos sin una acción explícita; sobrescribir archivos desconocidos
silenciosamente; publicar paquetes automáticamente; instalar skills de terceros automáticamente;
ni guardar secretos dentro del Design System. Toda operación destructiva DEBE ser explícita,
validada y reversible cuando sea posible.

**Rationale**: Limitar las operaciones peligrosas protege el repositorio del usuario y su cadena
de suministro.

### XV. Integración con agentes controlada

La futura skill y el futuro servidor MCP DEBEN operar sobre los **mismos** archivos canónicos que
usan la interfaz y el CLI. Los agentes DEBEN, en este orden: leer la configuración, consultar
tokens, consultar contratos, proponer cambios, validar, informar los archivos afectados y guardar
únicamente cuando la operación esté autorizada. NO DEBE existir una segunda fuente de verdad
exclusiva para agentes.

**Rationale**: Una única fuente de verdad compartida evita divergencias y mantiene la
auditabilidad sin importar quién realiza el cambio.

### XVI. Cambios incrementales y verificables

El proyecto DEBE construirse mediante funcionalidades pequeñas y comprobables. Cada especificación
DEBE resolver una necesidad concreta, declarar qué queda fuera de alcance, incluir criterios de
aceptación, evitar ampliar silenciosamente el alcance y poder validarse antes de iniciar otra
funcionalidad. NO se DEBE intentar construir toda la visión del producto en una sola iteración.

**Rationale**: La entrega incremental reduce riesgo, mantiene la calidad verificable y evita el
crecimiento descontrolado del alcance.

### XVII. Portabilidad y ausencia de bloqueo

Los archivos del Design System DEBEN poder utilizarse sin depender permanentemente del gestor. Un
proyecto DEBE conservar acceso a sus tokens DTCG, contratos, configuraciones, assets, documentación
y artefactos generados. Desinstalar el gestor NO DEBE destruir ni inutilizar el Design System.

**Rationale**: La ausencia de lock-in es una garantía contractual hacia el usuario y la prueba
última de que la fuente de verdad vive en sus archivos.

## Prioridad de los principios

Cuando dos principios entren en conflicto en un caso concreto, se resuelve aplicando el siguiente
orden de prioridad descendente. El criterio superior prevalece sobre el inferior:

1. Integridad y portabilidad de los archivos canónicos (Principios II, XVII)
2. Cumplimiento DTCG (Principio III)
3. Seguridad y reversibilidad (Principio XIV)
4. Independencia de framework (Principios V, IX)
5. Funcionamiento local-first (Principio XIII)
6. Experiencia de edición (Principio VII)
7. Extensibilidad futura (Principios XV y resto)

Toda resolución de un conflicto que invoque esta jerarquía DEBE documentarse como decisión
arquitectónica (ver _Governance_).

## Governance

Esta constitución **supersede** cualquier otra práctica del proyecto. Todo plan, especificación,
tarea e implementación DEBE verificarse contra ella.

### Propuesta de modificación de principios

Una modificación se propone por escrito (PR o documento de cambio) e incluye: el principio
afectado, el texto propuesto, la justificación y el impacto sobre artefactos dependientes
(plantillas, README, guías de agentes). La propuesta DEBE aprobarse explícitamente antes de
fusionarse.

### Excepciones

Una excepción a un principio DEBE documentarse en el artefacto donde ocurre (p. ej. en la sección
"Complexity Tracking" del plan) indicando: el principio afectado, la justificación, el alcance
acotado y la fecha de revisión. Las excepciones son temporales por defecto; una excepción
permanente requiere una enmienda de la constitución.

### Cambios que requieren enmienda

Requieren actualizar esta constitución: añadir, eliminar o redefinir un principio; cambiar el
orden de prioridad; o modificar las reglas de gobernanza. Las aclaraciones de redacción que no
alteran el significado NO requieren enmienda mayor pero SÍ un incremento de versión PATCH.

### Verificación de cumplimiento por agentes y revisores

Antes de proponer o guardar cambios, todo agente (skill, MCP, CLI) y todo revisor humano DEBE:
(1) leer esta constitución; (2) confirmar que el cambio respeta cada principio aplicable;
(3) informar explícitamente los archivos afectados; (4) detenerse y solicitar autorización ante
cualquier operación destructiva o ante un conflicto con un principio.

### Resolución de contradicciones especificación ↔ constitución

Si una especificación contradice la constitución, prevalece la constitución. La contradicción
DEBE corregirse en la especificación, o bien tramitarse como enmienda formal de la constitución
antes de continuar. Ninguna implementación PUEDE basarse en una especificación que contradiga la
constitución sin resolución previa.

### Registro de decisiones arquitectónicas (ADR)

Toda decisión arquitectónica importante (elección de stack, estructura de directorios del Design
System, formato de contratos, estrategia de adapters, resolución de un conflicto de prioridad)
DEBE registrarse como ADR versionado dentro del repositorio. Los ADR son obligatorios y forman
parte del historial auditable del proyecto.

### Versionado de la constitución

La versión sigue versionado semántico:
- **MAJOR**: cambios incompatibles de gobernanza o eliminación/redefinición de principios.
- **MINOR**: adición de un principio o sección, o ampliación material de una guía existente.
- **PATCH**: aclaraciones, correcciones de redacción y refinamientos no semánticos.

**Version**: 2.0.0 | **Ratified**: 2026-06-25 | **Last Amended**: 2026-07-01
