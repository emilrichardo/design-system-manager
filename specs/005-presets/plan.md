# Implementation Plan: Design System Presets

**Branch**: `main` | **Date**: 2026-06-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-presets/spec.md`

## Summary

Add a presets capability that ships a deterministic package-bundled catalog of immutable preset
envelopes, exposes read-only list/inspect/plan operations, and applies one preset to
`design-system/tokens/base.tokens.json` through a safe add-only merge. The technical approach reuses
the host resolution, safe reader, DTCG traversal, alias/type limits, foundation category/level
projection, CLI composition, reporter, JSON and exit-code patterns from `001`-`004`, while adding a
preset-specific catalog, validator, planner, single-file atomic writer, verifier, reporters and JSON
contract.

`005` does not create real preset values in this planning phase, does not implement importers, and
does not implement build/export. It creates the architecture that later sources can reuse through:

```text
PresetEnvelope | future importer evidence
→ NormalizedTokenChangeSet
→ ApplicationPlan
→ SafeApplicationEngine
```

## Technical Context

**Language/Version**: TypeScript 5.x strict, ESM/NodeNext, Node `>=22` (validated with Node
`v24.14.0` because the shell Node is `v16.13.0` and lacks `node:util.styleText`).

**Primary Dependencies**: Existing dependencies only (`commander`, `@clack/prompts`, `zod`, `ajv`,
`semver`, `vitest`). No new runtime dependency is planned.

**Storage**: Host Design System files. The only mutable target is
`design-system/tokens/base.tokens.json`; package presets are static JSON assets in the installed npm
package.

**Testing**: Vitest unit/integration/CLI/binary tests plus tarball smoke. Regression baseline:
`938/938` tests in `148` test files.

**Target Platform**: Local-first CLI package on Node >=22, usable from CI without TTY.

**Project Type**: Single-package TypeScript CLI/library with layers `domain → application →
infrastructure → cli`.

**Performance Goals**: Catalog list/inspect O(number of bundled presets); preset validation and
planning O(tokens + aliases + conflicts); application performs one pre-write analysis and one
post-write verification. No quadratic token comparisons.

**Constraints**: DTCG 2025.10 source of truth; no network; no script execution; deterministic JSON;
no prompts; no `--force`; no `--category`; preserve unknown content; no changes to `init`,
`validate`, `inspect`, or `foundations` contracts.

**Scale/Scope**: One preset per operation, package-bundled immutable catalog, partial presets
allowed, no automatic composition, no local/external presets in v1.

## Constitution Check

*GATE: passed before Phase 0 research and re-checked after Phase 1 design.*

| # | Principle | Status | How this plan satisfies it |
|---|---|---|---|
| I | One Design System per project | PASS | one host root, one target DS file |
| II | Local files are source of truth | PASS | writes only the host DTCG token source |
| III | DTCG canonical tokens | PASS | preset token block is DTCG; no proprietary replacement |
| IV | Style Dictionary pipeline | PASS (N/A) | no build/export in 005 |
| V | Framework independence | PASS | domain contracts have no framework |
| VI | Manager is tool, not DS | PASS | bundled presets never silently overwrite host data |
| VII | Visual editing transparency | PASS | preview/plan explains exact file and operations |
| VIII | Validate before generation | PASS | validate before write and verify after write |
| IX | Contracts before implementation | PASS | contracts and ADRs define public behavior first |
| X | Accessibility structural | PASS (N/A) | no components/UI surfaces |
| XI | Pages as validation | PASS (N/A) | no pages/viewer |
| XII | Content optional context | PASS (N/A) | no content ownership |
| XIII | Local-first | PASS | offline package assets and local host files only |
| XIV | Safe modifications | PASS | add-only safe merge, path containment, atomic writer, no force |
| XV | Controlled agent integration | PASS | headless use cases and structured plans/results |
| XVI | Incremental/verifiable | PASS | bounded to presets; explicit out-of-scope list |
| XVII | Portability/no lock-in | PASS | resulting DS remains DTCG and usable without the manager |

No `FAIL`; no constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/005-presets/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── preset-envelope-v1.contract.md
│   ├── preset-catalog-v1.contract.md
│   ├── preset-validation-v1.contract.md
│   ├── preset-conflicts-v1.contract.md
│   ├── preset-application-plan-v1.contract.md
│   ├── preset-apply-result-v1.contract.md
│   ├── preset-command-v1.contract.md
│   └── preset-json-v1.contract.md
└── checklists/requirements.md

docs/adr/
├── 0018-bundled-preset-catalog-and-envelope.md
├── 0019-deterministic-safe-merge-planning.md
├── 0020-atomic-preset-application-and-verification.md
└── 0021-preset-commands-outcomes-and-json.md
```

