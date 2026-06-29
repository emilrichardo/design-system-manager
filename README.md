# Neuraz Design System Manager

> Nombre provisional. Paquete npm que se instala como dependencia de desarrollo dentro de un
> proyecto anfitrión y administra **un** Design System local, versionable y portable.

El Design System permanece como **archivos en el repositorio anfitrión** (fuente de verdad); el
gestor no usa una base de datos interna. Funciona **local-first**, sin servicios cloud, y es
**independiente del framework** del proyecto (WordPress, Astro, Next.js, etc.).

## `neuraz-ds init`

Inicializa de forma segura el Design System del proyecto anfitrión: resuelve la raíz, valida la
identidad (nombre/slug/versión), muestra un plan, pide confirmación y escribe de forma
transaccional la estructura mínima.

### Precondición

El proyecto anfitrión debe tener un `package.json`. `init` **no** crea `package.json`, **no**
ejecuta `npm init`, **no** instala dependencias, **no** modifica scripts, **no** publica en npm y
**no** crea commits de Git.

### Uso

```bash
npm install -D @neuraz/design-system-manager
npx neuraz-ds init        # interactivo: requiere terminal (TTY)
```

`init` solicita: nombre, slug (autopropuesto desde el nombre, editable), descripción opcional y
versión (por defecto `0.1.0`), muestra la **raíz anfitriona** y el plan, y pide confirmación.

### Estructura generada

```text
neuraz-ds.config.json
design-system/
├── design-system.json
└── tokens/
    └── base.tokens.json
```

- **tokens** sigue **DTCG 2025.10**. El color base de ejemplo usa el **objeto sRGB** conforme al
  Color Module (`colorSpace`/`components`/`alpha`/`hex`), y el color de marca es un **alias**
  (`{color.base.blue-500}`). Un string hexadecimal plano **no** es un valor de color válido.
- En **monorepos** se usa el `package.json` más cercano e inicializa **solo** ese workspace; nunca
  escribe fuera de la raíz anfitriona.

## `neuraz-ds validate`

Comando **de solo lectura**: responde *¿el Design System existente es válido?*. Resuelve la raíz
anfitriona, lee únicamente los documentos administrados y comprueba configuración, manifiesto,
tokens **DTCG 2025.10**, aliases, ciclos, tipos, coherencia entre documentos y contención de rutas.
Acumula **todos** los errores recuperables. **No repara, no modifica archivos.**

```bash
npx neuraz-ds validate    # no interactivo; funciona en CI sin TTY
npx neuraz-ds validate --json
```

Muestra raíz, estado, documentos comprobados, nº de errores/warnings, tokens y la lista de issues.
Con `--json`, stdout contiene exactamente un documento JSON v1 parseable, sin texto humano, y el
código de salida no cambia. Códigos principales: `0` válido · `3` inválido · `4` parcial · `5` no
localizado · `6` lectura/fs.

## `neuraz-ds inspect`

Comando **de solo lectura**: responde *¿qué contiene y cómo está organizado?*. Devuelve identidad,
archivos (presentes/ausentes), estadísticas de tokens (grupos, valores, aliases, `byType`,
profundidad), rutas de tokens y el resultado de validación. Conserva información **recuperable**
incluso en estados inválidos o parciales, marcando la confiabilidad. **No infiere ni modifica nada.**

```bash
npx neuraz-ds inspect     # no interactivo; funciona en CI sin TTY
npx neuraz-ds inspect --json
```

La salida de terminal muestra **hasta 200 rutas de tokens** (cota de presentación); con más, indica
cuántas se omiten. Con `--json`, `tokens.paths` conserva **todos** los nodos (sin cota de 200).
Códigos principales: `0` · `3` · `4` · `5` · `6`.

## `neuraz-ds foundations`

Comando **de solo lectura**: proyecta los tokens DTCG existentes sobre las nueve categorías
foundation canónicas: `color`, `spacing`, `typography`, `radius`, `border`, `shadow`, `opacity`,
`sizing` y `motion`. No crea tokens, no aplica presets, no infiere niveles por nombre/ruta/tipo y no
modifica archivos.

```bash
npx neuraz-ds foundations
npx neuraz-ds foundations --json
```

