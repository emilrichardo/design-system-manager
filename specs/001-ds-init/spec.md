# Feature Specification: Inicialización de un Design System local (ds-init)

**Feature Branch**: `001-ds-init`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Inicialización de un Design System local — permitir que una persona que ya instaló Neuraz Design System Manager dentro de un proyecto anfitrión pueda inicializar un único Design System local, portable y versionable en ese repositorio."

## Resumen

Esta funcionalidad permite a una persona que ya instaló el gestor como dependencia de
desarrollo **crear desde cero un único Design System local** en su repositorio anfitrión,
mediante una operación equivalente a `npx neuraz-ds init` (el nombre definitivo del ejecutable
se confirma en `/speckit-plan`). La inicialización produce una base **mínima, válida,
comprensible, portable y segura**: un manifiesto que identifica el Design System, la
configuración mínima del gestor, una fuente canónica de tokens compatible con DTCG y un
conjunto pequeño de tokens de ejemplo, con separación inequívoca entre archivos fuente,
configuración y futuros artefactos generados. La operación es no destructiva, requiere
confirmación antes de escribir y deja todo listo para versionarse con Git.

Esta especificación describe **qué** necesita el usuario y **cómo** se verificará, no su
implementación. La estructura exacta de directorios y los nombres definitivos de archivos se
deciden en `/speckit-plan` y se registran mediante ADR (Constitución, Governance).

## Clarifications

### Session 2026-06-25

- Q: ¿Comportamiento cuando el proyecto no tiene `package.json` / no es proyecto npm? → A:
  `package.json` es **obligatorio**; si no se encuentra uno válido dentro del límite autorizado,
  la operación se detiene sin escribir nada y muestra un error pidiendo inicializar npm e
  instalar el gestor. La ausencia de `package.json` NO es un proyecto vacío válido.
- Q: ¿Cómo se determina la "raíz anfitriona" y cómo se comporta desde una subcarpeta o monorepo?
  → A: Se resuelve ascendiendo desde el directorio real de ejecución hasta el `package.json` más
  cercano, sin superar la raíz Git más cercana (cuando exista); ese directorio es la raíz
  anfitriona y el único límite de escritura autorizado. En monorepos se elige el `package.json`
  más cercano (un solo workspace, no la raíz global). Una config Neuraz válida previa tiene
  prioridad si está dentro de la misma raíz.
- Q: ¿Regla exacta de slug válido y versión inicial por defecto? → A: Slug obligatorio, validado
  con `^[a-z0-9]+(?:-[a-z0-9]+)*$` (minúsculas ASCII, dígitos y guiones simples; sin guiones
  inicial/final ni consecutivos; sin espacios, barras, puntos ni `.`/`..`); se autopropone desde
  el nombre pero un slug manual inválido se rechaza sin corregir en silencio. Versión inicial por
  defecto `0.1.0`, debe cumplir SemVer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicializar un proyecto vacío de Design System (Priority: P1)

Como usuario de un proyecto existente que aún no tiene Design System administrado, quiero
inicializar un Design System local para obtener una base válida sin crear manualmente todos
los archivos.

**Why this priority**: Es el caso de uso central y el motivo de existir de la funcionalidad.
Sin él, no hay producto. Constituye el MVP: ejecutarlo una vez en un proyecto limpio debe
producir un Design System válido y detectable.

**Independent Test**: En un directorio temporal limpio (proyecto anfitrión sin Design System),
ejecutar la inicialización, aportar los datos mínimos, confirmar, y verificar que se crean los
archivos esperados, que la fuente de tokens valida contra DTCG y que el gestor reconoce el
Design System resultante.

**Acceptance Scenarios**:

1. **Given** un proyecto anfitrión sin Design System previo, **When** el usuario ejecuta la
   inicialización, **Then** el sistema detecta que no existe una inicialización previa.
2. **Given** la inicialización en curso, **When** el sistema necesita datos, **Then** solicita
   únicamente los datos mínimos (nombre, slug, descripción opcional, versión inicial con valor
   por defecto, confirmación de ubicación).
3. **Given** los datos provistos y validados, **When** el sistema va a escribir, **Then**
   muestra un resumen del plan (Design System, raíz anfitriona/ubicación resuelta, archivos
   nuevos, conflictos) antes de crear nada.
4. **Given** el plan confirmado por el usuario, **When** el sistema escribe, **Then** crea una
   fuente DTCG mínima válida y una configuración reconocible por futuras herramientas.
