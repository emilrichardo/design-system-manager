# Feature Specification: Validación e inspección de un Design System existente (ds-validate-inspect)

**Feature Branch**: `002-ds-validate-inspect`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "Validación e inspección de un Design System local existente mediante `neuraz-ds validate` y `neuraz-ds inspect` — comandos de solo lectura, deterministas, seguros, headless y reutilizables por una futura TUI/Studio/MCP."

## Resumen

Tras `001-ds-init` (cerrada), el paquete crea un Design System local. Esta funcionalidad añade
**dos comandos de solo lectura** sobre un Design System **existente**:

- `neuraz-ds validate` — responde **¿es válido?** (config + manifiesto + tokens DTCG 2025.10,
  schemas, reglas de dominio, aliases/ciclos, coherencia entre documentos, contención de rutas),
  acumulando todos los errores recuperables y devolviendo un resultado estructurado.
- `neuraz-ds inspect` — responde **¿qué contiene y cómo está organizado?**, devolviendo un modelo
  de inspección estructurado (identidad, archivos, estadísticas de tokens, árbol DTCG) que **incluye**
  el resultado de validación.

Ambos son **observacionalmente puros** respecto del proyecto anfitrión (no escriben, no modifican
contenido/permisos/timestamps, no ejecutan ni evalúan contenido, no acceden a red). Reutilizan toda
la infraestructura de `001` (resolución de raíz anfitriona, límite Git, workspace más cercano,
path-guard, inspección de presencia, clasificación de estados, schemas config/manifest/DTCG,
validadores zod/ajv, validación de aliases/ciclos, `Reporter`, composición headless, CLI Commander).
**No se reimplementan** esas capacidades. La estructura/nombres definitivos y los ADR se deciden en
`/speckit-plan`.

Principio rector: **presencia ≠ validez ≠ inspección**. La presencia determina qué archivos existen
(reusa la inspección de `001`); la validación determina si cumplen contratos y reglas; la inspección
describe el contenido. `inspect` puede incluir la validación pero no la sustituye por una descripción
superficial.

## Clarifications

### Session 2026-06-26

- Q: ¿Reutilizar la semántica de exit codes de `init` o definir una tabla común del binario? → A:
  **Tabla común** para `init`/`validate`/`inspect`. El código `2` conserva su significado de `init`
  (`unchanged`) y **no** se reutiliza con otro sentido. `validate` usa `0` (válido) / `3` (DS
  completo inválido) / `4` (parcial o conflicto) / `5` (host o config administrada no localizable) /
  `6` (lectura/fs). `inspect` usa los mismos y **entrega igualmente el informe recuperable** aunque
  finalice con `3` (completo-inválido) o `4` (parcial). Los códigos `1`/`2`/`7` quedan **reservados**
  por el contrato común (no usados normalmente por validate/inspect). Error interno de frontera CLI:
  `70` (no contractual). Registrar como ADR en `/speckit-plan`.
- Q: ¿`$type` desconocido es error o advertencia? → A: **distinguir** soporte DTCG de interpretación
  profunda del gestor. (a) **Tipo DTCG reconocido** por la versión canónica fijada pero **sin** análisis
  profundo en Neuraz → **advertencia** estructurada (`dtcg-type-not-deeply-inspected`); el DS **puede
  seguir siendo válido**; se cuenta en `byType`, se conservan rutas/descripciones, se valida la
  estructura genérica posible, sin transformar/resolver el valor. (b) **Tipo no reconocido** por la
  versión DTCG fijada → **error** estructurado; DS **inválido**; el nodo se conserva en la inspección
  como **dato no confiable**, sin interpretar `$value`. (c) **Herencia de `$type`** desde grupos se
  respeta: un token sin `$type` propio es válido si hereda un tipo reconocido de un ancestro; sin tipo
  propio ni heredado → error contractual. (d) **`$extensions`** no convierte un `$type` desconocido en
  válido; los tipos personalizados quedan fuera de esta feature. Registrar como ADR en `/speckit-plan`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validar un Design System correcto (Priority: P1)

