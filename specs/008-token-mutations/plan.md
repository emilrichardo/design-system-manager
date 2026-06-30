# Implementation Plan: Token Mutation Commands and Safe Diff

**Branch**: `008-token-mutations` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-token-mutations/spec.md`

## Summary

Deliver a headless, safe, command-driven mutation API over the DTCG source
(`design-system/tokens/base.tokens.json`). A `plan` use case reads one semantic snapshot (reusing
`002`/`004`), validates a structured command, builds a deterministic mutation plan and a safe diff, and
validates the candidate document — writing nothing. An `apply` use case re-derives the plan and, past an
explicit approval boundary, writes the single token file transactionally, reusing the `005` single-file
atomic writer's guarantees (snapshot identity, concurrency detection, backup, restore, verification,
idempotency). Renames/moves rewrite **all** affected alias references so aliases never break; removing a
token with dependents or a non-empty group is blocked. The API is the shared base for CLI, MCP, skills,
Studio, the Visual Token Editor, preset authoring and approved importers; the UI never writes the file.

## Technical Context

**Language/Version**: TypeScript estricto + ESM, Node `>=22` (same as `001`–`007`).

**Primary Dependencies**: Existing only — no new runtime dependencies. Reuses the `002`/`004` analysis
engine, the `005` single-file atomic writer + concurrency detection, `node:crypto` (hashing) behind the
existing seams. No Commander/React/browser/network/AI in the core.

**Storage**: Local files only — mutates exactly `design-system/tokens/base.tokens.json`. No database.

**Testing**: vitest (domain unit, application integration with temp projects, CLI child-process for the
future thin surface), matching the existing layout.

**Target Platform**: Local dev/CI; no TTY required; headless-first.

**Project Type**: Single layered project (domain ← application ← infrastructure ← cli), same as the Core.

**Performance Goals**: Deterministic, single-pass per plan; sub-second for typical token counts; bounded
by the existing analysis limits.

**Constraints**: Read-only plan; transactional single-file apply; no broken aliases; no absolute paths in
output; tokens-only (build/assets/manifests untouched); no `--force`.

**Scale/Scope**: Hundreds to low-thousands of tokens; batch commands all-or-nothing.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Un Design System por proyecto | PASS — one token source per host. |
| II. Archivos locales como fuente de verdad | PASS — mutates the canonical file via a safe API. |
| III. DTCG como formato canónico | PASS — candidate is validated as DTCG before any write. |
| IV. Style Dictionary pipeline | N/A — mutations are upstream of generation. |
| V. Independencia del framework | PASS — headless core, no UI coupling (FR-020). |
| VI. El gestor es una herramienta | PASS — edits files, is not the Design System. |
| VII. Edición visual sin ocultar el formato fuente | PASS — Studio/editor are clients of this API; the source stays canonical DTCG. |
| VIII. Validación antes de generación | PASS — validate command + candidate before any write (FR-004/009). |
| IX. Contratos antes que implementaciones | PASS — `contracts/` define the surface first. |
| X–XI. Accesibilidad / páginas | N/A — no UI here. |
| XII. Contenido como contexto opcional | PASS — unknown content preserved (FR-018). |
| XIII. Local-first | PASS — offline, no cloud/collab. |
| XIV. Seguridad en las modificaciones | PASS — transactional, concurrency detection, backup/restore, verification, no broken aliases, no `--force`. |
| XV. Integración con agentes controlada | PASS — stable JSON contracts; MCP/skills reuse the same use cases. |
| XVI. Cambios incrementales y verificables | PASS — checkpointed; stable outcomes/exits. |
| XVII. Portabilidad y ausencia de bloqueo | PASS — plain DTCG file; no lock-in. |

No violations. Product guardrails 3, 4, 5, 7, 8, 10–13 are enforced by FR-004/008/011/013/015/020/022/023.

## Project Structure

### Documentation (this feature)

```text
specs/008-token-mutations/
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
├── domain/token-mutations/        # pure models: operations, command, plan, diff, result, outcomes,
│                                  #   issue codes, path/value validation helpers (no fs)
├── application/token-mutations/   # headless use cases + ports:
│                                  #   planTokenMutation, applyTokenMutation; command validation;
│                                  #   mutation planner; diff calculator; reference-update engine;
│                                  #   candidate builder/validator; idempotency; concurrency check
│   └── json/                      # public DTO + mappers (TokenMutationJsonEnvelopeV1)
├── infrastructure/token-mutations/# adapters behind ports: source snapshot reader (reuse 006),
│                                  #   candidate serializer, single-file transactional writer (reuse 005)
└── infrastructure/reporter/       # token-mutation terminal + JSON reporters (CLI/Studio reuse)

src/cli/                           # optional thin `token` command surface (adapter; declarative JSON file)

tests/
├── domain/token-mutations/
├── application/token-mutations/
├── integration/token-mutations/
└── cli/                           # if the thin CLI is wired
```

**Structure Decision**: A dedicated `token-mutations` tree across layers, isolated from token/build/asset
code. The planner/diff/reference-update logic is pure (domain/application); only the snapshot reader and
the single-file writer touch the filesystem, behind ports (guardrail 5). CLI/MCP/Studio are adapters over
the same use cases (guardrail 3). This plan is documentation-only; no productive code is created here.

## Reuse and possible refactor (documented, not implemented)

- **Source read**: reuse the `006` single-semantic-source snapshot reader (one read/decode/parse/analyze)
  or `createBoundAnalyze` (`002`) — no second engine.
- **Write**: reuse the `005` `SingleFileAtomicWriter` (`createSingleFileAtomicWriter`) which already
  provides snapshot-identity concurrency detection, backup, restore and verification for
  `base.tokens.json` — the same path `005-presets apply` uses. Token mutations generalize preset apply.
- **Possible refactor**: extract a shared "safe single-file candidate write" abstraction used by both
  `005-presets apply` and `008` to avoid duplicate write orchestration. This is documented as a candidate
  refactor; it MUST NOT change the observable behavior or contracts of `005`. Not implemented in this
  planning phase.

## Key Architectural Decisions

Captured in [research.md](research.md): the structured-command mutation model and flow; DTCG group
operations and what "group" means; the rename/move **update-all-affected-aliases** reference policy;
validation classification (block / explicit-operation / auto-resolved / never-silent); the remove
policies (dependents block, non-empty group block, no `--force`); single-file transactional reuse vs the
candidate-directory set writer; outcomes/exit codes (reuse + `invalid-command`); the independent JSON
envelope; and the thin CLI with an optional declarative JSON command file.

## Complexity Tracking

> No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