5. **Given** los archivos creados, **When** el sistema valida la estructura resultante, **Then**
   la validación finaliza satisfactoriamente.
6. **Given** la operación completada, **When** el sistema informa el resultado, **Then** enumera
   con claridad los archivos creados, la ubicación de la fuente canónica, cómo verificarla y el
   siguiente paso disponible.

---

### User Story 2 - Evitar sobrescrituras accidentales (Priority: P1)

Como usuario, quiero que el inicializador detecte archivos existentes para no perder trabajo
previo.

**Why this priority**: La seguridad de los datos del usuario es un principio constitucional
(no sobrescribir, no destruir). Una inicialización que pisara archivos sería inaceptable, por lo
que esta protección es tan crítica como el flujo feliz.

**Independent Test**: En un proyecto que ya contiene algún archivo en las rutas objetivo,
ejecutar la inicialización y verificar que los conflictos se detectan y enumeran, que nada se
sobrescribe sin consentimiento explícito y que cancelar no deja archivos parciales.

**Acceptance Scenarios**:

1. **Given** un proyecto con archivos en rutas que la inicialización usaría, **When** se ejecuta
   la inicialización, **Then** el sistema NO sobrescribe archivos desconocidos.
2. **Given** un Design System existente, **When** se ejecuta la inicialización, **Then** el
   sistema NO lo reemplaza silenciosamente.
3. **Given** conflictos detectados, **When** se muestra el plan, **Then** el sistema enumera cada
   conflicto encontrado.
4. **Given** conflictos detectados, **When** el sistema informa, **Then** explica qué acción se
   necesita para continuar.
5. **Given** una operación cancelada por el usuario o por conflictos, **When** termina, **Then**
   no quedan archivos parciales creados por la inicialización.

---

### User Story 3 - Repetir la inicialización con seguridad (Priority: P2)

Como usuario, quiero poder volver a ejecutar la inicialización sin duplicar ni corromper la
configuración.

**Why this priority**: La idempotencia evita daños por reejecución accidental y habilita flujos
de verificación/reparación. Importante, pero secundaria respecto a crear y a no sobrescribir.

**Independent Test**: Sobre un proyecto ya inicializado correctamente, ejecutar la
inicialización por segunda vez y verificar que se informa el estado actual, que no se crean
duplicados, que no se modifican archivos válidos sin autorización y que la operación puede
finalizar sin cambios.

**Acceptance Scenarios**:

1. **Given** un proyecto ya inicializado, **When** se ejecuta de nuevo, **Then** el sistema lo
   detecta como ya inicializado.
2. **Given** un proyecto ya inicializado, **When** se ejecuta de nuevo, **Then** informa el
   estado actual del Design System.
3. **Given** una reejecución, **When** el sistema actúa, **Then** no crea archivos duplicados.
4. **Given** archivos válidos existentes, **When** el sistema actúa, **Then** no los modifica sin
   autorización explícita.
5. **Given** que no hay nada pendiente, **When** la operación termina, **Then** finaliza sin
   realizar modificaciones.

---

### User Story 4 - Conservar portabilidad (Priority: P2)

Como usuario, quiero que el Design System siga siendo comprensible aunque elimine el paquete
gestor.

**Why this priority**: La ausencia de lock-in es un principio constitucional (Portabilidad).
Es una propiedad transversal que se verifica sobre el resultado de la US1.

**Independent Test**: Tras inicializar, simular la ausencia del gestor (p. ej. eliminar la
dependencia) y verificar que los archivos canónicos permanecen, son legibles y siguen siendo
compatibles con DTCG, sin necesidad de ejecutar el gestor ni una base de datos.

**Acceptance Scenarios**:

1. **Given** un Design System inicializado, **When** se inspeccionan los datos canónicos,
   **Then** no dependen de ninguna base de datos.
2. **Given** los tokens creados, **When** se leen, **Then** permanecen en un formato compatible
   con DTCG.
3. **Given** el manifiesto y la configuración, **When** se abren con un editor de texto, **Then**
   son legibles y comprensibles.
4. **Given** el Design System inicializado, **When** se accede a sus datos, **Then** no se
   requiere ejecutar el gestor para leerlos.
5. **Given** el paquete gestor desinstalado, **When** se inspecciona el repositorio, **Then** los
   archivos creados por la inicialización permanecen intactos.

---

### User Story 5 - Recuperarse de una inicialización fallida (Priority: P2)

Como usuario, quiero que un error durante la inicialización no deje el proyecto en un estado
ambiguo.