`tasks.md` is intentionally not created by `/speckit-plan`.

### Source Code (planned, not created in this phase)

```text
presets/
├── catalog.json
└── *.preset.json

src/domain/presets/
├── preset-id.ts
├── preset-version.ts
├── preset-envelope.ts
├── preset-validation.ts
├── token-change-set.ts
├── application-plan.ts
├── preset-conflict.ts
└── preset-result.ts

src/application/presets/
├── preset-ports.ts
├── list-presets.ts
├── inspect-preset.ts
├── validate-preset.ts
├── plan-preset-application.ts
├── apply-preset.ts
└── json/

src/infrastructure/presets/
├── bundled-preset-catalog.ts
├── preset-asset-reader.ts
├── preset-envelope-validator.ts
├── preset-token-analyzer.ts
├── preset-single-file-writer.ts
└── preset-verifier.ts

src/infrastructure/reporter/
├── presets-terminal-reporter.ts
├── presets-json-reporter.ts
└── presets-json-serializer.ts

src/cli/commands/presets.ts
```

**Structure Decision**: Extend the existing single package and layer boundaries. `presets/` at the
package root stores static assets; code remains in `src/`. The implementation will update packaging
so both `dist` and `presets` are included in the tarball. CLI is an adapter only.

## Architecture

```text
BundledPresetCatalog
  → listPresets / inspectPreset
  → validatePresetEnvelope
  → normalizePresetChangeSet
  → analyzeExistingDesignSystem (host)
  → projectFoundations metadata where needed
  → planPresetApplication
  → render preview (human/JSON)
  → applyPreset
       → re-check target safety and optimistic concurrency
       → write new base.tokens.json atomically
       → post-write analyze + verify
       → structured result
```

### Boundaries

| Concern | Layer | Planned responsibility |
|---|---|---|
| Catalog | infrastructure + application port | read static JSON assets without cwd/network |
| Validation | domain/application | envelope, metadata, DTCG, aliases, categories, limits |
| Planning | domain/application | deterministic `NormalizedTokenChangeSet` to `ApplicationPlan` |
| Application | application | orchestrate plan, writer, post-write verification |
| Persistence | infrastructure | single-file temp/write/rename/cleanup/concurrency |
| Verification | application/infrastructure | re-analyze and compare intended operations |
| Presentation | infrastructure reporter + CLI | human/JSON output, streams, exits |

## Reuse Matrix

| Existing capability | Decision | Notes |
|---|---|---|
| host resolution | Reuse | `resolveHostRoot`, same host boundary |
| path containment | Reuse + extend | `assertWithinRoot`; writer adds target re-check |
| managed reader | Reuse for host DS | preset assets use separate catalog reader, no host semantics |
| JSON parser | Reuse pattern | safe parse, sanitized errors |
| `analyzeExistingDesignSystem` | Reuse | host pre-write and post-write analysis |
| DTCG traversal/analyzer | Reuse/adapt | in-memory preset token block analyzed without materializing host files |
| aliases/types/limits | Reuse | same alias graph and `ANALYSIS_LIMITS`; preset-specific conflict codes wrap them |
| foundations registry | Reuse | category ids, type compatibility, level parser/resolution |
| outcomes/exit table | Extend | add preset outcomes without changing existing mappings |
| `commitTransaction` for init | Do not reuse directly | it creates three absent files; presets replace one existing file |
| transactional writer pattern | Reuse pattern | new single-file writer uses same staging/cleanup/verify discipline |
| reporters | Extend pattern | one write in `completed`, deterministic summaries |
| JSON serializers | Reuse shape, not types | new `serializePresetsJsonV1`; no casts into 003/004 unions |
| CLI composition | Extend | `createPresets*Dependencies`, command adapter |
| package assets | Create | package-root `presets/` included by `files` |
| validate/inspect/foundations | No modify | regression must prove byte-stability and behavior stability |

