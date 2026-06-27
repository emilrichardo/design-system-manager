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
```

Muestra raíz, estado, documentos comprobados, nº de errores/warnings, tokens y la lista de issues.
Códigos principales: `0` válido · `3` inválido · `4` parcial · `5` no localizado · `6` lectura/fs.

## `neuraz-ds inspect`

Comando **de solo lectura**: responde *¿qué contiene y cómo está organizado?*. Devuelve identidad,
archivos (presentes/ausentes), estadísticas de tokens (grupos, valores, aliases, `byType`,
profundidad), rutas de tokens y el resultado de validación. Conserva información **recuperable**
incluso en estados inválidos o parciales, marcando la confiabilidad. **No infiere ni modifica nada.**

```bash
npx neuraz-ds inspect     # no interactivo; funciona en CI sin TTY
```

La salida de terminal muestra **hasta 200 rutas de tokens** (cota de presentación); con más, indica
cuántas se omiten. El **modelo headless conserva todos los nodos** (la cota es solo visual). Códigos
principales: `0` · `3` · `4` · `5` · `6`.

### Comandos disponibles

| Comando | Descripción |
|---|---|
| `neuraz-ds init` | Inicializa el Design System local (interactivo, puede escribir). |
| `neuraz-ds validate` | Valida el Design System administrado **sin modificar archivos**. |
| `neuraz-ds inspect` | Inspecciona estructura, tokens y estado **sin modificar archivos**. |
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

`validate` e `inspect` **no** usan `1`, `2` ni `7` en su flujo normal (operaciones de solo lectura).

## Arquitectura headless

La lógica de validación/inspección vive en un único productor compartido del que se derivan dos
proyecciones; la CLI es solo un **adapter opcional** de presentación:

```text
analyzeExistingDesignSystem   (1 lectura + 1 parseo por documento, 1 recorrido del árbol)
├── ValidationReport          (proyección de validez → validate)
└── DesignSystemInspection    (proyección descriptiva → inspect)
```

Los casos de uso `validateDesignSystem` / `inspectDesignSystem` son **headless** (sin terminal): una
futura TUI/Studio/MCP puede reutilizarlos sin reescribir el núcleo. `--json` queda habilitado por
diseño (los casos de uso ya devuelven datos estructurados) pero **no** se implementa en esta versión.

## Estado y límites de esta versión

Implementa `init`, `validate` e `inspect`. Límites actuales (no son defectos):

- **un** Design System por proyecto; **tres** documentos administrados; **un** archivo de tokens;
- tokens en **JSON DTCG 2025.10**; inspección **profunda** solo de `color`;
- los otros **12 tipos** DTCG reconocidos se validan de forma superficial y producen un *warning*
  (`dtcg-type-not-deeply-inspected`), sin invalidar el Design System;
- **sin** reparación/edición/migración, **sin** `--json`, **sin** TUI/viewer/MCP, **sin** Style
  Dictionary y **sin** múltiples themes/presets ni múltiples archivos de tokens.

### Roadmap (futuro, no disponible)

```text
TUI opcional / viewer efímero
salida --json
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
[`specs/001-ds-init/`](specs/001-ds-init/) y [`specs/002-ds-validate-inspect/`](specs/002-ds-validate-inspect/),
decisiones en [`docs/adr/`](docs/adr/) (0001–0010), principios en
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).
