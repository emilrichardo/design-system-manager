# Mapa de capacidades — Neuraz Design System Studio

> Estado real de cada capacidad del producto. Solo se marca `implemented` lo realmente cubierto por las
> features cerradas `001`–`007`. Todo lo demás es `planned`, `exploratory` u `out-of-scope`.
> Visión en [vision.md](vision.md); reglas en [architecture-guardrails.md](architecture-guardrails.md).

## Estados

- `implemented` — entregado y cubierto por `001`–`007`.
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
| Casos de uso headless reutilizables | Core | implemented | 001–007 | — |
| Escritura transaccional + ownership + recuperación | Core / infra | implemented | 005, 006 | — |
| Operación local-first y Git-first sobre archivos del repo | Core | implemented | 001–007 | — |

## Interfaces

| Capability | Module | Status | Current feature | Future feature |
|---|---|---|---|---|
| CLI (`neuraz-ds …`) | Interface | implemented | 001–007 | CLI consciente del Studio |
| Servidor MCP para agentes | Interface | planned | — | MCP server |
| Skills para agentes | Interface | exploratory | — | Studio skills |
| Integración Git y CI/CD (flujos de candidatos, checks) | DevOps | planned | — | CI/CD integration |

## Studio (UI)

| Capability | Module | Status | Current feature | Future feature |
|---|---|---|---|---|
| Visualizador del Design System | Studio (UI) | planned | — | Design System viewer |
| Editor visual (escribe vía Core) | Studio (UI) | planned | — | Visual editor |
| Diff y aprobación de candidatos | Candidates pipeline | planned | — | Candidate review |

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
- Ninguna fila marcada `implemented` corresponde a capacidades futuras: solo refleja `001`–`007`.