## Decisions

### Catalog and Assets

V1 uses immutable, package-bundled presets. Static JSON assets live under package-root `presets/`,
with `presets/catalog.json` listing ids and file names in canonical order. `package.json.files` must
include both `dist` and `presets`; `npm pack --dry-run` and an installed-tarball smoke test must prove
assets are present and resolvable. Runtime resolution uses `import.meta.url` from the concrete
compiled module that owns the catalog reader (planned location
`dist/infrastructure/presets/bundled-preset-catalog.js`) and resolves `../../../presets/catalog.json`
from that module URL. A unit test must assert the exact URL relation, and a tarball smoke test must
run from outside the repo so `process.cwd()` cannot accidentally satisfy the lookup.

Path states to test separately:

| State | Expected relationship |
|---|---|
| Development source | `presets/` exists at repo/package root, not under `src/` |
| After `tsc` build | `dist/**` exists; `presets/` remains at package root |
| `npm pack` tarball | tarball includes both `package/dist/**` and `package/presets/**` |
| Installed package / `npx` | compiled reader resolves from `package/dist/...` up to `package/presets/` |

### Preset Envelope

The envelope has required fields only:

```json
{
  "id": "neutral-base",
  "name": "Neutral Base",
  "description": "Portable neutral base.",
  "version": "1.0.0",
  "includedCategories": ["color", "spacing"],
  "tokens": {}
}
```

Unknown top-level fields are invalid in v1. `null` is not accepted for required fields. IDs are
lowercase ASCII kebab-case (`[a-z][a-z0-9]*(?:-[a-z0-9]+)*`), case-sensitive after validation, and
collision-checked exactly. `version` is SemVer. `includedCategories` is non-empty, sorted by the 004
canonical category order, unique, and must match the top-level canonical paths contributed by
`tokens`. Empty categories and aliases to tokens outside the preset are invalid.

### Generic Change Model

Introduce a small reusable model, justified by future importers:

```text
TokenChange
TokenChangeSet
ApplicationConflict
ApplicationPlan
ApplicationSummary
```

This generic layer has no `presetId` or `presetName`; it represents changes to DTCG token paths.
Preset-specific wrappers add metadata:

```text
PresetApplicationPlan = preset + changeSet + conflicts + summary
PresetApplyResult     = preset + plan + write/verification state
```

This allows future Figma/URL/image importers to emit `NormalizedTokenChangeSet` without depending on
preset catalog concepts.

### Operation Semantics

| Operation | Meaning in v1 | Writes? |
|---|---|---|
| `create` | path absent; create token or required parent group path needed by preset | apply writes |
| `update` | existing token is equivalent in value/type/alias/level and lacks only `$description` that the preset supplies | apply may write |
| `unchanged` | existing token is structurally equivalent for managed fields; no write needed | no |
| `conflict` | existing content differs in value/type/alias/level, path kind, category, limits or safety | blocks |
| `skip` | explicitly not applied (e.g. preserve existing different `$description`, category not in preset scope) | no |

`delete` is out of scope. `update` is deliberately narrow and non-destructive; it never changes
`$value`, `$type`, alias target, foundation level, unknown `$extensions`, existing `$description`, or
unknown properties. It applies only to token nodes, not groups. If this narrow meaning proves
insufficient, `/speckit-clarify` must revisit it before tasks broaden the contract.

### Equivalence

`unchanged` uses structural equivalence of managed fields after JSON parse:
`$value`, alias target, effective `$type`, and effective foundation level. Object property order does
not matter; JSON numeric forms such as `1` and `1.0` are equivalent after parse. Unknown properties
and unknown `$extensions` are ignored for equivalence but preserved. Existing `$description` is
preserved: same description is equivalent, absent description on a token can be `update`, different
description produces `skip` for the description only if other managed fields match.