Como desarrollador, quiero ejecutar `validate` sobre un Design System completo y válido para
confirmar rápidamente que cumple todos los contratos.

**Why this priority**: Es el caso de uso central de `validate` y el MVP de la feature.

**Independent Test**: En un proyecto temporal con los tres documentos válidos (los que produce
`init`), ejecutar `validate` y verificar resultado **válido**, archivos comprobados enumerados,
cero errores, código de salida de éxito, y que **ningún archivo cambió** (bytes/mtime/permisos).

**Acceptance Scenarios**:

1. **Given** un DS completo y válido, **When** se ejecuta `validate`, **Then** el resultado es
   válido, sin errores, con la lista de archivos comprobados y el código de éxito.
2. **Given** el mismo DS, **When** se ejecuta `validate` dos veces, **Then** el resultado es
   idéntico (determinista) y los archivos permanecen intactos.

---

### User Story 2 - Recibir todos los errores de un Design System inválido (Priority: P1)

Como desarrollador, quiero que `validate` me informe **todos** los errores recuperables de un DS
inválido (no solo el primero) para corregirlos en una sola pasada.

**Why this priority**: La utilidad de un validador depende de que acumule errores; crítica para US2.

**Independent Test**: Preparar un DS con varios defectos en distintos documentos (p. ej. slug
inválido + alias inexistente + JSON de config con campo desconocido) y verificar que `validate`
los reporta **todos** como `Issue` estructurados (código/severidad/documento/ruta/mensaje), con
resultado inválido y el código de salida correspondiente, sin escribir nada.

**Acceptance Scenarios**:

1. **Given** un DS con múltiples errores recuperables, **When** se ejecuta `validate`, **Then**
   se acumulan y devuelven todos, diferenciando categorías (host/estructura/lectura/validación).
2. **Given** un error no recuperable (p. ej. JSON de un documento malformado), **When** se valida
   ese documento, **Then** se reporta el error de ese documento y se continúa con los demás cuando
   es seguro.

---

### User Story 3 - Inspeccionar identidad, archivos y estadísticas de tokens (Priority: P1)

Como desarrollador, quiero `inspect` para entender qué contiene el DS: identidad, archivos
presentes/ausentes y estadísticas de tokens (grupos, totales, por `$type`, aliases, profundidad).

**Why this priority**: Es el caso de uso central de `inspect`.

**Independent Test**: Sobre un DS válido, ejecutar `inspect` y verificar que el modelo estructurado
contiene identidad (nombre/slug/versión/descripción), `files.{expected,present,missing}`,
`tokens.{total,groups,aliases,byType,paths,maxDepth}` con **conteos exactos**, y el bloque de
`validation`. No infiere componentes/patrones/páginas/estilos inexistentes.

**Acceptance Scenarios**:

1. **Given** un DS válido con N tokens y M aliases, **When** se ejecuta `inspect`, **Then** el
   modelo reporta conteos exactos (total, grupos, aliases, byType, maxDepth) y rutas canónicas.
2. **Given** un DS completo pero inválido, **When** se ejecuta `inspect`, **Then** muestra los
   datos que pudieron recuperarse de forma segura, **distingue** datos no confiables, e incluye el
   resultado de validación con los errores.

---

### User Story 4 - Ejecutar desde subcarpeta o workspace (Priority: P2)

Como desarrollador en un monorepo, quiero ejecutar `validate`/`inspect` desde una subcarpeta y que
operen sobre el workspace anfitrión correcto.

**Why this priority**: Reutiliza la resolución de raíz de `001`; importante para uso real.

**Independent Test**: Ejecutar ambos comandos desde `repo/apps/web/src` y verificar que resuelven
`repo/apps/web` (package.json más cercano, sin superar la raíz Git), reportan esa raíz y leen los
archivos de ese workspace, no de la raíz global ni de otros workspaces.

**Acceptance Scenarios**:

1. **Given** un monorepo, **When** se ejecuta desde una subcarpeta de un workspace, **Then** la
   raíz anfitriona resuelta es ese workspace y los resultados corresponden a él.

