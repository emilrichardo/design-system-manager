# Implementation Plan: Design System Viewer

**Branch**: `009-design-system-viewer` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-design-system-viewer/spec.md`

## Summary

Deliver a local, 100% read-only visual projection of the Design System — Overview, Colors, Typography,
Spacing, Radius, Borders, Shadows, Motion, Aliases, Foundations, Assets, Presets, Issues, Build artifacts —
built as a **new read projection layer** over the existing headless use cases of `002`–`008`. A
framework-agnostic viewer application layer (conceptually `src/application/viewer/**`) performs one
session load (at most one invocation per reused use case), derives versioned `ViewerXxxV1` projections,
and never writes, mutates or parses `design-system/**` directly. A thin `node:http`-only local server
adapter serves a pre-built static UI bundle plus a small read-only JSON API backed by the same projections
(research D1–D3); the UI itself is vanilla TypeScript/DOM with zero new runtime dependencies on the core
package (research D2). This plan is documentation-only: no production code, tests or CLI wiring are
created here.

## Technical Context

**Language/Version**: TypeScript estricto + ESM, Node `>=22` (same as `001`–`008`).

**Primary Dependencies**: Existing only for the Core/application layer — no new runtime dependency.
Reuses `002`'s analysis, `004`'s foundations projection, `005`'s preset list/inspect, `006`'s build
snapshot/manifest read, `007`'s asset list/inspect, `008`'s read-only plan/diff shapes and
`AnalyzedTokenSource.dependentsOf`. The future thin HTTP adapter uses only `node:http`/`node:fs` (behind
existing/adapter-local ports, never imported by the application layer). The future UI bundle is vanilla
TypeScript/DOM; a bundler MAY be added as a devDependency for packaging only (research D2) — not decided
as a concrete package name in this phase.

**Storage**: None. Read-only; no database, no cache written to disk, no viewer-specific file.

**Testing**: vitest (domain unit for projections, application integration against a temp project reusing
the same fixtures `002`–`008` already use, architecture/lint checks for forbidden imports, and — once the
HTTP adapter exists — a supertest-less `node:http` client test), matching the existing layout. No UI
framework testing library is implied by this plan.

**Target Platform**: Local dev/CI; a local browser for the UI; headless-testable application layer with
no browser required for its own tests.

**Project Type**: Single layered project (domain ← application ← infrastructure ← cli), same as the Core,
with a new `viewer` slice added at the application/infrastructure layers only (no new domain concepts
duplicating `002`–`008`'s).

**Performance Goals**: One session load per open/refresh; deterministic, sub-second projection derivation
for typical token/asset counts; search/filter operate in-memory with no additional I/O.

**Constraints**: Zero writes ever; no second parse/analyze of any document another view already loaded in
the same session; no new domain-level outcome; no new runtime dependency on `@neuraz/design-system-manager`
(devDependency only, for UI packaging); Core stays free of React/browser/Commander (guardrails 2, per
FR-019/FR-020).

**Scale/Scope**: Same token/asset/preset counts as `001`–`008`; the Viewer adds a read surface, not a new
data scale concern.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Un Design System por proyecto | PASS — one session, one host, no multi-DS switching (spec Assumptions). |
| II. Archivos locales como fuente de verdad | PASS — the Viewer reads the same canonical files through existing use cases; introduces no second store. |
| III. DTCG como formato canónico | PASS — no new token format; projections are read-only views over already-validated DTCG. |
| IV. Style Dictionary pipeline | N/A — the Viewer is downstream of generation (`006`), not a generation pipeline. |
| V. Independencia del framework | PASS — viewer application layer has zero framework dependency (FR-019); UI framework choice (research D2) stays out of the Core and out of the installed package's runtime deps. |
| VI. El gestor es una herramienta | PASS — the Viewer visualizes the Design System; it is not the Design System. |
| VII. Edición visual sin ocultar el formato fuente | PASS — every projection is traceable to a named source field/use case (data-model.md); nothing is hidden or fabricated. |
| VIII. Validación antes de generación | N/A — the Viewer generates no artifact; it reuses `002`'s validation results as-is. |
| IX. Contratos antes que implementaciones | PASS — `contracts/` defines every `ViewerXxxV1` before any implementation. |
| X. Accesibilidad como requisito estructural | PASS — dedicated, testable Accessibility section in spec.md; carried into Checkpoint E. |
| XI. Páginas y secciones como validación del sistema | N/A — no page/section builder here; this is a data viewer, not the future demo-page tooling. |
| XII. Contenido como contexto opcional | N/A — no external content ingestion in this feature. |
| XIII. Funcionamiento local-first | PASS — offline by construction (research D1); no cloud dependency. |
| XIV. Seguridad en las modificaciones | PASS — zero writes (FR-004); no destructive action exists in this feature's scope at all. |
| XV. Integración con agentes controlada | PASS — `ViewerJsonEnvelopeV1` (research D8) gives MCP-style/agent consumers the same read-only contracts the UI uses; no second source of truth for agents. |
| XVI. Cambios incrementales y verificables | PASS — 6 broad checkpoints (tasks.md), each gated; explicit out-of-scope list carried from the spec. |
| XVII. Portabilidad y ausencia de bloqueo | PASS — no lock-in introduced; uninstalling the Viewer loses nothing (it writes nothing) and the Design System files are untouched. |

No violations. Product guardrails 1–5 are the direct anchor for this feature (Core headless-first, no
React/browser in Core, CLI/MCP/Studio reuse the same use cases, UI as client not authority, filesystem
behind ports); guardrails 6–15 are inherited unchanged from `001`–`008` since this feature never writes.

## Project Structure

### Documentation (this feature)

```text
specs/009-design-system-viewer/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities
├── quickstart.md        # Phase 1 reproducible flow (future, once implemented)
├── contracts/            # Phase 1 contracts (v1.0.0)
└── tasks.md              # Phase 2 (checkpoints)
```

### Source Code (repository root) — planned (implementation deferred)

```text
src/
├── application/viewer/            # headless, framework-agnostic viewer application layer:
│   ├── session.ts                 #   buildViewerSession (one call per reused use case)
│   ├── overview.ts                #   projectOverview
│   ├── tokens.ts                  #   projectToken, projectFoundationCategory (spacing/radius/border/
│   │                              #     shadow/motion share this; colors/typography extend it)
│   ├── colors.ts                  #   projectColorSwatch + contrastPolicy (pure function, Checkpoint D)
│   ├── typography.ts              #   projectTypography (+ font-asset match against 007)
│   ├── aliases.ts                 #   projectAlias, projectRenameMoveImpactPreview (reuses 008 read-only)
│   ├── assets.ts                  #   projectAsset (1:1 from 007)
│   ├── issues.ts                  #   projectIssues (consolidates 002/004/007 + stale-build flag from 006)
│   ├── navigation.ts               #   projectNavigation (sections, counts, per-section state)
│   ├── ports.ts                    #   ViewerSessionDependencies (the 002–008 use cases it depends on)
│   └── json/                       #   ViewerJsonEnvelopeV1 DTO + mappers (independent of 003's envelope)
├── infrastructure/viewer/          # adapters behind the application layer only:
│   ├── http-server.ts              #   node:http-only local server (D1); serves the static UI bundle +
│   │                               #     the read-only JSON API; never imports fs directly for DS data
│   └── ui/                         #   pre-built static bundle (vanilla TS/DOM), built by maintainers'
│                                   #     `npm run build`, not regenerated per invocation (D1)
└── cli/                            # future thin `view` command (adapter; starts the local server) —
                                   #   NOT implemented in this phase

tests/
├── application/viewer/             # session-load call-count tests, projection shape tests, contract
│                                   #   exclusion tests (no bytes/absolute paths/Error)
├── architecture/viewer/            # forbidden-import checks (no fs/Commander/React/browser in
│                                   #   application layer), extending scripts/arch-guard.mjs's pattern
└── integration/viewer/             # once implemented: local-server JSON API tests, zero-write regression
```

**Structure Decision**: A dedicated `viewer` slice at the application/infrastructure layers, isolated from
`002`–`008`'s own trees, mirroring how `008`'s `token-mutations` slice was isolated from `build-export`/
`assets`. No new domain package is introduced (`src/domain/viewer/` is deliberately **not** created — every
concept the Viewer needs already exists as a domain type in `002`–`008`; the Viewer only adds projection/
application-layer shapes). The UI bundle and HTTP adapter live under `infrastructure/viewer/`, the only
place allowed to know about `node:http`/DOM, per FR-019/FR-020. This plan is documentation-only; no
productive code is created here.

## Key Architectural Decisions

Captured in [research.md](research.md): the thin local HTTP server + pre-built static SPA choice and why a
runtime-regenerated static export was rejected (D1); zero new runtime dependency on the core package, UI
stays vanilla TS/DOM (D2); the viewer application layer's dependency boundary — only `002`–`008` ports, no
new engines (D3); single session load semantics and reuse of `006`'s existing bundled snapshot (D4); the UI
outcome vocabulary as a pure projection, never a fabricated domain outcome (D5); the WCAG 2.1 AA contrast
policy specified now, computation deferred (D6); the alias "potential impact" preview reusing `008`'s
read-only shapes without ever calling `apply` (D7); contract versioning and an independent
`ViewerJsonEnvelopeV1` for agent/MCP consumers (D8); no CLI command implemented in this phase (D9).

## Complexity Tracking

> No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| — | — | — |
