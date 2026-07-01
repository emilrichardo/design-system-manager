# Implementation Plan: Visual Token Editor

**Branch**: `010-visual-token-editor` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-visual-token-editor/spec.md`

## Summary

Add a local Visual Token Editor on top of the closed `009` Viewer shell and the closed `008` token
mutation use cases. The Editor turns user actions into `TokenMutationCommandV1`, requests a read-only
mutation plan/diff from `008`, shows a non-editable visual diff with conflicts/warnings, requires explicit
approval, calls `applyTokenMutation`, displays apply/recovery outcomes, and reloads the Viewer session.

This feature is the first write-capable Studio UI surface. It reuses the Viewer for current/read state and
`008` for every mutation rule. It does not edit `base.tokens.json` directly and does not create new
mutation semantics.

## Technical Context

**Language/Version**: TypeScript strict + ESM/NodeNext, Node `>=22`.

**Primary Dependencies**: Existing runtime dependencies only (`commander`, `@clack/prompts`, `zod`, `ajv`,
`semver`). No new runtime dependency is planned. Reuses `009`'s `node:http` local adapter and vanilla
TypeScript/DOM UI; reuses `008` `planTokenMutation`/`applyTokenMutation`.

**Storage**: No Editor-owned persisted storage. Only `008` may transactionally mutate
`design-system/tokens/base.tokens.json`. The Editor writes no cache, session file or source patch.

**Testing**: Vitest unit/integration/CLI/binary/tarball tests, architecture checks, DOM/static UI tests
matching `009`, and filesystem byte-stability checks around plan/error states.

**Target Platform**: Local dev/CI; offline loopback browser UI; no cloud services.

**Project Type**: Single layered TypeScript package. Existing rule remains: `domain <- application <-
infrastructure <- cli`. Editor adds an application/infrastructure slice only; no new Core domain package
unless the implementation needs pure editor state helpers with no duplication of `008`/`009`.

**Performance Goals**: Preview/apply use the existing `008` single-source semantics; UI interactions are
in-memory until preview. Viewer refresh after apply should reuse the existing `009` session build path and
remain suitable for hundreds to low-thousands of tokens.

**Constraints**: Command -> plan -> diff -> approval -> apply -> verification -> Viewer reload; no direct
filesystem writes from Editor; no planner/diff/alias/writer duplication; no implicit force; invalid batch
writes zero files; public contracts expose logical paths/safe values only.

**Scale/Scope**: Single local user, one host Design System, 15 visual operations from `008`, supported
type controls for 9 DTCG/simple value families, no assets/presets/Figma/AI/multi-theme/component editor.

## Constitution Check

*GATE: passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Un Design System por proyecto | PASS — one local host, one Viewer/Editor session. |
| II. Archivos locales como fuente de verdad | PASS — `008` writes the canonical token file transactionally; no DB/store. |
| III. DTCG como formato canónico | PASS — commands create/update DTCG tokens through `008`; no proprietary replacement format. |
| IV. Style Dictionary pipeline | N/A — editing is upstream of build/export and does not alter artifact generation. |
| V. Independencia del framework | PASS — Core/app use cases stay framework-agnostic; UI remains infrastructure. |
| VI. El gestor es una herramienta | PASS — the tool edits the host DS through approved Core use cases; it is not the DS. |
| VII. Edición visual sin ocultar el formato fuente | PASS — declared/resolved/current/pending/source labels are required. |
| VIII. Validación antes de generación | PASS — preview validates via `008`; apply only after approval. |
| IX. Contratos antes que implementaciones | PASS — contracts define editor session/draft/review/apply/control/API before code. |
| X. Accesibilidad como requisito estructural | PASS — dedicated accessibility contract and tasks. |
| XI. Páginas y secciones como validación | N/A — no page/section builder. |
| XII. Contenido como contexto opcional | N/A — no external content ingestion. |
| XIII. Funcionamiento local-first | PASS — inherits `009` offline loopback model. |
| XIV. Seguridad en las modificaciones | PASS — no direct writes, explicit approval, `008` transactional recovery states. |
| XV. Integración con agentes controlada | PASS — same command/result contracts can be consumed by future MCP/Studio. |
| XVI. Cambios incrementales y verificables | PASS — 6 broad checkpoints with gates. |
| XVII. Portabilidad y ausencia de bloqueo | PASS — source remains DTCG; Editor adds no proprietary storage. |

No constitution violation. Product guardrails 1–5 and 10–13 are directly enforced by FR-001..FR-022.

## Project Structure

### Documentation (this feature)

```text
specs/010-visual-token-editor/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── editor-accessibility-v1.contract.md
│   ├── editor-apply-result-v1.contract.md
│   ├── editor-command-draft-v1.contract.md
│   ├── editor-http-json-v1.contract.md
│   ├── editor-review-v1.contract.md
│   ├── editor-session-v1.contract.md
│   ├── editor-state-machine-v1.contract.md
│   └── editor-value-control-v1.contract.md
├── checklists/
│   └── requirements.md
└── tasks.md