El nivel foundation se declara en `$extensions["ar.neuraz.design-system-manager"].foundation.level`
con valor `"primitive"` o `"semantic"`. Si falta metadata, el token queda `unclassified`; si la
metadata es inválida se emite `foundation-level-invalid`. La declaración propia del token gana sobre
la del grupo ancestro más cercano.

Ejemplo de grupo primitive:

```json
{
  "color": {
    "$type": "color",
    "$extensions": {
      "ar.neuraz.design-system-manager": { "foundation": { "level": "primitive" } }
    },
    "base": {
      "$value": { "colorSpace": "srgb", "components": [0, 0, 0], "alpha": 1, "hex": "#000000" }
    }
  }
}
```

Un Design System recién creado por `init` queda intencionalmente `partial`: tiene dos tokens `color`
sin metadata foundation (`unclassified`), mientras las otras ocho categorías están `absent`.
Las categorías `absent` por sí solas no invalidan ni vuelven parcial el resultado. La validación
profunda sigue disponible solo para `color`; el resto de tipos DTCG reconocidos se inspeccionan de
forma superficial y pueden producir warnings heredados de `inspect`.

## `neuraz-ds presets`

Aplica **presets** de tokens empaquetados con el gestor a tu Design System local. Un **preset** es un
bloque de tokens DTCG curado, inmutable y versionado, distribuido **dentro del paquete** (no se
descarga ni se lee desde tu repositorio); su propósito es **sembrar** foundations válidas sin que
escribas el JSON a mano.

Diferencia clave con `foundations`:

- **foundation** (004) es una *vista de solo lectura*: clasifica los tokens que ya existen.
- **preset** (005) es una *operación de escritura explícita y opt-in*: **añade** tokens nuevos al
  Design System. `init` **nunca** aplica un preset automáticamente; el usuario elige el preset y
  ejecuta `apply` de forma deliberada.

### Preset disponible

| Campo | Valor |
|---|---|
| id | `neutral-base` |
| nombre | Neutral Base |
| versión | `1.0.0` |
| categorías | `color`, `spacing` |
| propósito | base neutral y portable: grises **primitive**, un rol de superficie **semantic** y una escala de espaciado **primitive** mínima. |

Es el único preset del catálogo en v1. El catálogo empaquetado permite incorporar más presets en
versiones futuras; el README documenta únicamente lo que existe hoy.

### Comandos

```bash
npx neuraz-ds presets list                 # lista el catálogo empaquetado
npx neuraz-ds presets inspect neutral-base  # detalle del preset (categorías, tokens)
npx neuraz-ds presets plan neutral-base     # PREVIEW: qué crearía/omitiría; nunca escribe
npx neuraz-ds presets apply neutral-base    # aplica de forma segura (recalcula el plan y escribe)
```

Cada subcomando acepta `--json` (local al subcomando, no global) para una salida estable y headless.

### plan frente a apply

```text
plan  → recalcula el diff contra tu Design System → muestra el preview → NUNCA escribe.
apply → recalcula el plan → escribe SOLO si es seguro (sin conflictos bloqueantes).
```

Ambos son deterministas y derivan del mismo motor de diff; `plan` es estrictamente de solo lectura.

### Seguridad del merge

- **add-only**: solo crea tokens y grupos intermedios ausentes; **no** elimina ni **sobrescribe**
  contenido existente.
- **conflictos bloqueantes**: si un token del preset difiere del host en valor, tipo, nivel
  foundation o alias, el plan se marca **no escribible** y `apply` se detiene (exit `4`) sin tocar el
  archivo; los `create` seguros se conservan en el preview.
- **descripción distinta**: si solo difiere `$description`, no es un conflicto: la operación es
  `skip` (no bloqueante) y se preserva la descripción del host.
- **target fijo**: siempre escribe `design-system/tokens/base.tokens.json`; con contención de rutas
  (sin symlinks fuera de la raíz).
- **escritor atómico**: escritura a un temporal + `rename` atómico; nunca deja escrituras parciales.
  Ante fallo de escritura el archivo original queda intacto (exit `6`).
- **concurrencia optimista**: detecta cambios del archivo entre lectura y escritura.
- **idempotencia**: aplicar dos veces el mismo preset es `unchanged` (exit `2`); los bytes y el
  `mtime` del archivo no cambian.
