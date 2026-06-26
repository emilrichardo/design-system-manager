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

### Comandos disponibles

| Comando | Descripción |
|---|---|
| `neuraz-ds init` | Inicializa el Design System local (interactivo). |
| `neuraz-ds --help` / `init --help` | Ayuda. |
| `neuraz-ds --version` | Versión del gestor. |

### Códigos de salida

| Condición | Exit |
|---|---:|
| Creación exitosa | 0 |
| Cancelación | 1 |
| Ya inicializado y válido | 2 |
| Entrada o Design System inválido | 3 |
| Estado parcial o conflicto de archivos | 4 |
| Proyecto anfitrión inválido (sin `package.json`) | 5 |
| Error de filesystem | 6 |
| Verificación posterior fallida | 7 |

(Un error interno inesperado en la frontera CLI usa el código no contractual `70`.)

## Estado y límites de esta versión

Implementa **únicamente** `init`. Esta versión **no** incluye: modo no interactivo, `validate`,
`inspect`, TUI, viewer, Studio, MCP, Style Dictionary, generación CSS, importadores, análisis de
imágenes/URL/Figma, ni múltiples Design Systems.

El núcleo es **headless**: la lógica vive en capas `domain`/`application` independientes de la
terminal, por lo que en el futuro podrá añadirse otra interfaz sin reescribir el núcleo.

### Roadmap (futuro, no disponible)

```text
validate / inspect
TUI opcional
viewer efímero
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
([GitHub Spec Kit](https://github.com/github/spec-kit)); especificación en
[`specs/001-ds-init/`](specs/001-ds-init/), decisiones en [`docs/adr/`](docs/adr/), principios en
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).
