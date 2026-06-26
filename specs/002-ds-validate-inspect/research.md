# Research — ds-validate-inspect (Phase 0)

Fuentes oficiales/primarias (consultadas 2026-06-26). Style Dictionary **no** se usa como fuente
normativa de DTCG.

## 1. DTCG 2025.10 — tipos estándar reconocidos

- **Decision**: el conjunto de `$type` **reconocidos** por la versión canónica fijada (DTCG —
  Design Tokens Format Module 2025.10) es:
  - Simples: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`.
  - Compuestos: `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography`.
- **Análisis profundo en Neuraz (hoy)**: solo `color` (objeto sRGB, lo que `001` ya valida). Los
  demás tipos reconocidos se aceptan con **advertencia** `dtcg-type-not-deeply-inspected` (válidos),
  contándose en `byType`, sin transformar su `$value`.
- **Rationale**: alinear el conjunto reconocido con el estándar estable evita rechazar DS válidos con
  tipos futuros; el análisis profundo se amplía incrementalmente (Constitución XVI).
- **Fuentes**: https://www.designtokens.org/tr/drafts/format/ ·
  https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/

## 2. Estructura de token/grupo y propiedades reservadas

- **Token**: objeto con `$value` (obligatorio). Reservadas a nivel token: `$value`, `$type`,
  `$description`, `$deprecated`, `$extensions`.
- **Grupo**: objeto sin `$value` que organiza hijos. Reservadas a nivel grupo: `$type`,
  `$description`, `$deprecated`, `$extends`, `$extensions`.
- **Decision 002**: un nodo objeto con `$value` propio = **token**; sin `$value` = **grupo**. Las
  claves que empiezan por `$` son metadatos (no son hijos). `$extends` y `$ref` (JSON Pointer) se
  reconocen sintácticamente pero **no se resuelven** en esta feature → a lo sumo advertencia
  (`dtcg-feature-not-deeply-inspected`); no se interpretan.
- **Fuente**: https://www.designtokens.org/tr/drafts/format/

## 3. Herencia de `$type` (tipo efectivo)

- **Decision** (precedencia normativa única C1, alineada con el estándar): (1) `$type` declarado en el
  token; (2) si **no** declara y `$value` es alias, el tipo efectivo del token referenciado (resolviendo
  cadenas); (3) si no es referencia, `$type` heredado del grupo ancestro más cercano; (4) si no se
  determina → **error** (`dtcg-type-undeterminable`). El alias prevalece sobre el grupo; ciclo/alias roto
  ⇒ sin tipo efectivo confiable. "Las herramientas MUST NOT adivinar el tipo inspeccionando el valor."
- Se informa: `declaredType`, `effectiveType` y **origen** `typeOrigin` (`own` | `alias` | `group` |
  `none`); cuando es `group`, la ruta del grupo fuente va en `typeSourcePath` (C5).

## 4. Aliases / referencias

- **Decision**: se reconoce la sintaxis recomendada `{group.token}` (resuelve al `$value` del token
  destino). La forma JSON Pointer `$ref: "#/..."` se reconoce pero **no se resuelve** (advertencia).
- Validación de aliases (reusa utilidades de `001`): formato, existencia del destino, destino que es
  **token** (no grupo) y ausencia de **ciclos** (directos e indirectos), mediante índice + DFS.
- **Fuente**: https://www.designtokens.org/tr/drafts/format/

## 5. `$extensions`

- **Decision**: `$extensions` es metadato vendor; su presencia **no** valida un `$type` desconocido
  ni habilita tipos personalizados (fuera de alcance). Se conserva en la inspección pero no se
  interpreta.

## 6. Límites seguros (ADR-0009) — justificación

DS reales: los archivos de tokens suelen ser < 200 KiB y con profundidad de anidación 4–8; recuentos
de cientos a pocos miles de tokens. Los límites se fijan **muy por encima** de eso para no molestar a
DS reales, pero acotan consumo y evitan desbordamiento:

| Límite | Valor | Justificación |
|---|---|---|
| Tamaño por archivo | 5 MiB | >> DS reales; evita cargar archivos enormes en memoria |
| Tamaño total leído | 16 MiB | suma de los 3 documentos administrados con margen |
| Profundidad máxima | 32 | anidación real 4–8; 32 es amplio y evita recursión patológica |
| Nodos máximos | 100 000 | miles en DS reales; tope de seguridad |
| Longitud ruta de token | 512 | rutas reales cortas; evita patrones abusivos |
| Longitud referencia alias | 256 | idem |
| Issues acumulados | 1 000 | suficiente para reportar; evita explosión de memoria |

- **Comportamiento al alcanzar un límite duro** (tamaño/profundidad/nodos): el análisis **se detiene
  de forma controlada**, conserva la información parcial, emite un `Issue` **error**
  (`limit-…-exceeded`), marca la inspección como **parcial** y el DS como **no validado
  completamente** → `validate` inválido (exit 3) / `inspect` entrega lo recuperado. El tope de issues
  detiene la acumulación con `limit-issues-truncated` (sin crash, sin truncado silencioso).
- **No** se exponen como configuración pública en esta feature (constantes internas documentadas).
- **Node**: `JSON.parse` es el parser; se hace `stat` del tamaño **antes** de leer; lectura UTF-8.
  Sin librerías nuevas.

## 7. APIs de filesystem y lectura segura

- **Decision**: extender el puerto `FileSystem` de `001` de forma **aditiva** con `byteSize(path)`
  (stat de tamaño) para verificar el límite antes de leer; reusar `lstatKind` (tipo/symlink) y
  `readFile` (UTF-8). El adapter Node usa `node:fs/promises` (`stat`, `readFile`); el in-memory de
  tests también lo implementa. Reusar `path-guard` para contención y rechazo de symlinks externos.
- Manejo de bordes: archivo eliminado entre stat y lectura → error de lectura (`read-failed`);
  cambia durante lectura → se valida lo leído, sin reintentos; encoding inválido → error de parse;
  permisos → error de lectura; demasiado grande → error de límite (no se lee).

## 8. Rendimiento

- **Decision**: una sola pasada construye el índice `tokenPath → token` y acumula estadísticas;
  la validación de aliases usa el índice (O(1) por alias) y un DFS sobre aristas de alias para
  ciclos (O(aliases)). Complejidad total **O(nodos + aliases)**; memoria proporcional al documento +
  modelo de salida. Sin recorridos repetidos.

## 9. Exit codes comunes (ADR-0006)

- **Decision**: tabla única del binario (0–7 + 70); `2` conserva `unchanged` de `001`. validate/
  inspect: 0/3/4/5/6. La función de mapeo de `001` se **generaliza** sin alterar el mapeo de `init`
  (regresión probada).

## Sin NEEDS CLARIFICATION pendientes

Las dos decisiones materiales (exit codes, política `$type`) ya se resolvieron en la spec
(Clarifications) y se formalizan como ADR. No quedan incógnitas abiertas en el Technical Context.