---

### User Story 5 - Consumo headless por una herramienta externa (Priority: P2)

Como autor de una herramienta (futura TUI/Studio/MCP), quiero invocar los casos de uso sin terminal
para obtener los mismos modelos estructurados que muestra la CLI.

**Why this priority**: Constitución XV (agentes) y preparación de interfaces futuras.

**Independent Test**: Invocar `validateDesignSystem(input, deps)` e `inspectDesignSystem(input, deps)`
con adapters en memoria, sin Commander/Clack/TTY/consola/proceso hijo, y verificar que devuelven el
mismo resultado semántico que la CLI sobre el mismo proyecto.

**Acceptance Scenarios**:

1. **Given** los casos de uso, **When** se ejecutan headless, **Then** devuelven datos estructurados
   sin depender de texto de terminal ni de exit codes.

---

### User Story 6 - La operación no modifica ningún archivo (Priority: P1)

Como desarrollador, quiero garantía de que validar/inspeccionar **nunca** altera el proyecto.

**Why this priority**: Constitución XIV (seguridad/reversibilidad); diferencia clave de comandos
de lectura.

**Independent Test**: Capturar un snapshot (lista de archivos + bytes + mtime + permisos) del
proyecto, ejecutar `validate` e `inspect` (incluso sobre DS inválidos o parciales) y verificar que
el snapshot es idéntico después; sin staging ni archivos temporales en el proyecto.

**Acceptance Scenarios**:

1. **Given** cualquier estado del proyecto, **When** se ejecuta `validate` o `inspect`, **Then** el
   contenido, timestamps, permisos y estructura permanecen intactos y no hay staging.

---

### User Story 7 - Estructura parcial informada sin reparar (Priority: P2)

Como desarrollador con una estructura incompleta, quiero que los comandos me informen qué falta sin
intentar repararlo ni inventar contenido.

**Why this priority**: Constitución XVI; coherencia con la política de `001` (no repair/migrate).

**Independent Test**: Con solo `neuraz-ds.config.json` presente, verificar que `validate` reporta
estado parcial (presentes/ausentes) y resultado inválido, y que `inspect` lista presentes/ausentes
sin inferir el contenido faltante; ninguno escribe.

**Acceptance Scenarios**:

1. **Given** una estructura parcial, **When** se ejecuta cualquiera de los comandos, **Then** se
   informan presentes y ausentes, no se repara ni se infiere, y no se modifica nada.

---

### Edge Cases

La spec define el comportamiento esperado para cada caso (las dos decisiones materiales quedaron
resueltas en _Clarifications_).

- **Sin `package.json`** → error de host; no lee ni escribe; código `host`.
- **Sin configuración** (`neuraz-ds.config.json` ausente) → "no inicializado": no se considera un DS
  existente; mensaje estructurado; sin cambios.
- **Configuración parcial** / **manifiesto ausente** / **tokens ausentes** → estado **parcial**:
  presentes/ausentes; inválido; sin reparar.
- **Configuración con ruta absoluta** o **con escape** (`designSystemDir` fuera de la raíz) → error
  de validación/seguridad; no se lee fuera del límite.
- **JSON malformado** en cualquier documento → error de lectura/parse de ese documento; continúa con
  los demás cuando es seguro.
- **Schema inválido / slug inválido / SemVer inválido / DTCG inválido** → errores de validación
  estructurados.
- **`$type` reconocido por DTCG pero sin análisis profundo en Neuraz** → **advertencia**
  (`dtcg-type-not-deeply-inspected`); el DS puede seguir siendo válido; se cuenta en `byType`.
- **`$type` no reconocido por la versión DTCG fijada** → **error**; DS inválido; el nodo se conserva
  en la inspección como **dato no confiable**, sin interpretar `$value`.
- **Token sin `$type` propio** → válido si hereda un tipo reconocido de un grupo ancestro; **error**
  si no tiene tipo propio ni heredado.