Type and level equivalence use the **effective** values from `002`/`004`, not only persisted local
fields. A host token whose effective type or foundation level is inherited from a group is equivalent
to a preset token with the same effective value; v1 does not complete `$type` or foundation metadata on
existing nodes. If the host effective level is `unclassified` and the preset requires `primitive` or
`semantic`, the operation is `conflict` (`preset-level-differs`). Completing missing
`foundation.level` is not an `update` path in v1.

Managed-field policy:

| Field | Preset can create | Can complete | Can replace | Preservation rule |
|---|---:|---:|---:|---|
| `$value` | yes on new token | no | no | existing value preserved; difference conflicts |
| `$type` | yes on new node | no | no | effective match is unchanged; difference conflicts |
| `$description` | yes on new token/group | yes, token only if missing | no | existing description preserved; different description skipped |
| foundation level | yes on new token/group | no | no | effective match is unchanged; missing/different effective level conflicts |
| known Neuraz `$extensions` | yes on new node | no | no | never wholesale-replaced |
| unknown `$extensions` | no | no | no | always preserved |
| unknown properties | no | no | no | always preserved |

Parent groups are first-class changes: creating `color.gray.100` may require `create` changes for
`color` and `color.gray` groups before the token. Existing groups are reused and can contribute
effective `$type`/foundation level. If a token occupies a required parent path, the plan emits
`preset-token-vs-group`; if a group occupies the final token path, it emits `preset-group-vs-token`.

### Conflicts

Stable conflict codes planned:

```text
preset-value-differs
preset-type-differs
preset-level-differs
preset-alias-differs
preset-description-differs
preset-token-vs-group
preset-group-vs-token
preset-envelope-invalid
preset-foundation-metadata-invalid
preset-category-unsupported
preset-path-reserved
preset-reference-external
preset-limit-exceeded
preset-version-incompatible
preset-concurrent-modification
```

Each conflict carries `code`, logical `path`, `severity`, sanitized `message`, `blocksWrite`, and
`proposedAction`. It never exposes stack traces, environment variables, absolute host paths, full
token documents, or arbitrary token values.

### Safe Merge, Atomicity and Concurrency

Apply builds the full new `base.tokens.json` in memory, preserving unrelated parsed content and stable
object insertion order. New top-level category groups are inserted in the canonical 004 order; new
sibling keys within an existing group are appended in preset order after existing keys. Existing
unknown fields and `$extensions` namespaces are copied through unchanged.

Serialization is canonical for writes: `JSON.stringify(document, null, 2) + "\n"`. This means a
successful write preserves data and relative key order, but does **not** promise file-wide
byte-identical whitespace, comments (JSON has none), escape style, or original formatting. Preview,
blocked apply, unchanged apply and write-error before replacement must leave the target file
byte-identical. Successful applies must produce byte-identical output for identical parsed input and
same preset.

The single-file writer uses a temp file in the same directory as `base.tokens.json`, writes complete
UTF-8 content, verifies the temp content, re-checks path containment and symlink state, performs an
optimistic concurrency check against the original bytes/hash immediately before rename, then keeps a
same-directory backup of the original bytes until post-write verification completes. The backup uses a
reserved `.neuraz-ds-backup-*` name, is never loaded from preset data, and is deleted on successful
verification. Failure before replacement cleans temp/backup and preserves the original. A concurrent
change returns `conflict`/`preset-concurrent-modification` with `wrote: false`.

Before rename, the candidate document is validated in memory and by rereading the temp file. If rename
succeeds but post-write verification fails, result is `verification-error`, `wrote: true`, and the
backup is retained with a relative path in the result so the user can recover manually. The writer does
not attempt an implicit second destructive write. The result includes sanitized information for the
user to restore from the retained backup or VCS after inspection.

### Headless Use Cases

```text
listPresets(input, deps)           → PresetListResult
inspectPreset(input, deps)         → PresetInspectionResult
planPresetApplication(input, deps) → PresetApplicationPlanResult
applyPreset(input, deps)           → PresetApplyResult
```

