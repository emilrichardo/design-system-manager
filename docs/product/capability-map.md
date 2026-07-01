# Mapa de capacidades — Neuraz Design System Studio

> Estado real de cada capacidad del producto. Solo se marca `implemented` lo realmente cubierto por las
> features cerradas `001`–`009`. Todo lo demás es `planned`, `exploratory` u `out-of-scope`.
> Visión en [vision.md](vision.md); reglas en [architecture-guardrails.md](architecture-guardrails.md).

## Estados

- `implemented` — entregado y cubierto por `001`–`009`.
- `planned` — comprometido en la visión; diseño/implementación futuros.
- `exploratory` — deseable pero sin contrato; requiere investigación.
- `out-of-scope` — fuera del alcance del producto (al menos por ahora).

## Core (base del Studio)

| Capability | Module | Status | Current feature | Future feature |
|---|---|---|---|---|
| Inicialización segura del Design System local | Core / CLI | implemented | 001-ds-init | — |
| Validación e inspección (DTCG, aliases, tipos, trust, límites) | Core / CLI | implemented | 002-ds-validate-inspect | — |
| Salida JSON machine-readable (envelope v1) | Core / CLI | implemented | 003-json-output | — |
| Foundations: clasificación primitive/semantic y categorías | Core | implemented | 004-foundations | — |
| Presets empaquetados con `apply` seguro (add-only, atómico) | Core / CLI | implemented | 005-presets | — |
| Build/export determinista (CSS, JSON, TS, manifest) | Core / CLI | implemented | 006-build-export | — |
| Mutaciones estructuradas y seguras de tokens (diff, apply transaccional) | Core / CLI | implemented | 008-token-mutations | — |
| Casos de uso headless reutilizables | Core | implemented | 001–009 | — |
| Escritura transaccional + ownership + recuperación | Core / infra | implemented | 005, 006, 008 | — |
| Operación local-first y Git-first sobre archivos del repo | Core | implemented | 001–009 | — |

## Interfaces

| Capability | Module | Status | Current feature | Future feature |
|---|---|---|---|---|
| CLI (`neuraz-ds …`) | Interface | implemented | 001–009 | CLI consciente del Studio |
| Servidor MCP para agentes | Interface | planned | — | MCP server |
| Skills para agentes | Interface | exploratory | — | Studio skills |
| Integración Git y CI/CD (flujos de candidatos, checks) | DevOps | planned | — | CI/CD integration |

## Studio (UI)

| Capability | Module | Status | Current feature | Future feature |
|---|---|---|---|---|
| Visualizador del Design System (`neuraz-ds view`, solo lectura) | Studio (UI) | implemented | 009-design-system-viewer | — |
| Editor visual de tokens (escribe vía `planTokenMutation`/`applyTokenMutation`) | Studio (UI) | planned | 010-visual-token-editor | — |
| Diff y aprobación de candidatos (reutiliza `TokenMutationDiffV1`) | Candidates pipeline | planned | 010-visual-token-editor | Candidate review |

## Assets

| Capability | Module | Status | Current feature | Future feature |
|---|---|---|---|---|
| Gestión manual de fuentes (tipografías + licencias) | Assets | implemented | 007-asset-manager | — |
| Logos, iconos e imágenes | Assets | implemented | 007-asset-manager | — |
| SVG con sanitización previa | Assets | implemented | 007-asset-manager | — |
| Import plan/apply + remove de assets (transaccional) | Assets | implemented | 007-asset-manager | — |

## Importadores e inferencia

| Capability | Module | Status | Current feature | Future feature |
|---|---|---|---|---|
| Importación desde Figma | Importers | exploratory | — | Figma importer |
| Extracción desde URL | Importers | exploratory | — | URL extractor |
| Análisis de imágenes y capturas | Importers | exploratory | — | Image/screenshot analysis |
| Inferencia de tokens y presets | AI (fuera del Core) | exploratory | — | Token/preset inference |

## Fuera de alcance

| Capability | Module | Status | Current feature | Future feature |
|---|---|---|---|---|
| Backend cloud / multi-tenant / base de datos interna | — | out-of-scope | — | — |
| Proveedores de IA dentro del Core determinista | — | out-of-scope | — | — |
| Marketplace de presets externos | — | out-of-scope | — | — |
| Acoplar un framework de UI como dependencia del Core | — | out-of-scope | — | — |

## Notas

- Las capacidades `exploratory` y `planned` deben respetar los 15
  [guardrails](architecture-guardrails.md) — en particular: importadores e inferencia producen
  **candidatos** (reglas 7–9), assets se mantienen separados de DTCG (regla 6) y la UI es cliente, no
  autoridad (regla 4).
- Ninguna fila marcada `implemented` corresponde a capacidades futuras: solo refleja `001`–`009`.
- `008-token-mutations` reutiliza el planner/diff/writer headless para MCP/Studio (regla 4): la CLI es un
  adapter delgado, no la autoridad; el Visual Token Editor y el MCP server futuros consumirán la misma
  API sin reescribir validación, aliases ni escritura.
- `009-design-system-viewer` es estrictamente de solo lectura (regla 4, la UI es cliente no autoridad):
  proyecta `002`/`004`/`005`/`006`/`007` y el plan read-only de `008` sin reimplementar ninguno; su
  adapter `node:http`+bundle estático (`ADR-0026`) no añade dependencia runtime nueva y sirve de base para
  el futuro Visual Token Editor (reutiliza shell, navegación y proyecciones en vez de duplicarlas).
- `010-visual-token-editor` esta especificada, no implementada: reutilizara el shell del Viewer y los
  casos de uso `planTokenMutation`/`applyTokenMutation` de `008`, con diff visual, aprobacion explicita,
  apply transaccional, recovery y recarga del Viewer (`ADR-0027`).