- **Alias inexistente / alias a grupo / ciclo directo / ciclo indirecto** → errores de validación
  (reusa la validación de referencias de `001`).
- **Symlink externo / symlink roto / ruta administrada ocupada por directorio / archivo no regular**
  → tratado como seguridad/estructura: no se sigue el symlink externo; se reporta sin leer fuera del
  límite (coherente con la clasificación documentada de `001`).
- **Ejecución desde subcarpeta / monorepo / proyecto sin Git** → resuelve el workspace más cercano.
- **Archivo inaccesible** (permisos) → error de lectura estructurado; no falla catastróficamente.
- **Árbol muy profundo / muchos tokens / archivo grande / alias largo** → recorrido con límites
  internos de seguridad (profundidad/nodos/tamaño) documentados; sin recursión sin límite. Superar
  un límite produce una advertencia o error estructurado, no un desbordamiento.
- **Documento vacío / grupos sin tokens / token sin `$description`** → ver Assumptions (descripción
  opcional ⇒ a lo sumo advertencia; documento de tokens vacío ⇒ válido estructuralmente con 0 tokens
  salvo regla en contra).
- **Segundo comando sin cambios** entre `validate` e `inspect` → ambos coinciden y nada cambia.

## Requirements *(mandatory)*

### Functional Requirements — compartidos (host, seguridad, headless)

- **FR-001**: Ambos comandos MUST resolver la **raíz anfitriona** desde el directorio de ejecución
  reutilizando la resolución de `001` (package.json más cercano, tope en raíz Git, workspace más
  cercano, normalización por realpath). `package.json` es obligatorio; sin él → error `host`.
- **FR-002**: Ambos comandos MUST ser **observacionalmente puros**: no escriben, no crean staging,
  no modifican contenido/bytes/mtime/permisos/estructura, no tocan `package.json`/config/tokens.
- **FR-003**: Ambos comandos MUST leer **solo** los archivos administrados dentro del límite
  autorizado; MUST aplicar el path-guard (rechazo de `..`, rutas absolutas externas, prefijos
  engañosos, symlinks externos/rotos, otros workspaces) sin seguir enlaces hacia el exterior.
- **FR-004**: Ambos comandos MUST parsear JSON de forma segura (`JSON.parse`), sin ejecutar ni
  evaluar contenido, sin cargar módulos, sin acceso a red, sin guardar secretos.
- **FR-005**: La lógica MUST exponerse como casos de uso **headless** (`validateDesignSystem`,
  `inspectDesignSystem`) ejecutables sin Commander/Clack/TTY/consola/proceso hijo; la CLI solo
  presenta resultados. Los casos de uso devuelven **datos estructurados**, no texto de terminal.
- **FR-006**: El recorrido del árbol DTCG MUST tener **límites internos de seguridad** documentados
  (profundidad máxima, número máximo de nodos, tamaño máximo de archivo). Superarlos MUST producir
  un `Issue` estructurado (no un fallo no controlado). [Valores exactos → `/speckit-plan` (ADR).]
- **FR-007**: Cada `Issue` MUST poder contener: código estable, severidad (`error`|`warning`),
  documento afectado, ruta dentro del documento, mensaje y contexto seguro. Las reglas MUST basarse
  en códigos estables, **no** en el texto de AJV/Zod.
- **FR-008**: `error` impide considerar válido el DS; `warning` no impide la validez pero se reporta.

### Functional Requirements — `validate`

- **FR-010**: `validate` MUST localizar `neuraz-ds.config.json` y validar que `designSystemDir`
  permanezca dentro de la raíz anfitriona.
- **FR-011**: `validate` MUST comprobar la estructura administrada y clasificar el estado
  (no-inicializado / parcial / completo-inválido / completo-válido) reutilizando la
  inspección/clasificación de `001`.
- **FR-012**: `validate` MUST validar configuración, manifiesto y documento DTCG (schemas + reglas
  de dominio: slug, SemVer), reusando los validadores zod/ajv de `001`.
- **FR-013**: `validate` MUST validar aliases y detectar referencias inexistentes, alias a grupo y
  ciclos (directos e indirectos), reusando la validación de `001`.