They do not know Commander, ANSI, streams, numeric exit codes, prompts, TTY, or JSON serialization.

### CLI

Use a plural command group:

```bash
neuraz-ds presets list [--json]
neuraz-ds presets inspect <id> [--json]
neuraz-ds presets plan <id> [--json]
neuraz-ds presets apply <id> [--json]
```

`plan` is the explicit preview. `apply` is the explicit write. No interactive prompts, no `--force`,
no `--category`, no `--dry-run` alias in v1.

### JSON and Streams

Presets get their own `PresetsJsonEnvelopeV1` and `PRESETS_JSON_FORMAT_VERSION = "1.0.0"`, independent
of `JsonEnvelopeV1` (003) and `FoundationsJsonEnvelopeV1` (004). Serialization is
`JSON.stringify(envelope, null, 2) + "\n"`. Expected outcomes write exactly one JSON document to
stdout and empty stderr; internal CLI errors write one JSON document to stderr and empty stdout.

### Outcomes and Exit Codes

| Outcome | Applies to | Recoverable | Wrote | Exit | Streams |
|---|---|---:|---:|---:|---|
| `success` | list/inspect/plan | yes | false | 0 | stdout |
| `applied` | apply | yes | true | 0 | stdout |
| `unchanged` | plan/apply | yes | false | 2 | stdout |
| `conflict` | plan/apply | yes | false | 4 | stdout |
| `invalid-preset` | inspect/plan/apply | yes | false | 3 | stdout |
| `not-found` | all | yes | false | 5 | stdout |
| `read-error` | plan/apply | yes | false | 6 | stdout |
| `write-error` | apply | yes | false | 6 | stdout for expected result; stderr empty in JSON mode |
| `verification-error` | apply | yes | true | 7 | stdout |
| `internal-error` | CLI only | no | unknown | 70 | stderr in JSON mode |

`partial` is not reused for presets. Host analysis can be partial, but preset command outcomes report
`read-error`, `conflict`, or `invalid-preset` as appropriate. `not-found` results must include
`resource: "preset" | "design-system"` (or equivalent typed discriminator) so consumers never parse
messages to distinguish an unknown preset id from a missing host Design System.

## Data Model

See [data-model.md](data-model.md). The model defines at least `PresetId`, `PresetVersion`,
`PresetMetadata`, `PresetEnvelope`, `PresetCatalogEntry`, `PresetInspection`, `PresetValidation`,
`PresetOperationKind`, `PresetChange`, `PresetConflict`, `PresetApplicationPlan`,
`PresetApplicationSummary`, `PresetApplyResult`, `PresetCommandOutcome`, plus reusable
`TokenChange`, `TokenChangeSet` and `ApplicationPlan`.

## Contracts

The contracts are split by consumer surface:

- [preset-envelope-v1](contracts/preset-envelope-v1.contract.md)
- [preset-catalog-v1](contracts/preset-catalog-v1.contract.md)
- [preset-validation-v1](contracts/preset-validation-v1.contract.md)
- [preset-conflicts-v1](contracts/preset-conflicts-v1.contract.md)
- [preset-application-plan-v1](contracts/preset-application-plan-v1.contract.md)
- [preset-apply-result-v1](contracts/preset-apply-result-v1.contract.md)
- [preset-command-v1](contracts/preset-command-v1.contract.md)
- [preset-json-v1](contracts/preset-json-v1.contract.md)

## Risk Matrix