**Why this priority**: La atomicidad protege la integridad del repositorio y es exigida por la
métrica de éxito 6 (una falla no debe declarar la inicialización como completa). Importante para
la confianza, secundaria al flujo feliz.

**Independent Test**: Inducir un fallo durante la escritura (p. ej. permisos insuficientes en una
ruta objetivo) y verificar que los datos se validan antes de escribir, que no queda una
configuración marcada como completa, que el error se informa con su causa concreta y que los
archivos previos del usuario permanecen intactos y la operación puede reintentarse.

**Acceptance Scenarios**:

1. **Given** datos de entrada inválidos, **When** se ejecuta la inicialización, **Then** se
   validan antes de escribir cualquier archivo.
2. **Given** una falla durante la operación, **When** termina con error, **Then** no deja una
   configuración declarada como completa.
3. **Given** una falla, **When** el sistema informa, **Then** indica la causa concreta del error.
4. **Given** una falla corregible, **When** el usuario corrige el problema, **Then** puede volver
   a ejecutar la operación.
5. **Given** una falla, **When** termina, **Then** los archivos previos del usuario permanecen
   intactos.

---

### Edge Cases

La especificación define el comportamiento esperado para cada caso.

- **Ejecución fuera de un proyecto npm / sin `package.json`**: el sistema **se detiene sin
  escribir ningún archivo** y muestra un error indicando que primero debe inicializarse el
  proyecto npm e instalarse el gestor (FR-001a, FR-001b). La ausencia de `package.json` no se
  considera un proyecto vacío válido para esta funcionalidad.
- **Repositorio con archivos que coinciden parcialmente** (algunas rutas objetivo existen y otras
  no): se trata como conflicto (US2); se enumeran las rutas en conflicto y no se sobrescribe
  ninguna; el usuario debe resolver antes de continuar. No se realiza una creación parcial.
- **Configuración existente pero incompleta** (manifiesto/config presentes pero inválidos o a
  medias): se detecta como estado inconsistente; se informa el estado y los campos faltantes; no
  se sobrescribe sin autorización explícita; la operación no declara éxito.
- **Tokens existentes sin configuración del gestor**: se detecta como estado parcial; se informa
  que existen tokens pero no configuración; se enumeran y no se sobrescriben; se indica la acción
  necesaria para integrarlos. No se asume su validez.
- **Slug inválido** (caracteres no permitidos, espacios, mayúsculas, guiones inicial/final o
  consecutivos, barras, puntos, `.`/`..`): se rechaza antes de escribir, con un mensaje que
  describe el formato válido (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) y permite reintentar. Un slug escrito
  manualmente NO se corrige en silencio (FR-008a).
- **Nombre vacío**: se rechaza antes de escribir; el nombre es obligatorio; se solicita de nuevo.
- **Ubicación sin permisos de escritura**: se detecta antes o durante la validación previa; la
  operación falla limpiamente (US5) informando la causa; no deja archivos parciales.
- **Enlaces simbólicos que conduzcan fuera del repositorio**: el sistema no escribe a través de
  symlinks que apunten fuera del repositorio autorizado; se trata como condición de seguridad y
  se rechaza la escritura por esa ruta (Requisitos de seguridad).
- **Operación interrumpida** (cancelación del usuario, cierre del proceso): no quedan archivos
  parciales; el repositorio queda como antes de iniciar (atomicidad, US5).
- **Design System ya inicializado**: se detecta y se informa el estado; no se duplica ni se
  corrompe; puede finalizar sin cambios (US3).
- **Archivos DTCG existentes con errores**: se detectan como inválidos durante la inspección; se
  informa que existen tokens con errores; no se sobrescriben silenciosamente; se indica la acción
  necesaria. La inicialización no "arregla" automáticamente esos archivos.
- **Ejecución desde una subcarpeta en lugar de la raíz**: el sistema asciende desde el directorio
  real de ejecución hasta el `package.json` más cercano (sin superar la raíz Git más cercana) y
  opera sobre esa raíz anfitriona resuelta (FR-001c…FR-001f). La ubicación elegida se muestra
  antes de confirmar.
- **Monorepo con varios `package.json`**: se utiliza el `package.json` más cercano al directorio
  de ejecución; la raíz anfitriona es ese workspace, **no** la raíz global del monorepo. La
  primera versión no administra varios workspaces simultáneamente (FR-001g).