- **FR-014**: `validate` MUST comprobar la **coherencia entre documentos** (p. ej. `designSystemDir`
  coincide con la ubicación del manifiesto; referencia a `tokensDir` consistente).
- **FR-015**: `validate` MUST **acumular todos los errores recuperables** y no detenerse en el
  primero cuando sea seguro continuar; MUST distinguir categorías host/estructura/lectura/validación.
- **FR-016**: `validate` MUST devolver un resultado estructurado (válido/ inválido + errores +
  advertencias + archivos comprobados) y MUST NOT modificar archivos.
- **FR-017**: Política de `$type` (decidida): un **tipo DTCG reconocido** por la versión canónica
  fijada pero **sin** análisis profundo en Neuraz MUST producir una **advertencia** estructurada
  (`dtcg-type-not-deeply-inspected`) sin invalidar el DS, contándose en `byType` y conservando
  rutas/descripciones; un **tipo no reconocido** por la versión DTCG fijada MUST producir un **error**
  estructurado (DS inválido) y MUST NOT aceptarse silenciosamente. NUNCA se transforma/resuelve el
  valor del tipo.
- **FR-018**: La **herencia de `$type`** desde grupos MUST respetarse: un token sin `$type` propio que
  hereda un tipo reconocido de un ancestro es válido; un token **sin tipo propio ni heredado** MUST
  producir el error contractual correspondiente.
- **FR-019**: La presencia de `$extensions` MUST NOT convertir un `$type` desconocido en válido; el
  soporte de tipos personalizados queda fuera de alcance.

### Functional Requirements — `inspect`

- **FR-020**: `inspect` MUST producir un **modelo de inspección estructurado** que incluya: raíz
  anfitriona; ubicación del DS (o `null`); identidad (nombre/slug/versión/descripción opcional);
  versión(es) de schema; `files` (expected/present/missing); y el bloque `validation` (resultado de
  `validate`).
- **FR-021**: Cuando los tokens sean legibles, `inspect` MUST reportar estadísticas con **conteos
  exactos**: total de tokens, grupos, aliases, `byType` (por `$type` efectivo), rutas canónicas y
  profundidad máxima.
- **FR-022**: El recorrido del árbol DTCG MUST distinguir grupos, tokens, propiedades reservadas
  (`$…`), valores concretos y aliases; y por token MUST poder obtener: ruta canónica, `$type`
  efectivo (incluido el heredado de un grupo, indicando su origen), `$description`, si es valor
  concreto o alias, destino del alias y profundidad.
- **FR-023**: `inspect` MUST **incluir** el resultado de validación (no sustituirlo por una
  descripción superficial) y, en estado completo-inválido, MUST distinguir datos recuperados de
  datos no confiables.
- **FR-024**: `inspect` MUST NOT inferir componentes, patrones, páginas ni estilos inexistentes;
  MUST NOT resolver ni convertir colores a CSS; MUST NOT generar artefactos; MUST NOT modificar
  archivos.

### Functional Requirements — CLI y códigos de salida

- **FR-030**: La CLI MUST añadir **exclusivamente** los comandos `validate` e `inspect` (ningún otro)
  y MUST delegar toda la lógica a los casos de uso headless (sin reglas de negocio en el comando).
- **FR-031**: `validate` MUST mostrar: raíz anfitriona, archivos comprobados, estado final, errores
  y advertencias, y un resumen numérico.
- **FR-032**: `inspect` MUST mostrar una representación textual básica (árbol/tabla de texto:
  Identidad / Archivos / Tokens {Grupos, Valores, Aliases} / Validación), comprensible sin ANSI.
  MUST NOT implementar navegación, teclado interactivo, pantalla persistente, Ink/Blessed/React.