- **verificación posterior**: tras escribir, se reanaliza el resultado; ante `verification-error`
  (exit `7`) se **retiene un backup**. No hay rollback automático destructivo.

### Opciones intencionalmente ausentes en v1

```text
--force       (no existe: los conflictos nunca se fuerzan)
--category    (no existe: no hay filtrado por categoría)
--dry-run     (no existe: `plan` ya es el preview de solo lectura)
```

Tampoco están disponibles aquí: themes, dark mode, component tokens, presets externos/marketplace,
Figma, importadores de URL/CSS, imágenes, IA, viewer, editor, asset manager, MCP ni build/export.

### Comandos disponibles

| Comando | Descripción |
|---|---|
| `neuraz-ds init` | Inicializa el Design System local (interactivo, puede escribir). |
| `neuraz-ds validate [--json]` | Valida el Design System administrado **sin modificar archivos**. |
| `neuraz-ds inspect [--json]` | Inspecciona estructura, tokens y estado **sin modificar archivos**. |
| `neuraz-ds foundations [--json]` | Inspecciona categorías foundation y niveles **sin modificar archivos**. |
| `neuraz-ds presets list [--json]` | Lista el catálogo de presets empaquetado **sin modificar archivos**. |
| `neuraz-ds presets inspect <id> [--json]` | Detalla un preset **sin modificar archivos**. |
| `neuraz-ds presets plan <id> [--json]` | Previsualiza la aplicación **sin modificar archivos**. |
| `neuraz-ds presets apply <id> [--json]` | Aplica el preset de forma segura (add-only, atómica). |
| `neuraz-ds --help` / `<cmd> --help` | Ayuda. |
| `neuraz-ds --version` | Versión del gestor. |

### Códigos de salida (tabla común del binario)

| Código | Semántica |
|---:|---|
| 0 | Éxito válido / creado |
| 1 | Cancelación interactiva |
| 2 | Sin cambios (usado por `init`) |
| 3 | Entrada o Design System inválido |
| 4 | Estructura parcial o conflicto |
| 5 | Host o Design System no localizado |
| 6 | Error de lectura/filesystem |
| 7 | Verificación posterior de escritura |
| 70 | Error interno de frontera CLI (no contractual) |

`validate`, `inspect` y `foundations` **no** usan `1`, `2` ni `7` en su flujo normal (operaciones de
solo lectura). `presets list/inspect/plan` también son de solo lectura; `presets apply` sí puede usar
`2` (sin cambios / idempotente), `4` (conflicto bloqueante), `6` (error de escritura) y `7`
(verificación posterior tras escribir).

## Salida JSON v1

`validate --json`, `inspect --json` y `foundations --json` son superficies estables para CI,
agentes, scripts y otros consumidores headless. `init --json` no existe, `--json` no es global y no
hay flags de formato como `--compact`, `--pretty` u `--output`.

El envelope público siempre incluye cuatro campos base:

```json
{
  "formatVersion": "1.0.0",
  "command": "validate",
  "outcome": "valid",
  "result": {}
}
```

- `formatVersion` versiona el contrato JSON y es independiente de `package.version`.
- `command` es `"validate"`, `"inspect"` o `"foundations"`.
- `outcome` para estados esperados es `valid`, `complete-invalid`, `partial`, `not-found` o
  `read-error`; `internal-error` existe solo en la frontera CLI.
- `result` contiene el DTO del comando o `null` cuando no hay Design System administrado.
- `error` aparece solo en `not-found` e `internal-error`; en `not-found` es `null` en v1 porque los
  casos de uso reutilizados no pueblan `hostError`.

Reglas de canales:

| Caso | stdout | stderr | exit |
|---|---|---|---:|
| outcome esperado con `--json` | exactamente un JSON con newline final | vacío | `0`/`3`/`4`/`5`/`6` |
| error interno CLI con `--json` | vacío | envelope JSON `internal-error` con newline final | `70` |
| error de uso Commander | política existente del parser | mensaje de uso/error | `3` |

La serialización usa 2 espacios y newline final, no emite ANSI/spinners/tablas, no contiene
`undefined`, preserva el orden de arrays del modelo, y no incluye stacks, errores crudos de librería,
contenidos de archivos ni el `context` interno de los issues. Los campos contractuales no disponibles
se serializan como `null`.

