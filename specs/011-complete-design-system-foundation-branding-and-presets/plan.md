# Implementation Plan: Complete Design System Foundation, Branding and Presets

**Branch**: `011-complete-design-system-foundation-branding-and-presets` (trabajado directamente sobre
`main`, consistente con el historial lineal de `001`–`010` — sin branches de feature de larga vida) |
**Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-complete-design-system-foundation-branding-and-presets/spec.md`

**Note**: Esta feature siembra modelo y contratos. **No implementa código productivo** (mandato
explícito del brief). Este plan describe la implementación *futura* que los checkpoints A–F habilitarán,
para que `012`+ no tengan que rediseñar la frontera.

## Summary

Corregir la deriva de alcance detectada en la auditoría (el producto se documentaba de forma
implícitamente token-céntrica pese a que la constitución ya anticipaba componentes/patterns/contenido) y
sentar, de forma puramente documental y contractual: (1) el modelo canónico de 5 niveles + capa
transversal, (2) el modelo inicial de Brand System headless separado de tokens/assets, (3) la política de
capas de token `primitive/brand → semantic → component`, (4) soporte profundo declarado para los 13 tipos
DTCG, (5) el preset `web-complete` + packs sobre el motor add-only ya existente de `005`, y (6) las
extensiones de Viewer/Editor (`brand`, `components`, `quality`) reutilizando `009`/`010` sin reescritura.

## Technical Context

**Language/Version**: TypeScript estricto (ESM, NodeNext), Node >=22 — sin cambios respecto de `001`–`010`.

**Primary Dependencies**: `commander`, `@clack/prompts`, `zod`, `ajv`, `semver`, `vitest` — sin nuevas
dependencias runtime (mismo guardrail que `009`/`010`: UI vanilla TypeScript/DOM sobre `node:http`).

**Storage**: Archivos del repositorio anfitrión — `design-system/tokens/base.tokens.json` (sin cambios de
formato de archivo, solo `$extensions` aditivos), `design-system/assets/**` (sin cambios, `007`), y
**nuevo** `design-system/brand/**` (JSON + Markdown narrativo, mismo writer transaccional que `005`/`008`).

**Testing**: `vitest` (unit + integración + CLI), mismo patrón que `001`–`010`; `011` no añade tests
(no hay código), pero cada contrato en `contracts/` es el input directo de los tests de `012`+.

**Target Platform**: CLI Node local + Viewer `node:http` local (`127.0.0.1`) — sin cambios.

**Project Type**: Single project (paquete npm con CLI) — sin cambios de estructura de alto nivel.

**Performance Goals**: Sin cambios de contrato de rendimiento respecto de `001`–`010` (una sola
lectura/análisis por ejecución; límites de `ANALYSIS_LIMITS` se extienden, no se relajan).

**Constraints**: Offline-capable (guardrail 1), sin nueva dependencia runtime, compatibilidad total con
Design Systems `001`–`010` sin `brand/` (`FR-017`).

**Scale/Scope**: Modelo documental + contratos para 1 nuevo dominio de storage (`brand/`), ~12 entidades
nuevas, 1 preset nuevo + 1 pack completo + 2 packs reservados, extensión de tipos DTCG profundos de 1→13,
3 vistas nuevas de Viewer, 1 caso de uso de escritura nuevo para Editor de marca.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Resultado |
|---|---|---|
| I. Un Design System por proyecto | `brand/` vive en el mismo repositorio anfitrión, sin multi-tenancy. | ✅ Pass |
| II. Archivos locales como fuente de verdad | `brand/**` son archivos versionables; ninguna DB interna. | ✅ Pass |
| III. DTCG como formato canónico de tokens | Tokens siguen siendo DTCG puro; `brand` es rol de metadata, no un formato paralelo. | ✅ Pass |
| IV. Style Dictionary como pipeline | **Contradicción preexistente documentada** (ver `research.md`); `011` no la resuelve unilateralmente, la deja explícita para una enmienda futura autorizada. | ⚠️ Excepción documentada, no nueva de `011` |
| V. Independencia del framework | Sin nuevas dependencias de framework; component tokens son contratos, no componentes React/Vue. | ✅ Pass |
| VI. El gestor es herramienta, no el Design System | `brand/**` es parte del Design System del usuario, no del paquete. | ✅ Pass |
| VII. Edición visual sin ocultar el formato fuente | Editor de marca (futuro) sigue mostrando el archivo fuente exacto, igual que `010`. | ✅ Pass |
| VIII. Validación antes de generación | `web-complete` debe validar `0` issues antes de build (`FR-008`). | ✅ Pass |
| IX. Contratos antes que implementaciones | `011` **es** la definición de contratos (component tokens, brand) antes de `012` (anatomy real). | ✅ Pass — es el propósito central de esta feature |
| X. Accesibilidad como requisito estructural | Viewer/Editor extendidos heredan las mismas reglas de accesibilidad de `009`/`010` (teclado, foco, landmarks, no-solo-color). | ✅ Pass (a verificar en implementación) |
| XIV. Seguridad en las modificaciones | Ningún caso de uso nuevo escribe fuera de `design-system/brand/**`; asset references son solo lectura/validación contra `007`. | ✅ Pass |
| XVI. Cambios incrementales y verificables | `011` declara explícitamente su fuera-de-alcance (anatomy, patterns, crawler, Figma, MCP, IA). | ✅ Pass |
| XVII. Portabilidad y ausencia de bloqueo | `brand/**` son archivos JSON/Markdown legibles sin el gestor. | ✅ Pass |

No hay violaciones que requieran entrada en "Complexity Tracking".

## Project Structure

### Documentation (this feature)

```text
specs/011-complete-design-system-foundation-branding-and-presets/
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — audit + decisions
├── data-model.md        # Phase 1 output — entities and storage layout
├── quickstart.md        # Phase 1 output — how to exercise the model once implemented
├── contracts/           # Phase 1 output
│   ├── token-layer-policy.md
│   ├── dtcg-type-support.md
│   ├── typography-projection.md
│   └── preset-web-complete.md
├── checklists/          # Phase 1 output — requirements quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks) — checkpoints A–F
```

### Source Code (repository root)

Sin cambio de layout de alto nivel; `011` **extiende** capas existentes (no introduce un segundo árbol
paralelo):

```text
src/
├── domain/
│   ├── dtcg/                  # + tipos profundos 002-013 de contracts/dtcg-type-support.md
│   ├── token-mutations/       # + TokenLayerV1/TokenProvenanceV1 en operation.ts (metadata aditiva)
│   ├── foundations/           # + política de capas (contracts/token-layer-policy.md)
│   ├── brand/                 # NUEVO — BrandProfileV1 y entidades relacionadas (dominio puro)
│   └── presets/               # + PresetPackV1, sin romper el motor de 005
├── application/
│   ├── brand/                 # NUEVO — casos de uso headless de brand (plan/apply propio, ver FR-015)
│   ├── viewer/                 # + brand/components/quality projections
│   ├── editor/                 # + brand editing (caso de uso propio, nunca vía 008 para narrativa)
│   └── presets/                 # + web-complete, packs
├── infrastructure/
│   ├── brand/                 # NUEVO — writer transaccional de brand/** (mismo patrón que fs/ de 008)
│   ├── build-export/          # + parsers profundos reutilizados por validate/inspect (contracts/dtcg-type-support.md R3)
│   └── viewer/ui/              # + vistas brand/components/quality (bundle vanilla, sin nueva dependencia)
└── cli/commands/
    └── brand.ts                # NUEVO — adapter delgado sobre application/brand (mismo patrón que asset.ts)

tests/
├── domain/brand/, application/brand/, infrastructure/brand/   # NUEVO
└── (resto sin cambios de estructura)
```

**Structure Decision**: extender los mismos 4 directorios de capa (`domain/application/infrastructure/
cli`) con un módulo `brand/` paralelo a `assets/`/`presets/`/`token-mutations/`, en vez de introducir una
jerarquía nueva. Mantiene el guardrail 3 (CLI/MCP/Studio reutilizan los mismos casos de uso) y el
guardrail 5 (filesystem detrás de puertos) sin excepción.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Principio IV (Style Dictionary) sigue sin resolverse | La contradicción es preexistente a `011` (desde `006`, ADR-0022-0025); resolverla requiere una enmienda constitucional explícita que no fue solicitada en este brief. | Amend unilateral sin aprobación explícita violaría el propio proceso de `Governance` de la constitución. |