- **FR-033**: Ambos comandos MUST traducir su resultado a códigos de salida según la **tabla común
  del binario** (decidida), sin que un mismo código tenga dos significados incompatibles:

  | Código | Significado común |
  |---:|---|
  | 0 | Operación exitosa y resultado válido |
  | 1 | Operación cancelada (solo comandos interactivos) |
  | 2 | Operación exitosa sin cambios (`unchanged`; usada por `init`) |
  | 3 | Entrada o Design System inválido |
  | 4 | Estructura parcial, conflicto o estado que impide completar |
  | 5 | Proyecto anfitrión o Design System administrado no localizable |
  | 6 | Error de lectura o filesystem |
  | 7 | Error de verificación posterior (reservado para operaciones que escriben) |
  | 70 | Error interno inesperado de frontera CLI (no contractual) |

  - **`validate`**: válido→`0`; completo-inválido→`3`; parcial/conflicto→`4`; host/config no
    localizable→`5`; lectura/fs→`6`.
  - **`inspect`**: válido→`0`; completo-inválido→`3` (**entrega igualmente** el informe recuperable);
    parcial→`4` (**entrega** presentes/ausentes y datos recuperables); no localizado→`5`; lectura→`6`.
  - `validate`/`inspect` no usan normalmente `1`/`2`/`7`, pero permanecen **reservados** por el
    contrato común. Esta tabla NO reasigna el `2` de `init`.
- **FR-034**: Ayuda y versión MUST usar código `0`; errores de uso del parser MUST usar código `3`;
  un error interno inesperado de frontera CLI MAY usar el código no contractual `70` (ya
  documentado en `001`).
- **FR-035**: La arquitectura MUST permitir añadir después `--json` a ambos comandos **sin**
  reimplementar la lógica (los casos de uso ya devuelven datos estructurados). `--json` NO se
  implementa en esta feature.

### Key Entities *(include if feature involves data)*

- **DesignSystemInspection**: modelo estructurado de `inspect` — `hostRoot`, `designSystemPath`,
  `identity?` (name/slug/version/description?), `schemaVersions?`, `files` (expected/present/missing),
  `tokens?` (total/groups/aliases/byType/paths/maxDepth), `validation` (valid/errors/warnings). En
  estado completo-inválido o parcial el modelo MUST marcar qué datos son **recuperados/no confiables**
  (p. ej. nodos con `$type` no reconocido). `byType` incluye los tipos reconocidos-no-profundos. Forma
  final en `/speckit-plan`.
- **TokenNodeSummary**: por token — ruta canónica, `$type` efectivo (+ origen si heredado),
  `$description?`, clase (valor concreto | alias), destino del alias?, profundidad, y marca de
  **confiabilidad** (`trusted`/`untrusted` para tipos no reconocidos).
- **ValidationReport**: resultado de `validate` — `valid`, `errors[]`, `warnings[]`, archivos
  comprobados, categoría por `Issue` (host/structure/read/validation). Reutiliza `Issue`/`ValidationResult`
  de `001`. Códigos estables incluyen al menos `dtcg-type-not-deeply-inspected` (warning) y un código
  de error para `$type` no reconocido y para token sin tipo propio ni heredado.
- **PreviousState** (reusado de `001`): none / partial / complete-invalid / complete-valid.

## Success Criteria *(mandatory)*

- **SC-001**: El **100%** de los documentos administrados presentes son revisados por `validate`.
- **SC-002**: **Cero** archivos modificados (bytes/mtime/permisos/estructura) tras `validate`/`inspect`
  en cualquier estado del proyecto.
- **SC-003**: Resultados **deterministas**: el mismo proyecto produce el mismo resultado e idénticos
  conteos en ejecuciones repetidas.
- **SC-004**: Aliases rotos, alias a grupo y ciclos (directos e indirectos) son **detectados** al
  100% en los casos de prueba.
- **SC-005**: Ejecutado desde un workspace/subcarpeta, opera sobre la raíz anfitriona correcta en el
  100% de los casos de prueba.
- **SC-006**: Los casos de uso son **comprobablemente headless** (ejecutables sin terminal con
  adapters en memoria).
- **SC-007**: `inspect` reporta **conteos exactos** (total/grupos/aliases/byType/maxDepth) verificables
  contra documentos de prueba conocidos.