| Risk | Mitigation | Planned proof |
|---|---|---|
| assets missing from tarball | package `files` includes `presets`; smoke installed tarball | packaging test |
| duplicate IDs | catalog validation at startup/test | unit catalog test |
| invalid envelope | layered validator | unit validation matrix |
| ambiguous `update` | ADR-0019 narrow definition | planner tests |
| destructive merge | add-only planner + preservation tests | integration bytes tests |
| lost `$extensions` | field-level merge, no wholesale replace | integration metadata test |
| non-deterministic order | canonical category/catalog/order rules | determinism tests |
| partial write | same-dir temp + rename + cleanup | writer failure tests |
| concurrent modification | original hash/bytes re-check | concurrency test |
| verification failure | explicit `verification-error` with `wrote:true` + retained backup | verifier test |
| missing foundation level | not updatable; effective mismatch conflicts | planner tests |
| different description | skip description, never overwrite | planner tests |
| reserialization destructive | canonical writer contract; no byte-identity promise after writes | serialization tests |
| preset vs DS not-found | typed `resource` discriminator | JSON/outcome tests |
| orphan temp | cleanup and safe temp prefix | failure tests |
| symlink escape | path guard + lstat checks | symlink tests |
| external alias | invalid preset/conflict | validator tests |
| reapply writes | `unchanged` short-circuit | idempotency test |
| JSON 003/004 regression | isolated DTO/serializer | byte-stability regression |
| engine coupled to presets | generic change set layer | unit API boundary tests |
| importer scope creep | importers explicitly out of scope | docs/tasks guard |
| build/export scope creep | no Style Dictionary/CSS in 005 | docs/tasks guard |

## Testing Strategy

- **Domain**: ID/version parsing, envelope validation, category matching, equivalence, change set,
  conflicts, summary, deterministic ordering.
- **Application**: list, inspect, plan, apply orchestration, unchanged, blocking conflicts,
  preservation, verification-error, outcome mapping.
- **Infrastructure**: bundled catalog resolution from installed package, asset parse failures,
  single-file atomic writer, cleanup, symlink protection, concurrency, write error.
- **Integration filesystem**: `init → plan`, `init → apply`, reapply unchanged, conflicts,
  unknown metadata/properties preserved, UTF-8, limits, byte/mtime checks.
- **CLI**: `presets list/inspect/plan/apply`, `--json`, no TTY, streams, usage errors, internal error.
- **Packaging**: `npm pack --dry-run`, installed tarball smoke, asset presence.
- **Regression**: 001/002/003/004 unchanged; baseline remains `938/938` plus new tests.

## Traceability

Coverage confirmed from the specification:

- 20/20 user stories mapped.
- 48/48 functional requirements mapped.
- 12/12 success criteria mapped.
- 0 `[NEEDS CLARIFICATION]`.
- 0 material contradictions after resolving `update` via ADR-0019.

| US | FR | SC | Research | Model/contract | ADR | Planned tests |
|---|---|---|---|---|---|---|
| US1-US2 | FR-001..008 | SC-001,002 | catalog/envelope | catalog, envelope | 0018 | catalog + packaging |
| US3, US6, US16, US17 | FR-013..021 | SC-003,004,008 | planning/update/equivalence | plan/conflicts | 0019 | planner/conflict |
| US4, US5, US7, US8, US18, US20 | FR-022..031,040..043 | SC-005..009 | atomicity/concurrency | apply result | 0020 | writer/integration |
| US10-US14 | FR-032..039 | SC-010,011 | CLI/JSON/outcomes | command/json | 0021 | CLI/JSON |
| US9, US15, US19 | FR-044..048 | SC-012 | compatibility/future importers | all | 0018..0021 | regression/docs |

## Compatibility

- **001**: `init` remains unchanged; no automatic preset application; no changes to generated initial
  bytes, prompts or exit codes.
- **002**: host resolution, reader, parser, DTCG traversal, alias graph, limits and issues are reused;
  no parallel DTCG validator.
- **003**: `validate --json` and `inspect --json` remain byte-stable; no changes to `JsonEnvelopeV1`.
- **004**: category registry, level metadata, type compatibility and outcomes are consumed; no changes
  to `foundations` human/JSON output.
- **006**: presets prepare concrete DTCG values for later build/export; no CSS/SCSS/Style Dictionary
  work in 005.
- **Future importers**: generic `TokenChangeSet`/`ApplicationPlan` prevents hard-coupling safe merge to
  presets while keeping importers out of scope.

## Complexity Tracking

No constitutional violations. The generic change layer is accepted because it has a concrete reuse
boundary for planned importers and still remains small; it is not a broad plugin/import framework.
