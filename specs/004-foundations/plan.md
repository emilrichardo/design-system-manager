# Implementation Plan: 004-foundations

**Branch**: `004-foundations` | **Date**: 2026-06-28 | **Spec**: [spec.md](spec.md)

**Input**: [specs/004-foundations/spec.md](spec.md). Base commit: `49f34fb`.

## Summary

Add a **read-only foundations view** over the existing single analysis: classify foundation tokens by
`level` (`primitive | semantic | unclassified`) from explicit DTCG `$extensions` metadata, attribute
each to one of 9 fixed categories by canonical top-level path segment (else `unresolved`), validate
foundation alias directions (reusing 002's alias graph), and report per-category states
(`absent | partial | complete | invalid`) plus a global outcome reusing 002's vocabulary. Surfaced via
a dedicated `neuraz-ds foundations` command (human + `--json`). **No** second read/parse/traversal,
**no** writes, **no** change to `init`/`validate`/`inspect` or JSON v1.

## Technical Context

**Language/Version**: TypeScript estricto, ESM (NodeNext), Node `>=22`.
**Primary Dependencies**: commander, @clack/prompts, zod, ajv, semver. **No new deps.**
**Storage**: local files (read-only); `base.tokens.json` is the single source of truth.
**Testing**: vitest (unit + integration FS real + CLI/child-process).
**Project Type**: single project (npm CLI).
**Performance**: foundations projection is `O(nodes + parsedNodes)` over in-memory data; no I/O.
**Constraints**: single analysis (1 read / 1 parse / 1 DTCG traversal), 0 writes, deterministic,
no-TTY, 002 limits/security reused, JSON v1 byte-stable.
**Scope/Scale**: 9 categories; inherits 002 limits (≤100k nodes, etc.).

## Constitution Check

| # | Principle | Result | Note |
|---|---|---|---|
| I | Un DS por proyecto | PASS | opera sobre el único DS resuelto |
| II | Archivos fuente de verdad | PASS | solo lectura; `$extensions` en `base.tokens.json` |
| III | DTCG canónico | PASS | clasificación sobre DTCG; no redefine sintaxis |
| IV | Style Dictionary diferido | PASS (N/A) | sin generación |
| V | Independencia de framework | PASS | dominio/aplicación headless |
| VI | Gestor ≠ DS | PASS | describe/valida; no altera el DS |
| VII | Edición transparente | PASS (N/A) | sin edición |
| VIII | Validación antes de generación | PASS | refuerza validación previa a presets/export |
| IX | Contratos antes que implementación | PASS | 8 contratos + ADR-0014..0017 |
| X | Accesibilidad estructural | PASS (N/A) | — |
| XI | Páginas como validación | PASS (N/A) | — |
| XII | Contenido opcional | PASS (N/A) | — |
| XIII | Local-first | PASS | offline, sin red |
| XIV | Seguridad | PASS | reusa límites/guards de 002; sin stacks/env |
| XV | Integraciones desacopladas | PASS | resultado headless + JSON para agentes |
| XVI | Incrementalidad | PASS | solo lectura; análisis único; sin tocar 001-003 |
| XVII | Portabilidad / no lock-in | PASS | `$extensions` DTCG portable; DS legible sin gestor |

**Result: PASS (17/17).** No violations.

## Project Structure (documentation)

```text
specs/004-foundations/
├── plan.md · research.md · data-model.md · quickstart.md
├── checklists/requirements.md
└── contracts/ (foundation-extension-v1, foundation-level-resolution-v1,
     foundation-category-definition-v1, foundations-issues-v1, foundations-result-v1,
     foundations-command-v1, foundations-json-result-v1)
```

ADR: `docs/adr/0014-foundation-metadata-and-level.md`, `0015-foundation-category-resolution.md`,
`0016-single-analysis-foundations-projection.md`, `0017-foundations-command-and-presentation.md`.

### Proposed source modules (NOT created in this phase)

```text
src/domain/foundations/                 # pure
├── foundation-level.ts                  # FoundationLevel, FoundationLevelSource, resolution types
├── foundation-category.ts               # category ids + registry (no values)
├── category-state.ts                    # state enum + pure state reducer
└── foundation-issue.ts                  # codes (reuses AnalysisIssue shape)

src/application/foundations/             # pure projection + use case
├── resolve-level.ts                     # $extensions read + Neuraz inheritance (over parsed doc)
├── resolve-category.ts                  # path-segment rule
├── project-foundations.ts              # analysis → FoundationsInspection (pure)
├── inspect-foundations.ts              # headless use case (reuses AnalyzeUseCase)
├── foundations-ports.ts                # FoundationsResult, reporter port
└── json/ (dto, map-foundations, map-internal-error, format-version)   # --json; SEPARATE from 003

src/infrastructure/reporter/
├── foundations-terminal-reporter.ts
└── foundations-json-serializer.ts       # JSON.stringify(env,null,2)+"\n" (separate contract)

src/cli/
├── commands/foundations.ts
├── program.ts (extend: register `foundations` + --json)
└── composition.ts (extend: createFoundations[Json]Dependencies)
```

## Architecture & flows

```text
executionDir
→ createBoundAnalyze()  (one analysis: 1 read, 1 parse, 1 DTCG traversal — UNCHANGED 002)
→ DesignSystemAnalysis { nodes, documents[<tokens>].parsed, errors, limits, host, structuralState }
→ project-foundations (PURE):
     resolve-level (reads $extensions from parsed doc; Neuraz inheritance)
     resolve-category (path first segment)
     join with nodes (effectiveType/alias*/trust) — NO re-resolution
     validate foundation alias directions (reuse aliasTarget/aliasState/cycle)
     category-state reducer
→ FoundationsResult (headless)
→ foundations reporter (human | JSON) — one write
→ exitCodeForOutcome
```

**Single-analysis guarantee** (ADR-0016): the projection consumes only already-produced artifacts; the
sole new pass is a shallow `$extensions` metadata walk over the in-memory parsed object (not a DTCG
re-analysis). Verified: `analyzeExistingDesignSystem` retains `documents[<tokens>].parsed`.

**Effective level** (ADR-0014): token own → nearest group → `unclassified`; invalid → `unclassified`
+ one `foundation-level-invalid` per declaration.

**Category** (ADR-0015): first canonical path segment == category id, else `unresolved`; no `$type`/
name/role guessing.

**Category states & global outcome** (foundations-result-v1): precedence
`invalid > partial > complete > absent`; global reuses 002 outcomes
(`not-found>read-error>structural-partial>foundations-invalid>foundations-partial>valid`).

**init → foundations** (read-only, no init change): init tokens lack metadata → `color` partial
(2 `unclassified`), others `absent`, global `partial`, exit 4, with `foundation-token-unclassified`
warnings; JSON mirrors. Explicit tests planned.

## Reuse matrix

| Concern | Action |
|---|---|
| host resolution, presence, readers, parser output, DTCG traversal, alias graph, type resolution, trust, limits | **reuse** (unchanged) |
| outcomes vocabulary, `exitCodeForOutcome`, `INTERNAL_ERROR_EXIT`, `CliIO`/`OutputWriter`, `createBoundAnalyze` | **reuse** |
| deterministic JSON formatting (`JSON.stringify(...,2)+"\n"`) | **reuse pattern** (separate serializer) |
| Commander program, composition | **extend** (register `foundations`, add factories) |
| domain foundations model, app projection + use case, reporters, foundations JSON contract | **create** |
| `init`, `validate`, `inspect`, JSON v1 (`JsonEnvelopeV1`/`JSON_FORMAT_VERSION`), 002 traversal/models | **do NOT modify** |

## Validation depth & issues

Depth table in [research §7](research.md): only `color` deep; others shallow (recognition + relations).
New codes (foundations-issues-v1): `foundation-level-invalid` (e), `foundation-forbidden-dependency`
(e), `foundation-token-unclassified` (w), `foundation-category-unresolved` (w),
`foundation-type-mismatch` (w). 002 issues (missing/cycle/to-group/not-deeply-inspected) are surfaced,
not duplicated.

## Security, preservation, determinism

Reuse 002 limits (file/total bytes, depth, nodes, path, alias, issues), path guard, no symlink escape,
no code exec; expose no stacks/env/raw errors/foreign paths/full `$extensions`. Read-only: never mutate
parsed doc or source file; preserve unknown `$extensions`/content. Deterministic: canonical category
order, 002 token order (no re-sort), stable issues, no timestamps/UUID/locale/TTY/env; JSON byte-stable.

## CLI & JSON

Dedicated `neuraz-ds foundations` (+ local `--json`); separate `FoundationsJsonEnvelopeV1`
(`FOUNDATIONS_JSON_FORMAT_VERSION="1.0.0"`, independent of 003). Streams/exit per
[foundations-command-v1](contracts/foundations-command-v1.contract.md). 003 byte-stable (regression).
**Foundations owns its JSON machinery**: 003's `serializeJsonV1` and `toJsonInternalErrorEnvelope` are
typed to `JsonEnvelopeV1` / `JsonCommand = "validate"|"inspect"`, so foundations MUST NOT reuse or cast
them — it provides its own `serializeFoundationsJsonV1` (or a byte-neutral shared low-level formatter)
and its own internal-error envelope/mapper with `command: "foundations"`. `JsonEnvelopeV1`,
`JSON_FORMAT_VERSION`, mappers, and the validate/inspect payloads stay untouched.

## Test strategy (for /speckit-tasks)

- **Unit (domain/app)**: `$extensions` parse; token override; nearest-group inheritance; invalid
  metadata (one issue per declaration); `unclassified`; category resolver (match/`unresolved`); state
  reducer (all 4 + precedence); forbidden direction; summary; determinism; frozen inputs (no mutation).
- **Application**: use case outcomes; recoverable results; `analyze` called once; no 2nd read/traversal
  (spies); limits; not-found/read-error/partial.
- **Integration (FS real)**: init→unclassified; token metadata; group metadata; override; invalid
  metadata; missing alias; cycle; alias-to-group; unknown types; unknown `$extensions`; invalid UTF-8;
  partial; not-found; read-error; **byte-identical source** before/after.
- **CLI / child-process**: command + `--help` shows `--json`; human output; no TTY; exit matrix
  (0/3/4/5/6); streams; internal-error JSON (stderr/empty stdout/70); unknown option → 3.
- **JSON**: envelope; parseable; determinism; all tokens (no cap); internal error.
- **Regression**: 001 (274), 002 (315), 003 (177) green; **byte-identical** `validate --json` /
  `inspect --json`; `JSON_FORMAT_VERSION` unchanged. Reuse existing fixtures/helpers.

## Risks

| # | Risk | Mitigation | Test |
|---|---|---|---|
| 1 | Ambiguous category (shared `$type`) | path-segment rule + `unresolved`; ADR-0015 | category resolver unit |
| 2 | Confuse level with `$type` | level only from metadata (FR-045) | resolver unit |
| 3 | Wrong group inheritance | precedence token→group→none; ADR-0014 | inheritance unit |
| 4 | Duplicate issue per descendant | one per declaration | invalid-metadata unit |
| 5 | Second read/traversal | Option C over reused analysis; spies | no-2nd-analysis test |
| 6 | JSON v1 break | separate envelope; byte regression | 003 byte tests |
| 7 | Accidental init change | init untouched; read-only | regression-001 |
| 8 | `$extensions` mutation | read-only; no writer | byte-identical FS test |
| 9 | `unclassified` treated as primitive | never auto-promote (FR-042) | resolver unit |
| 10 | Invalid metadata auto-corrected | preserved, never normalized | invalid-metadata unit |
| 11 | Alias/cycle recomputed | reuse 002 alias data | no-2nd-analysis test |
| 12 | `partial` overloaded | explicit outcome table; warnings→partial only | outcome tests |
| 13 | `complete` without objective def | state by classification+validity, not roster | state reducer unit |
| 14 | Non-deterministic order | canonical/category + 002 token order | determinism test |
| 15 | Scope creep into presets | values out of scope; only structure | spec/scope review |
| 16 | Claimed deep validation | only color deep; depth table | depth tests |

## Scope limits

Only the read-only foundations view + command. No preset values, themes, component tokens, CSS/SCSS,
Style Dictionary, export, MCP/TUI/viewer/Figma, editing, migrations, repair, multiple DS, npm publish,
JSON v1 changes, or code in this phase.

## Future readiness

- **005-presets**: consumes category, effective level, token path, effective type, alias state, trust,
  issues — no values defined here.
- **006-build-export**: consumes the resolved graph (effective type/alias target/trust) without
  re-reading/re-resolving.

## Coverage (internal audit)

- **US 14/14**: US1 categories→FoundationsInspection.categories; US2 levels→resolve-level; US3
  states→category-state; US4 relations→forbidden-direction; US5 missing→reused; US6 cycle→reused;
  US7 forbidden→`foundation-forbidden-dependency`; US8 preservation→read-only+unresolved/unclassified;
  US9 read-only→no-write tests; US10 determinism; US11 no-TTY; US12 preset-ready model; US13
  export-ready model; US14 compat→regression + separate JSON.
- **FR 46/46**: FR-001..004 (model), FR-005..014 (alias rules; reuse 002), FR-015..019 (DTCG/depth),
  FR-020..021 (persistence A / init unchanged), FR-022..024 (states/outcomes/single analysis),
  FR-025..028 (headless/CLI/JSON), FR-029..030 (preservation), FR-031..032 (determinism), FR-033
  (security), FR-034..036 (compat 001/002/003), FR-037..046 (classification) — mapped to
  research/data-model/contracts/ADR above.
- **SC 11/11**: SC-001..011 covered by the test strategy (categories, levels, forbidden, cycles,
  missing, preservation byte-identical, no-write, determinism, no-TTY, regression, preset/export-ready).
- **0 `[NEEDS CLARIFICATION]`**, **0 contradictions**. Category resolution closed via ADR-0015 (no
  blocking finding). Constitution **PASS**.