- **SC-008**: La CLI y el núcleo producen el **mismo resultado semántico** sobre el mismo proyecto.
- **SC-009**: Un `$type` **reconocido pero no profundo** produce **advertencia** y mantiene el DS
  válido; un `$type` **no reconocido** produce **error** e invalida el DS — verificado en pruebas.
- **SC-010**: Los códigos de salida de `validate`/`inspect` se ajustan a la **tabla común** y no
  contradicen los de `init` (en particular, `2` sigue significando `unchanged`).

## Assumptions

- Se reutiliza toda la infraestructura de `001` (resolución de host, path-guard, presencia,
  clasificación, schemas, validadores zod/ajv, aliases/ciclos, Reporter, composición headless, CLI);
  esta feature **no** la reimplementa.
- `$description` de un token es **opcional** (coherente con el schema de `001`): su ausencia produce
  a lo sumo una **advertencia**, no un error.
- Un documento de tokens estructuralmente válido pero **vacío** (0 tokens) se considera válido a
  nivel de estructura (posible advertencia "sin tokens"); no es un error por sí mismo.
- La clasificación de seguridad de symlinks/escape sigue lo documentado en `001`
  (`audit.md`): symlink en ruta administrada → estado parcial; no se sigue el enlace externo.
- "Observacionalmente puro" admite lecturas de FS (stat/read) que no alteran el contenido; en algunos
  sistemas `atime` puede cambiar por lectura — no se considera una modificación relevante (no hay
  escrituras).
- Modo `--json` y TUI quedan fuera; los casos de uso ya devuelven datos estructurados para habilitarlos.

## Dependencies

- `001-ds-init` (cerrada): infraestructura y contratos reutilizados; constitución y ADR 0001–0005.
- No añade dependencias de runtime nuevas (usa zod/ajv/semver/commander ya presentes).

## Out of Scope *(esta funcionalidad)*

Edición; reparación; migración; adopción; escritura; creación de tokens; importación; normalización;
Style Dictionary; generación CSS; componentes; patrones; páginas; contenido CMS; análisis de
imágenes/URL/Figma; MCP; TUI; viewer web; modo watch; `--json` (diferido); comandos distintos de
`validate`/`inspect`.

## Compatibilidad con interfaz interactiva futura

Esta feature **genera el modelo de inspección**; la CLI actual lo representa de forma **textual**.
Una futura **TUI** (opcional) podrá representar el mismo modelo de forma interactiva (árboles,
tablas, ANSI) sin que el núcleo dependa de ella. No se diseñan aquí pantallas, navegación ni
componentes de terminal.

## Decisiones a registrar como ADR (en `/speckit-plan`)

1. **Semántica común de exit codes** entre comandos del binario (resolver el choque con `init`).
2. **Modelo canónico de inspección** (`DesignSystemInspection`).
3. **Política error vs advertencia** (incl. `$type` desconocido, `$description` ausente, tokens vacíos).
4. **Límites seguros** de lectura/recorrido (profundidad/nodos/tamaño).
5. **Estrategia de recorrido del árbol DTCG** (herencia de `$type`, rutas canónicas, detección de aliases).

Crear ADR solo si la decisión no está ya cubierta por la constitución o por ADR 0001–0005.

## Constitution Check (resumen)

Alineada con los 17 principios; énfasis: II (archivos fuente de verdad — solo lectura), III (DTCG
canónico), VIII (validación — núcleo de la feature), XIII (local-first, sin red), XIV (seguridad —
solo lectura, observacionalmente puro), XV (integraciones desacopladas — casos de uso headless),
XVI (incremental — solo validate/inspect), XVII (portabilidad — modelo independiente de interfaz).
Sin tensiones detectadas. Detalle final en `/speckit-plan`.

## Open Questions

Ninguna. Las dos decisiones materiales (exit codes comunes y política de `$type`) fueron resueltas en
la sesión de clarificación del 2026-06-26 (ver _Clarifications_). Su formalización como ADR se hará
en `/speckit-plan`.