- **Ruta/symlink/config que escapa de la raíz anfitriona**: tras normalizar y resolver la ruta
  real, cualquier ruta que conduzca fuera de la raíz anfitriona (incluidos symlinks hacia el
  exterior, directorios superiores u otro workspace) se rechaza y la operación falla **antes** de
  escribir cualquier archivo (FR-025, FR-001h).

## Requirements *(mandatory)*

### Functional Requirements

Inspección y detección de estado

- **FR-001**: El sistema MUST ejecutarse sobre el proyecto anfitrión actual y operar dentro de la
  raíz anfitriona resuelta (ver FR-001c…FR-001f), sin escribir fuera de ella.
- **FR-001a**: El sistema MUST requerir un `package.json` válido dentro del límite autorizado. Si
  no existe, MUST detenerse sin escribir ningún archivo y mostrar un error indicando que primero
  debe inicializarse el proyecto npm e instalarse el gestor. La ausencia de `package.json` NO se
  considera un proyecto vacío válido.
- **FR-001b**: El sistema MUST NOT crear un `package.json`, ejecutar `npm init`, agregar
  dependencias ni modificar scripts de `package.json` (concuerda con FR-028, FR-029).
- **FR-001c**: El sistema MUST resolver la raíz anfitriona así: (1) tomar el directorio real de
  ejecución; (2) ascender hasta el `package.json` más cercano; (3) identificar la raíz Git más
  cercana cuando exista; (4) el `package.json` debe estar dentro de esa raíz Git; (5) la búsqueda
  nunca asciende por encima de la raíz Git; (6) sin repositorio Git, la raíz anfitriona es el
  directorio que contiene el `package.json` más cercano.
- **FR-001d**: Si existe una configuración Neuraz previa válida dentro de la misma raíz anfitriona,
  esa configuración MUST tener prioridad para identificar el Design System.
- **FR-001e**: En un monorepo con varios `package.json`, el sistema MUST usar el más cercano al
  directorio de ejecución; la raíz anfitriona es ese workspace, no la raíz global.
- **FR-001f**: El sistema MUST mostrar la raíz anfitriona/ubicación elegida al usuario antes de
  confirmar la escritura.
- **FR-001g**: Esta primera versión MUST NOT administrar varios workspaces simultáneamente.
- **FR-001h**: Antes de escribir, el sistema MUST normalizar y resolver todas las rutas por su
  ruta real, y MUST rechazar cualquier ruta, enlace simbólico o configuración que conduzca fuera
  de la raíz anfitriona (directorios superiores, otro workspace o rutas absolutas externas),
  fallando antes de escribir cualquier archivo.
- **FR-002**: El sistema MUST administrar exactamente un (1) Design System por proyecto.
- **FR-003**: El sistema MUST inspeccionar el directorio actual antes de cualquier escritura.
- **FR-004**: El sistema MUST comprobar si ya existe una inicialización/configuración previa y
  clasificar el estado como: inexistente, completo, o incompleto/parcial.
- **FR-005**: El sistema MUST identificar todos los conflictos (rutas objetivo ya ocupadas) antes
  de escribir y enumerarlos al usuario.

Entrada de datos mínima

- **FR-006**: El sistema MUST solicitar únicamente los datos esenciales: nombre del Design System,
  identificador/slug, descripción (opcional), versión inicial (con valor por defecto razonable) y
  confirmación de la ubicación propuesta.
- **FR-007**: El sistema MUST NOT realizar en esta funcionalidad un cuestionario completo de
  identidad visual ni solicitar datos no esenciales.
- **FR-008**: El sistema MUST validar los datos de entrada ANTES de escribir cualquier archivo:
  nombre no vacío; slug que cumple `^[a-z0-9]+(?:-[a-z0-9]+)*$` (minúsculas ASCII, dígitos y
  guiones simples; sin guion inicial/final ni consecutivos; sin espacios, barras, puntos ni
  `.`/`..`); y versión que cumple SemVer. Datos inválidos impiden continuar hasta corregirse.
- **FR-008a**: El sistema MUST autoproponer el slug a partir del nombre (minúsculas →
  transliterar/eliminar diacríticos → separadores y espacios a un único guion → eliminar
  caracteres no permitidos → recortar guiones inicial/final), permitir editarlo antes de
  confirmar y, si el resultado queda vacío, solicitar edición manual. El sistema MUST NOT corregir
  en silencio un slug escrito manualmente: si es inválido, explica el problema y pide corrección.
- **FR-009**: El sistema MUST proponer la versión inicial por defecto `0.1.0` (SemVer válido)
  cuando el usuario no indique otra; el usuario PUEDE ingresar otra versión SemVer válida.