docs/adr/
└── 0027-visual-editor-adapter-over-token-mutations.md
```

### Source Code (planned, not created in this phase)

```text
src/application/editor/
├── command-draft.ts
├── editor-session.ts
├── editor-state-machine.ts
├── plan-editor-command.ts
├── apply-editor-command.ts
├── value-controls.ts
└── json/
    ├── dto.ts
    └── map-editor.ts

src/infrastructure/viewer/
├── http-server.ts              # extend carefully with editor routes, keeping Viewer routes intact
└── ui/
    ├── main.ts                 # existing Viewer UI; add editor panels without a framework dependency
    └── editor.ts               # optional split if implementation benefits

tests/
├── application/editor/
├── integration/editor/
├── architecture/editor/
└── cli/view-editor*.test.ts
```

**Structure Decision**: Add a narrow `application/editor` slice for editor-local orchestration state and
mapping. It may import `application/viewer` types and `application/token-mutations` use cases/ports, but
must not import `node:http`, DOM, Commander or writer adapters. Infrastructure extends the existing Viewer
server/UI as a local adapter. No productive code is created by this planning phase.

## Architecture

```text
Viewer current state (009)
  -> user action in UI
  -> EditorCommandDraftV1
  -> TokenMutationCommandV1 (008)
  -> planTokenMutation (008)
  -> EditorReviewV1 / visual diff
  -> approval boundary
  -> applyTokenMutation (008)
  -> EditorApplyResultV1 / recovery
  -> rebuild ViewerSessionV1 (009)
```

Layer rules:

- `src/application/editor/**` may compose `008`/`009` public application contracts.
- `src/application/editor/**` must not reference filesystem writers, DOM, `node:http`, Commander,
  browser globals or source file paths.
- `src/infrastructure/viewer/**` owns HTTP/DOM details and must remain loopback/offline.
- The UI may render editor controls but never parse `design-system/**` or write it.

## Durable Decision

ADR-0027 records the durable boundary: the Visual Token Editor is a write-capable local adapter over
`008` inside the `009` shell, with a separate editor JSON envelope and explicit approval/recovery states.

## Complexity Tracking

No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| — | — | — |

## Phase 0 / Phase 1 Outputs

- [research.md](research.md): decisions D1–D9.
- [data-model.md](data-model.md): editor session/draft/review/apply/control/recovery entities.
- [contracts/](contracts/): public editor contracts.
- [quickstart.md](quickstart.md): validation scenarios for the future implementation.
- [tasks.md](tasks.md): 6 checkpoints, broad implementation tasks.

## Post-Design Constitution Re-check

PASS. Contracts preserve DTCG source authority, `008` mutation safety, `009` viewer reuse, local-first
operation, accessibility, and no lock-in. No `[NEEDS CLARIFICATION]` markers remain.