Resumen de DTOs:

- `validate --json`: `host`, `structuralState`, `valid`, documentos comprobados/no comprobados,
  `summary`, `errors`, `warnings` y `limits`.
- `inspect --json`: `host`, `structuralState`, `identity`, `schemaVersions`, `files`, `tokens`,
  `validation` y `limits`; `identity` y `schemaVersions` usan `{value, trust}`.
- `foundations --json`: contrato separado e independiente del JSON v1 de 003; incluye `host`,
  `structuralState`, las nueve `categories`, `unresolved`, `summary`, `validation` y `limits`.
  Conserva todos los tokens foundation, sin cota de 200.
- `presets <sub> --json`: contrato propio (`formatVersion: "1.0.0"`), aislado de los envelopes de 003
  y 004. `command` es `"preset-list"`, `"preset-inspect"`, `"preset-plan"` o `"preset-apply"`;
  `outcome` cubre `success`/`applied`/`unchanged`/`invalid-preset`/`conflict`/`not-found`/
  `read-error`/`write-error`/`verification-error` (más `internal-error` en la frontera CLI). No emite
  rutas absolutas, stacks ni contenidos de archivo.

## Arquitectura headless

La lógica de validación/inspección vive en un único productor compartido del que se derivan dos
proyecciones; la CLI es solo un **adapter opcional** de presentación:

```text
analyzeExistingDesignSystem   (1 lectura + 1 parseo por documento, 1 recorrido del árbol)
├── ValidationReport          (proyección de validez → validate)
├── DesignSystemInspection    (proyección descriptiva → inspect)
└── FoundationsInspection     (proyección foundation + pasada metadata O(nodes) → foundations)
```

Los casos de uso `validateDesignSystem`, `inspectDesignSystem` e `inspectFoundations` son
**headless** (sin terminal): una futura TUI/Studio/MCP puede reutilizarlos sin reescribir el núcleo.
La salida JSON se deriva de resultados públicos mediante DTOs y mappers puros; no serializa objetos
de dominio en crudo ni ejecuta un segundo análisis.

## Estado y límites de esta versión

Implementa `init`, `validate`, `inspect`, `foundations` y `presets`. Límites actuales (no son
defectos):

- **un** Design System por proyecto; **tres** documentos administrados; **un** archivo de tokens;
- tokens en **JSON DTCG 2025.10**; inspección **profunda** solo de `color`;
- los otros **12 tipos** DTCG reconocidos se validan de forma superficial y producen un *warning*
  (`dtcg-type-not-deeply-inspected`), sin invalidar el Design System;
- `foundations` clasifica solo foundation primitives/semantics;
- `presets` ofrece **un** preset empaquetado (`neutral-base`) con merge **add-only** sobre el archivo
  de tokens; **sin** `--force`/`--category`/`--dry-run`, **sin** delete, themes, dark mode, component
  tokens, presets externos/marketplace ni recomendador automático. Es la base para 006 (build/export),
  que **no** está disponible aquí;
- **sin** reparación/edición/migración, **sin** TUI/viewer/MCP, **sin** Style Dictionary y **sin**
  múltiples themes ni múltiples archivos de tokens.

### Roadmap (futuro, no disponible)

```text
TUI opcional / viewer efímero
Style Dictionary
MCP
```

## Desarrollo

```bash
npm install
npm run typecheck   # TypeScript estricto (ESM, NodeNext)
npm run lint        # guard arquitectónico por capas
npm test            # Vitest (unit + integración + CLI)
npm run build       # compila a dist/
```

Requiere **Node.js `>=22`**. Construido con Spec-Driven Development
([GitHub Spec Kit](https://github.com/github/spec-kit)); especificaciones en
[`specs/001-ds-init/`](specs/001-ds-init/), [`specs/002-ds-validate-inspect/`](specs/002-ds-validate-inspect/),
[`specs/003-json-output/`](specs/003-json-output/), [`specs/004-foundations/`](specs/004-foundations/)
y [`specs/005-presets/`](specs/005-presets/), decisiones en [`docs/adr/`](docs/adr/)
(0001–0021), principios en
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).