Plan, confirmación y escritura

- **FR-010**: El sistema MUST presentar un resumen previo de cambios (Design System a crear,
  ubicación propuesta, archivos nuevos, conflictos) antes de crear archivos.
- **FR-011**: El sistema MUST requerir confirmación explícita del usuario antes de crear archivos.
- **FR-012**: El sistema MUST crear un manifiesto local que identifique el Design System (al menos
  nombre, slug, versión y descripción si se proporcionó).
- **FR-013**: El sistema MUST crear la configuración mínima del gestor, suficiente para que
  futuras herramientas detecten y localicen el Design System automáticamente.
- **FR-014**: El sistema MUST generar un conjunto inicial pequeño de tokens en formato compatible
  con DTCG (ver "Tokens iniciales").
- **FR-015**: El sistema MUST establecer una separación inequívoca entre archivos fuente,
  configuración y futuros artefactos generados.
- **FR-016**: El sistema MUST dejar suficiente información (manifiesto + configuración) para que
  futuras funciones encuentren el Design System sin intervención manual.

Validación y resultado

- **FR-017**: El sistema MUST validar la estructura resultante tras escribir, incluyendo la
  validez DTCG de los tokens generados.
- **FR-018**: El sistema MUST informar al finalizar: archivos creados, ubicación de la fuente
  canónica, cómo verificarla y el siguiente paso disponible.
- **FR-019**: El sistema MUST producir mensajes que distingan claramente entre información,
  advertencia, conflicto, error y éxito.

Idempotencia, atomicidad y portabilidad

- **FR-020**: El sistema MUST poder reejecutarse sin producir duplicados ni corromper una
  configuración válida existente.
- **FR-021**: El sistema MUST poder finalizar sin modificaciones cuando un proyecto ya está
  correctamente inicializado y no hay nada pendiente.
- **FR-022**: El sistema MUST garantizar atomicidad: ante una falla o interrupción, no deja
  archivos parciales ni una configuración declarada como completa.
- **FR-023**: El sistema MUST producir archivos legibles y utilizables sin el gestor, sin
  depender de una base de datos.
- **FR-024**: El sistema MUST dejar el resultado listo para versionarse con Git (archivos de
  texto versionables; sin requerir un commit automático).

Restricciones de seguridad (comportamiento prohibido)

- **FR-025**: El sistema MUST NOT escribir fuera del proyecto anfitrión / repositorio autorizado,
  incluyendo a través de enlaces simbólicos que apunten fuera de él.
- **FR-026**: El sistema MUST NOT sobrescribir ni eliminar archivos existentes sin consentimiento
  explícito del usuario.
- **FR-027**: El sistema MUST NOT ejecutar código proveniente de los archivos del Design System.
- **FR-028**: El sistema MUST NOT modificar el código de la aplicación anfitriona ni los scripts
  de `package.json` sin aprobación.
- **FR-029**: El sistema MUST NOT agregar dependencias automáticamente.
- **FR-030**: El sistema MUST NOT ejecutar publicación en npm ni crear commits de Git
  automáticamente.
- **FR-031**: El sistema MUST NOT requerir servicios externos, cuenta cloud ni permisos de
  administrador para completar la operación.
- **FR-032**: El sistema MUST NOT guardar secretos dentro del Design System.

### Tokens iniciales (contenido mínimo requerido)

- **FR-033**: Los tokens iniciales MUST ser un conjunto deliberadamente pequeño, suficiente para
  verificar: al menos un grupo, uso correcto de `$type`, `$value` y `$description`, y al menos una
  referencia/alias válida (siempre que no añada complejidad innecesaria).
- **FR-034**: Los tokens iniciales MUST validar correctamente contra DTCG (FR-017).
- **FR-035**: El sistema MUST NOT generar un Design System visual completo ni inventar una
  identidad de marca extensa sin información del usuario.

### Key Entities *(include if feature involves data)*

- **Design System (manifiesto)**: representa la identidad del Design System del proyecto.
  Atributos esenciales: nombre, slug/identificador, versión inicial, descripción opcional.
  Es legible por humanos y la referencia principal para localizar el sistema.
- **Configuración del gestor**: datos mínimos que permiten a futuras herramientas detectar y
  localizar el Design System (p. ej. rutas de la fuente canónica y de los artefactos generados).
  Distinta del manifiesto y separada de los datos de tokens.
- **Fuente canónica de tokens (DTCG)**: archivo(s) fuente de los design tokens en formato
  compatible con DTCG; única fuente de verdad de los valores. No es un artefacto generado.
