# Implementation Plan: Asset Manager for the local Design System

**Branch**: `007-asset-manager` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-asset-manager/spec.md`

## Summary

Add a manual, local-first Asset Manager that stores fonts, logos, SVG, icons and images under
`design-system/assets/` with an `AssetManifestV1` ownership manifest, kept strictly separate from DTCG
tokens. It provides headless listing/inspection, an `import plan`/`apply` flow (candidates previewed,
written only on apply), SHA-256 hashing + deduplication, content-based MIME detection, size/dimensions,
provenance, explicit (never-assumed) license capture, font signature validation, SVG sanitization, and
ownership-bound safe removal — all behind transactional, all-or-nothing writes and stable `1.0.0`
contracts reusable by CLI, MCP and Studio. The design reuses the proven transactional/ownership patterns
of `005`/`006` (conceptually, not by importing their code) and the shared outcome/exit-code vocabulary.

## Technical Context

**Language/Version**: TypeScript estricto + ESM, Node `>=22` (same as `001`–`006`).

**Primary Dependencies**: Existing only — no new runtime dependencies. `node:crypto` (SHA-256),
`node:fs/promises` behind ports, minimal in-house parsers for image headers and SVG sanitization. No
image/font libraries, no network, no browser, no AI SDKs.

**Storage**: Local files only. Asset files under `design-system/assets/<kind>/…`; ownership manifest
`design-system/assets/assets.json`. No database; Git is the timeline.

**Testing**: vitest (unit + integration with temp projects + child-process for any future CLI), matching
the existing test layout.

**Target Platform**: Local developer/CI environments (macOS/Linux/Windows-sim), no TTY required.

**Project Type**: Single project (layered: domain ← application ← infrastructure ← cli), same as the
Design System Manager Core.

**Performance Goals**: Deterministic, single-pass per source; operations complete in well under a second
for typical asset counts; bounded by explicit size/count limits.

**Constraints**: Local-first, offline, deterministic, headless-first; no absolute paths in outputs;
symlinks never followed; all-or-nothing writes; tokens/build untouched.

**Scale/Scope**: Tens to low-hundreds of managed assets per project; limits enforced and surfaced.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Un Design System por proyecto | PASS — one asset store per host, no second DS. |
| II. Archivos locales como fuente de verdad | PASS — assets are files in the repo; manifest is the authority. |
| III. DTCG como formato canónico de tokens | PASS — assets are separate; tokens never read/written (FR-002, FR-033). |
| IV. Style Dictionary como pipeline | N/A — assets are not token generation. |
| V. Independencia del framework | PASS — headless core, no UI/framework coupling (FR-023). |
| VI. El gestor es una herramienta | PASS — manages files, is not the Design System. |
| VII. Edición visual sin ocultar el formato fuente | PASS — Studio is a future client; core writes files transparently. |
| VIII. Validación antes de generación | PASS — plan validates/sanitizes before any write (FR-006/007/019/020). |
| IX. Contratos antes que implementaciones | PASS — `contracts/` define the surface before code. |
| X. Accesibilidad estructural | N/A — no UI in this feature. |
| XI. Páginas y secciones como validación | N/A. |
| XII. Contenido como contexto opcional | PASS — assets are optional content, separate from tokens. |
| XIII. Funcionamiento local-first | PASS — offline, no cloud/CDN (out of scope). |
| XIV. Seguridad en las modificaciones | PASS — transactional, ownership, recovery, no symlink follow, SVG sanitization. |
| XV. Integración con agentes controlada | PASS — stable JSON contracts; MCP is a future, opt-in adapter. |
| XVI. Cambios incrementales y verificables | PASS — checkpointed plan, stable outcomes/exits. |
| XVII. Portabilidad y ausencia de bloqueo | PASS — plain files + manifest; assets survive without the Studio. |

No violations. Product guardrails (`docs/product/architecture-guardrails.md`) 4, 6, 7, 8, 10–15 are
directly enforced by FR-002/006/007/008/016–028/032–035.

## Project Structure

### Documentation (this feature)

```text
specs/007-asset-manager/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities
├── quickstart.md        # Phase 1 reproducible flow
├── contracts/           # Phase 1 contracts (v1.0.0)
└── tasks.md             # Phase 2 (checkpoints)
```

### Source Code (repository root) — planned (implementation deferred)

```text
src/
├── domain/assets/                 # pure models: AssetKind, AssetRecord, AssetManifestV1,
│                                  #   AssetDimensions, provenance/license, outcomes, ordering
├── application/assets/            # headless use cases + ports:
│                                  #   listAssets, inspectAsset, planAssetImport, applyAssetImport,
│                                  #   removeAsset; ownership/dedup/idempotency (pure)
│   └── assets/json/               # public DTO + mappers (AssetJsonEnvelopeV1)
├── infrastructure/assets/         # adapters behind ports: asset store reader, MIME/dimension probes,
│                                  #   SVG sanitizer, font validator, transactional asset-set writer
└── infrastructure/reporter/       # asset terminal + JSON reporters (future CLI/Studio reuse)

src/cli/                           # optional thin `asset` command surface (adapter only)

tests/
├── domain/assets/
├── application/assets/
├── integration/assets/
└── cli/                           # if the CLI surface is wired
```

**Structure Decision**: Single layered project mirroring the Core. Assets get their own `domain/assets`,
`application/assets`, `infrastructure/assets` trees so they never mix with token/build code. The
filesystem stays behind ports (guardrail 5); UI/CLI/MCP are adapters over the same use cases (guardrail
3). This plan is documentation-only; no productive code is created here.

## Key Architectural Decisions

Captured in [research.md](research.md): asset store layout & manifest; content-based MIME detection;
header-only dimension extraction; SVG sanitization allowlist; font signature validation; SHA-256
deduplication; transactional asset-set publication (reusing `005`/`006` patterns); explicit license
model; ownership & unknown-content handling; shared outcomes/exit codes; JSON envelope independence.

## Complexity Tracking

> No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