- **Artefactos generados (ubicación reservada)**: espacio claramente diferenciado, vacío o no
  poblado en esta funcionalidad, destinado a futuras salidas (no se generan aquí; ver Fuera del
  alcance).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede inicializar un Design System válido **sin crear ningún archivo
  manualmente**, completando el flujo en una sola ejecución.
- **SC-002**: El 100% de las inicializaciones exitosas producen un resultado **detectable por el
  gestor** (futuras herramientas localizan el Design System sin intervención manual).
- **SC-003**: Una segunda ejecución sobre un proyecto ya inicializado **no altera ningún archivo**
  sin autorización explícita (cero cambios no autorizados).
- **SC-004**: **Cero** archivos existentes del usuario son sobrescritos o eliminados silenciosamente
  en cualquier escenario.
- **SC-005**: El 100% de los Design Systems inicializados permanecen **legibles y válidos sin el
  paquete instalado** (verificado eliminando la dependencia y abriendo los archivos).
- **SC-006**: Ante una falla inducida, en el 100% de los casos **no queda una inicialización
  declarada como completa** y los archivos previos permanecen intactos.
- **SC-007**: El flujo completo puede ejecutarse y verificarse de forma **automatizada en un
  directorio temporal**, sin intervención manual ni servicios externos.

## Assumptions

- El usuario ya instaló el gestor como dependencia de desarrollo en el proyecto anfitrión; esta
  funcionalidad no cubre la instalación del paquete y exige un `package.json` preexistente (FR-001a).
- "Raíz anfitriona" (límite autorizado de escritura) queda definida por FR-001c…FR-001h: el
  directorio del `package.json` más cercano al punto de ejecución, sin superar la raíz Git más
  cercana cuando exista.
- La versión inicial por defecto es `0.1.0` (SemVer); el usuario puede indicar otra versión SemVer
  válida (FR-009).
- Existe un modo no interactivo previsto para pruebas automatizadas (SC-007): cuando no hay
  interacción disponible, los datos se aportan por parámetros y la confirmación se otorga
  explícitamente mediante una opción equivalente; los detalles de invocación se definen en
  `/speckit-plan`.
- La estructura exacta de directorios y los nombres de archivos (manifiesto, configuración, fuente
  de tokens, carpeta de artefactos) NO se fijan en esta especificación; se deciden en
  `/speckit-plan` y se registran como ADR.
- La validación DTCG se apoya en el estándar Design Tokens Community Group; la herramienta concreta
  de validación se decide en `/speckit-plan` (sin elegir librerías aquí).

## Dependencies

- Constitución del proyecto (`.specify/memory/constitution.md`), en particular Principios II
  (archivos como fuente de verdad), III (DTCG), VI (gestor ≠ Design System), VII (transparencia),
  VIII (validación antes de generación), XIII (local-first), XIV (seguridad) y XVII (portabilidad).
- Esta funcionalidad NO depende de Style Dictionary, interfaz gráfica, servidor web, MCP ni de
  ningún framework anfitrión (ver Fuera del alcance).

## Out of Scope *(esta funcionalidad)*

Interfaz gráfica; servidor web local; edición visual de tokens; generación mediante Style
Dictionary; CSS generado; `theme.json` de WordPress; componentes; patrones; secciones; páginas de
demostración; assets; análisis de imágenes; análisis de URLs; importación desde Figma; MCP; skills
propias del producto; publicación npm; sincronización con CMS; múltiples Design Systems; base de
datos; cuentas de usuario; servicios cloud; migraciones avanzadas; integración automática con el
framework anfitrión.

## Open Questions

Ninguna. Las tres ambigüedades materiales fueron resueltas en la sesión de clarificación del
2026-06-25 (ver sección _Clarifications_).

## Decisiones a registrar como ADR (en `/speckit-plan`)

Las siguientes decisiones de producto, ya fijadas en esta especificación, deben formalizarse como
ADR durante la planificación (Constitución, Governance):

- **ADR — Requisito de `package.json`**: la inicialización exige un proyecto npm y nunca lo crea.
- **ADR — Algoritmo de resolución de raíz anfitriona y límite de escritura**: ascenso al
  `package.json` más cercano acotado por la raíz Git; selección de workspace en monorepo;
  normalización por ruta real y rechazo de escapes/symlinks.
- **ADR — Reglas de identidad**: patrón de slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`, algoritmo de
  autoproposición desde el nombre y versión inicial por defecto `0.1.0` (SemVer).
