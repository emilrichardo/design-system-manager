# Tasks: 005-presets

**Input**: Design documents from `specs/005-presets/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`, `checklists/requirements.md`, ADRs `docs/adr/0018`-`0021`
**Scope**: Generate the implementation task plan only. Do not implement code, tests, fixtures, real presets, CLI changes, package changes, README changes, or `006-build-export` during this phase.
**Baseline**: base commit `eabd4f0`; expected pre-implementation baseline `938/938` tests across `148` test files with `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` on Node `24.14.0`.

## Format

Every implementation task uses:

```text
- [ ] T### [P?] [US#] Description concrete in `path`
```

`[P]` appears only when the task modifies files that are independent from other tasks in the same checkpoint and do not depend on signatures still being created.

## Phase 1: Setup y contratos internos

### Checkpoint A: Modelos del dominio y catalogo

**Goal**: Define pure domain contracts and the reusable change model before any catalog, filesystem, reporter, JSON, or CLI code depends on them.

**Independent test**: domain tests can instantiate preset metadata, validation results, conflicts, generic token changes, and preset-specific wrappers without filesystem, Commander, ANSI, streams, numeric exit codes, JSON serializers, prompts, or bundled assets.

- [X] T001 [US10] Add failing architecture tests proving preset domain modules expose no filesystem, CLI, JSON serializer, ANSI, streams, prompts, or numeric exit dependencies in `tests/unit/presets/architecture.test.ts`.
- [X] T002 [P] [US1] Add failing unit tests for `PresetId`, exact catalog uniqueness, lowercase ASCII kebab-case, case sensitivity, and rejected collisions in `tests/unit/presets/preset-id.test.ts`.
- [X] T003 [P] [US1] Add failing unit tests for `PresetVersion` SemVer parsing and invalid version rejection in `tests/unit/presets/preset-version.test.ts`.
- [X] T004 [P] [US2] Add failing unit tests for immutable `PresetMetadata`, `PresetEnvelope`, `PresetCatalogEntry`, `PresetInspection`, and `PresetValidation` DTO invariants and null policy in `tests/unit/presets/preset-models.test.ts`.
- [X] T005 [P] [US10] Add failing unit tests for source-agnostic `TokenChange`, `TokenChangeSet`, `ApplicationConflict`, `ApplicationPlan`, and `ApplicationSummary` with no `presetId`, `presetName`, catalog, CLI, reporter, JSON, Figma, URL, image, evidence, confidence, AI, or visual-review fields in `tests/unit/changes/token-change-set.test.ts`.
- [X] T006 [US10] Implement pure preset id and version value helpers in `src/domain/presets/preset-id.ts` and `src/domain/presets/preset-version.ts`.
- [X] T007 [US2] Implement pure preset envelope, metadata, catalog entry, inspection, and validation types in `src/domain/presets/preset-envelope.ts` and `src/domain/presets/preset-validation.ts`.
- [X] T008 [US10] Implement the reusable source-agnostic change model in `src/domain/changes/token-change.ts`, `src/domain/changes/application-conflict.ts`, `src/domain/changes/application-plan.ts`, and `src/domain/changes/index.ts`.
- [X] T009 [US3] Implement preset-specific wrappers `PresetApplicationPlan`, `PresetApplicationSummary`, and `PresetApplyResult` in `src/domain/presets/preset-application-plan.ts` and `src/domain/presets/preset-apply-result.ts`.
- [X] T010 [US10] Export the new pure domain modules from `src/domain/presets/index.ts` and `src/domain/index.ts`.
- [X] T011 [US10] Add failing headless port boundary tests for list, inspect, validate, plan, and apply dependencies in `tests/unit/presets/preset-ports.test.ts`.
- [X] T012 [US10] Define application-layer preset ports and result types without filesystem implementation details in `src/application/presets/preset-ports.ts` and export them from `src/application/presets/index.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted preset/changes unit tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: add preset domain contracts`

## Phase 2: Validacion del preset

### Checkpoint B: Envelope, metadata y catalogo empaquetado

**Goal**: Introduce inert package-bundled preset assets and a deterministic catalog reader contract without using `process.cwd()`, network, environment variables, or executable preset content.

**Independent test**: catalog list and inspect can read immutable package assets in deterministic order from development, `dist`, dry-run tarball, and installed tarball contexts; missing/corrupt assets fail safely.

- [ ] T013 [P] [US1] Add failing catalog asset tests for `presets/catalog.json` shape, deterministic order, duplicate id rejection, envelope id mismatch, missing asset, corrupt asset, invalid file path, and no absolute asset exposure in `tests/unit/presets/bundled-preset-catalog.test.ts`.
- [ ] T014 [P] [US15] Add failing tests that `includedCategories` uses only the 9 canonical `004` categories, is unique, non-empty, and sorted by canonical category order in `tests/unit/presets/preset-categories.test.ts`.
- [ ] T015 [P] [US1] Add failing package manifest tests proving `package.json.files` includes `dist` and `presets`, and still excludes `src`, `tests`, `specs`, `.agents`, temporaries, and backups in `tests/unit/package-manifest.test.ts`.
- [ ] T016 [US1] Create inert package asset structure `presets/catalog.json` and one minimal approved preset envelope in `presets/neutral-base.preset.json` containing only values needed for v1 foundation coverage; do not add brand palettes, themes, dark mode, component tokens, proprietary fonts, remote URLs, scripts, dependencies, CSS, SCSS, Style Dictionary outputs, or executable code.
- [ ] T017 [US1] Update `package.json` `files` to include `presets` alongside `dist` and no source/test/spec directories.
- [ ] T018 [US1] Implement package-relative catalog resolution with `import.meta.url` in `src/infrastructure/presets/bundled-preset-catalog.ts`; never resolve assets from `process.cwd()`.
- [ ] T019 [US1] Implement inert asset reading and safe parse for `presets/catalog.json` and referenced envelopes in `src/infrastructure/presets/preset-asset-reader.ts`.
- [ ] T020 [US1] Implement catalog validation for unique ids, deterministic order, id/file matching, relative file names, missing assets, corrupt assets, and no executable code in `src/infrastructure/presets/bundled-preset-catalog.ts`.
- [ ] T021 [US1] Add list projection from validated envelopes to `PresetCatalogEntry` without exposing absolute paths in `src/application/presets/list-presets.ts`.
- [ ] T022 [US2] Add inspect projection from validated envelopes to `PresetInspection` token summaries in `src/application/presets/inspect-preset.ts`.
- [ ] T023 [US1] Add development, `dist`, `npm pack --dry-run --json`, real tarball, and installed-package asset resolution tests in `tests/integration/presets/presets-packaging.test.ts`.
- [ ] T024 [US1] Add tests proving list/inspect work offline and do not reach network, environment variables, or host cwd in `tests/integration/presets/catalog-offline.test.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted catalog/package tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: add bundled preset catalog`

### Checkpoint C: Validacion DTCG/foundations en memoria

**Goal**: Validate preset envelopes and token blocks in memory by reusing `002` DTCG traversal and `004` foundations semantics, with no temporary host project and no parallel validator.

**Independent test**: invalid envelope, metadata, DTCG, aliases, categories, foundation metadata, unsupported content, and limits produce sanitized validation results and block write eligibility.

- [ ] T025 [P] [US2] Add failing validation tests for required fields, unknown top-level fields, nulls, invalid id/name/description/version, duplicate ids, duplicate categories, unknown categories, and empty tokens in `tests/unit/presets/preset-envelope-validator.test.ts`.
- [ ] T026 [P] [US15] Add failing validation tests for declared category without tokens, tokens under undeclared category, unsupported category, reserved path, component tokens, themes, dark/light variants, scripts, URLs, dependencies, CSS, SCSS, and executable-like content in `tests/unit/presets/preset-content-rules.test.ts`.
- [ ] T027 [P] [US9] Add failing in-memory DTCG/foundations validation tests for invalid DTCG structure, invalid type, unsupported type/category pairing, invalid Neuraz foundation metadata, missing/invalid inherited level, alias missing, alias cycle, external alias, and traversal limits in `tests/unit/presets/preset-dtcg-validation.test.ts`.
- [ ] T028 [US2] Implement envelope and metadata validation in `src/infrastructure/presets/preset-envelope-validator.ts`.
- [ ] T029 [US9] Implement in-memory preset token analysis that reuses the `002` traversal/type/alias/limit functions and `004` foundation category/level projection in `src/infrastructure/presets/preset-token-analyzer.ts`.
- [ ] T030 [US15] Implement declared-category reconciliation between `includedCategories` and analyzed token paths in `src/application/presets/validate-preset.ts`.
- [ ] T031 [US2] Map validation failures to safe preset conflicts with stable codes and no stacks, absolute paths, environment variables, arbitrary token values, or full token documents in `src/application/presets/validate-preset.ts`.
- [ ] T032 [US2] Wire list/inspect to surface `invalid-preset` safely for broken bundled assets without crashing in `src/application/presets/list-presets.ts` and `src/application/presets/inspect-preset.ts`.
- [ ] T033 [US9] Add regression tests proving preset validation reuses 002/004 behavior and does not materialize temporary projects in `tests/integration/presets/preset-validation-reuse.test.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted validation tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: validate preset envelopes in memory`

## Phase 3: Planificacion de cambios

### Checkpoint D: Modelo reusable de TokenChangeSet

**Goal**: Normalize candidate token/group changes through a reusable model that can later be produced by other importers without implementing those importers now.

**Independent test**: a generic `TokenChangeSet` represents DTCG create/update/unchanged/conflict/skip changes independent of preset catalog metadata.

- [ ] T034 [P] [US10] Add failing tests for deterministic ordering of `TokenChangeSet` by canonical category order then preset insertion order in `tests/unit/changes/token-change-order.test.ts`.
- [ ] T035 [P] [US10] Add failing tests proving the generic change model can represent DTCG changes produced by an arbitrary in-memory source with no preset fields in `tests/unit/changes/source-agnostic-plan.test.ts`.
- [ ] T036 [P] [US3] Add failing summary tests for create/update/unchanged/conflict/skip/total/blockingConflicts/wouldWrite counts in `tests/unit/changes/application-summary.test.ts`.
- [ ] T037 [US10] Implement change-set construction, canonical ordering, and source-agnostic invariants in `src/domain/changes/token-change-set.ts`.
- [ ] T038 [US3] Implement generic application summary derivation in `src/domain/changes/application-summary.ts`.
- [ ] T039 [US3] Implement generic `ApplicationPlan` construction and writable/blocking rules in `src/domain/changes/application-plan.ts`.
- [ ] T040 [US3] Add preset wrapper mapping from validated preset token summaries to generic token changes in `src/application/presets/normalize-preset-change-set.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted changes tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: add reusable token change planning model`

### Checkpoint E: Equivalencia, diff y conflictos

**Goal**: Build deterministic preview semantics before any write path exists.

**Independent test**: planning classifies every preset contribution against a host document as create, narrow update, unchanged, conflict, or skip; one blocking conflict makes the plan non-writable and no filesystem writes are possible.

- [ ] T041 [P] [US17] Add failing equivalence tests for values, numbers (`1` vs `1.0`), arrays, objects, colors, composites, aliases, `$type`, effective inherited type, foundation level, inherited level, `$description`, unknown `$extensions`, unknown properties, and key order in `tests/unit/presets/preset-equivalence.test.ts`.
- [ ] T042 [P] [US16] Add failing diff tests for `create` on missing groups and missing tokens, including `nodeKind: "group" | "token"` and deterministic intermediate group ordering in `tests/unit/presets/preset-diff-create.test.ts`.
- [ ] T043 [P] [US17] Add failing diff tests for `update` limited to completing missing `$description` on an otherwise equivalent existing token, and never updating groups, `$value`, `$type`, aliases, foundation level, `$extensions`, or unknown properties in `tests/unit/presets/preset-diff-update.test.ts`.
- [ ] T044 [P] [US17] Add failing diff tests for `unchanged` managed-content equivalence and `skip` for explicit preservation rules such as incompatible existing `$description` when other managed fields match in `tests/unit/presets/preset-diff-unchanged-skip.test.ts`.
- [ ] T045 [P] [US6] Add failing conflict tests for stable codes: value, type, alias, foundation level, description incompatible, token-vs-group, group-vs-token, invalid foundation metadata, invalid preset, undeclared category, unsupported category, reserved path, external alias, limit, version, and concurrent modification in `tests/unit/presets/preset-conflicts.test.ts`.
- [ ] T046 [US17] Implement structural managed-field equivalence in `src/domain/changes/equivalence.ts`.
- [ ] T047 [US16] Implement deterministic diff planning for create/unchanged/update/skip/conflict in `src/application/presets/plan-preset-diff.ts`.
- [ ] T048 [US6] Implement stable preset conflict construction with `code`, logical `path`, `severity`, sanitized `message`, `blocksWrite`, and `proposedAction` in `src/domain/presets/preset-conflict.ts`.
- [ ] T049 [US6] Implement blocking rules so any blocking conflict cancels all writes and produces zero applied changes in `src/domain/changes/application-plan.ts`.
- [ ] T050 [US12] Add deterministic plan tests that identical inputs produce deeply equal plans and no comparison mutates the host document in `tests/unit/presets/preset-plan-determinism.test.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted equivalence/diff/conflict tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: plan preset changes deterministically`

## Phase 4: Preview y presentacion

### Checkpoint F: Casos de uso list/inspect/plan

**Goal**: Deliver the MVP read-only flow: list presets, inspect a preset, and generate a deterministic plan against the current host without writes.

**Independent test**: a programmatic consumer can run list, inspect, and plan with fake dependencies; the target file bytes, mtime, temporaries, backups, and host files remain unchanged.

- [ ] T051 [P] [US1] Add headless use-case tests for `listPresets` deterministic catalog order, offline behavior, no writes, and safe invalid catalog results in `tests/unit/presets/list-presets.test.ts`.
- [ ] T052 [P] [US2] Add headless use-case tests for `inspectPreset` valid id, unknown id `not-found`, metadata, included categories, token summaries, validation, and no writes in `tests/unit/presets/inspect-preset.test.ts`.
- [ ] T053 [P] [US3] Add headless use-case tests for `planPresetApplication` create/update/unchanged/conflict/skip summary, typed `notFoundResource`, read-error, invalid-preset, no write, no temp project, and no mtime change in `tests/unit/presets/plan-preset-application.test.ts`.
- [ ] T054 [US1] Finish `listPresets` orchestration and result shape in `src/application/presets/list-presets.ts`.
- [ ] T055 [US2] Finish `inspectPreset` orchestration and token summary projection in `src/application/presets/inspect-preset.ts`.
- [ ] T056 [US3] Implement `planPresetApplication` orchestration using preset validation, host analysis, diff planning, conflicts, ordering, and summary in `src/application/presets/plan-preset-application.ts`.
- [ ] T057 [US3] Add host missing, target unreadable, invalid UTF-8, invalid JSON, and limits mapping for planning in `src/application/presets/plan-preset-application.ts`.
- [ ] T058 [US12] Add integration tests proving list/inspect/plan are deterministic, read-only, and byte-identical on repeated runs in `tests/integration/presets/presets-readonly-flow.test.ts`.

**MVP checkpoint**: list -> inspect -> read-only plan is demonstrable here. Apply is not part of MVP.
**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted read-only use-case tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: add read-only preset use cases`

### Checkpoint G: Reporters humanos y JSON

**Goal**: Present list, inspect, plan, and future apply results deterministically for humans and JSON without changing 003/004 contracts.

**Independent test**: expected outcomes write one deterministic result to stdout and empty stderr; JSON internal errors write one safe envelope to stderr and empty stdout with exit 70; 003/004 JSON bytes remain unchanged.

- [ ] T059 [P] [US14] Add failing human reporter tests for list/inspect/plan/apply summaries, stable order, no required colors, no prompts, captured stdout, no TTY dependency, and safe relative target display in `tests/unit/presets/presets-terminal-reporter.test.ts`.
- [ ] T060 [P] [US11] Add failing JSON DTO invariant tests for `PresetsJsonEnvelopeV1`, `preset-list`, `preset-inspect`, `preset-plan`, `preset-apply`, null policy, key order, deterministic serializer, and final newline in `tests/unit/presets/presets-json-dto.test.ts`.
- [ ] T061 [P] [US11] Add failing JSON mapper tests for all preset outcomes, conflicts, summary, `wrote`, `verification`, relative backup, typed `notFoundResource`, read-error vs write-error, logical target, and no full token values in `tests/unit/presets/presets-json-mappers.test.ts`.
- [ ] T062 [P] [US11] Add regression tests proving `JsonEnvelopeV1` and `FoundationsJsonEnvelopeV1` DTOs, mappers, serializers, streams, and byte outputs are unchanged in `tests/integration/presets/json-regression-003-004.test.ts`.
- [ ] T063 [US14] Implement `PresetsTerminalReporter` for list/inspect/plan/apply in `src/infrastructure/reporter/presets-terminal-reporter.ts`.
- [ ] T064 [US11] Implement preset JSON DTOs, format version, mappers, and internal-error mapper in `src/application/presets/json/dto.ts`, `src/application/presets/json/format-version.ts`, `src/application/presets/json/map-presets.ts`, and `src/application/presets/json/map-internal-error.ts`.
- [ ] T065 [US11] Implement preset JSON serializer and reporter in `src/infrastructure/reporter/presets-json-serializer.ts` and `src/infrastructure/reporter/presets-json-reporter.ts`.
- [ ] T066 [US11] Add outcome-to-exit mapping tests for success, applied, unchanged, invalid-preset, conflict, not-found, read-error, write-error, verification-error, and internal-error in `tests/unit/presets/preset-exit-codes.test.ts`.
- [ ] T067 [US11] Extend CLI exit-code helpers additively for preset outcomes without modifying 001-004 outcome tables in `src/cli/exit-codes.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted reporter/JSON/exit tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: add preset presentation contracts`

## Phase 5: Aplicacion segura

### Checkpoint H: Merge y documento candidato

**Goal**: Build the complete candidate `base.tokens.json` in memory from a writable plan while preserving unmanaged content and producing no filesystem side effects.

**Independent test**: candidate generation creates only authorized groups/tokens or narrow description updates, preserves everything else semantically, and produces byte identity whenever no write should occur.

- [ ] T068 [P] [US18] Add failing candidate merge tests for preserving tokens, groups, categories not included, unknown `$extensions`, unknown properties, existing descriptions, unmanaged metadata, and existing order where possible in `tests/unit/presets/preset-candidate-document.test.ts`.
- [ ] T069 [P] [US16] Add failing candidate merge tests for deterministic inserted groups/tokens, canonical category insertion, preset insertion order, group/token distinction, and no wholesale document replacement in `tests/unit/presets/preset-candidate-insert-order.test.ts`.
- [ ] T070 [P] [US17] Add failing candidate tests proving value/type/alias/foundation-level replacement, delete operations, config/manifest writes, extension wholesale replacement, destructive normalization, and arbitrary reordering never occur in `tests/unit/presets/preset-candidate-safety.test.ts`.
- [ ] T071 [US4] Implement in-memory candidate document builder in `src/application/presets/build-preset-candidate-document.ts`.
- [ ] T072 [US7] Implement preservation helpers for object copy-through, managed field insertion, `$extensions` merge rules, and deterministic JSON serialization in `src/application/presets/preserve-host-document.ts`.
- [ ] T073 [US12] Use approved write serialization `JSON.stringify(document, null, 2) + "\n"` for successful writes in `src/infrastructure/serialization/json.ts` or a preset-specific adapter if the existing serializer cannot be reused.
- [ ] T074 [US3] Add byte-identity tests for plan, unchanged apply, blocking conflict, read-error, write-error before rename, and errors before replacement in `tests/integration/presets/no-write-byte-identity.test.ts`.
- [ ] T075 [US4] Add integration tests distinguishing semantic preservation after successful write from byte identity for no-write paths in `tests/integration/presets/preset-preservation.test.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted candidate/preservation tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: build preset candidate documents`

### Checkpoint I: Writer atomico, concurrencia y verificacion

**Goal**: Apply a writable plan through an atomic single-file writer, optimistic concurrency checks, pre-write candidate verification, post-write verification, backup handling, and idempotency.

**Independent test**: success writes exactly one target, failure before replacement preserves original and cleans debris, concurrent modifications block with zero writes, verification-error reports `wrote:true` and retains a relative backup without automatic rollback.

- [ ] T076 [P] [US8] Add failing reusable single-file writer tests for success, temp create error, write error, temp verify error, before-rename error, rename error, cleanup error, no orphan temps, permissions, flush/fsync decision, and same-directory temp in `tests/unit/fs/single-file-atomic-writer.test.ts`.
- [ ] T077 [P] [US8] Add failing writer path-safety tests for target contained in host, path escape, target symlink, parent symlink, directory target, file deleted concurrently, and expected target recheck before rename in `tests/unit/fs/single-file-writer-safety.test.ts`.
- [ ] T078 [P] [US8] Add failing concurrency tests comparing original bytes/hash immediately before replacement, not only mtime, and returning conflict `preset-concurrent-modification` with `wrote:false` and zero target writes in `tests/integration/presets/preset-concurrency.test.ts`.
- [ ] T079 [P] [US4] Add failing pre-write verification tests for validating the candidate in memory, DTCG validity, intended tokens present, and invalid candidate blocked before rename in `tests/unit/presets/preset-prewrite-verifier.test.ts`.
- [ ] T080 [P] [US9] Add failing post-write verification tests for rereading target, re-analyzing, contributed tokens present, no new structural errors, preservation checks, and explicit phase separation from pre-write analysis in `tests/unit/presets/preset-postwrite-verifier.test.ts`.
- [ ] T081 [P] [US20] Add failing backup and verification-error tests for retained relative backup, `wrote:true`, no destructive auto rollback, no absolute paths, no overwrite of later changes, cleanup backups on success, and exit 7 projection in `tests/integration/presets/preset-verification-error.test.ts`.
- [ ] T082 [P] [US5] Add failing idempotency tests for first apply writing, second apply unchanged, zero writes, same bytes, same mtime, no temp, no backup, outcome `unchanged`, exit 2, stable summary, and no post-write verification when no write is needed unless contract requires it in `tests/integration/presets/preset-idempotency.test.ts`.
- [ ] T083 [US8] Implement reusable single-file atomic writer port and node adapter in `src/application/presets/single-file-writer-port.ts` and `src/infrastructure/fs/single-file-atomic-writer.ts`; keep it free of preset, DTCG, CLI, JSON, and reporter concepts.
- [ ] T084 [US8] Implement containment, symlink, directory, temp naming, complete write, flush/fsync decision, rename, cleanup, and failure classification in `src/infrastructure/fs/single-file-atomic-writer.ts`.
- [ ] T085 [US8] Implement optimistic concurrency byte/hash recheck and concurrent modification conflict conversion in `src/application/presets/apply-preset.ts`.
- [ ] T086 [US4] Implement pre-write candidate verification in `src/application/presets/verify-preset-candidate.ts`.
- [ ] T087 [US9] Implement post-write verification in `src/application/presets/verify-preset-application.ts`.
- [ ] T088 [US20] Implement backup creation, success cleanup, verification-error retention with relative path, and recoverable result mapping in `src/infrastructure/fs/single-file-atomic-writer.ts` and `src/application/presets/apply-preset.ts`.
- [ ] T089 [US4] Implement `applyPreset` orchestration that recalculates validation/plan internally, refuses blocked/unchanged writes, writes only `design-system/tokens/base.tokens.json`, and returns structured `PresetApplyResult` in `src/application/presets/apply-preset.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted writer/apply/verification tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: apply presets atomically`

## Phase 6: CLI e integracion

### Checkpoint J: Comandos presets

**Goal**: Register the non-interactive `neuraz-ds presets` CLI group and map headless outcomes to human/JSON output, streams, and exit codes.

**Independent test**: all subcommands behave correctly with fake dependencies and closed stdin; usage errors remain Commander errors and expected outcomes remain stdout results.

- [ ] T090 [P] [US13] Add failing CLI command tests for `presets --help`, `presets list --help`, `presets inspect --help`, `presets plan --help`, `presets apply --help`, missing id, extra args, unknown options, local `--json`, rejected global `--json presets`, no prompts, no TTY, and closed stdin in `tests/cli/presets-commands.test.ts`.
- [ ] T091 [P] [US11] Add failing CLI JSON stream tests for one stdout JSON and empty stderr for expected list/inspect/plan/apply outcomes, plus stdout empty/stderr safe JSON/exit 70 for internal errors in `tests/cli/presets-json-commands.test.ts`.
- [ ] T092 [P] [US13] Add failing CLI outcome/exit matrix tests discriminated by command for success/applied 0, unchanged 2, invalid-preset 3, conflict 4, preset not-found 5, design-system not-found 5, read-error 6, write-error 6, verification-error 7, and internal-error 70 in `tests/cli/presets-exit-matrix.test.ts`.
- [ ] T093 [US13] Implement `src/cli/commands/presets.ts` with subcommands `list`, `inspect <id>`, `plan <id>`, and `apply <id>`; accept only local `--json`; do not add `--force`, `--category`, or `--dry-run`.
- [ ] T094 [US13] Register the plural `presets` command group in `src/cli/program.ts` without changing `init`, `validate`, `inspect`, or `foundations`.
- [ ] T095 [US13] Add preset dependency composition for human and JSON modes in `src/cli/composition.ts` and `src/cli/index.ts`.
- [ ] T096 [US11] Add preset JSON internal-error mapping through CLI error handling in `src/cli/program.ts` and `src/cli/json-error.ts`, without casting to 003/004 JSON unions.
- [ ] T097 [US13] Ensure apply recalculates the plan internally and never depends on prior `plan` command output in `src/cli/commands/presets.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted CLI command tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: add presets cli commands`

### Checkpoint K: Integracion filesystem y procesos hijos

**Goal**: Verify the complete filesystem and compiled-binary behavior across host states, fixtures, stdout/stderr, JSON, exits, bytes, mtimes, temps, backups, and installed package execution.

**Independent test**: the compiled `neuraz-ds` binary behaves deterministically from a temporary project and from an installed tarball, with no TTY and no network.

- [ ] T098 [P] [US3] Add filesystem integration tests for project without Design System, initialized project, preset nonexistent, preset invalid, preset valid, preset partial, read-error, invalid UTF-8, and limits in `tests/integration/presets/preset-filesystem-states.test.ts`.
- [ ] T099 [P] [US16] Add filesystem integration tests for create, create with intermediate groups, unchanged, narrow `$description` update, categories not included, unknown metadata, unknown properties, paths with spaces, and Unicode in `tests/integration/presets/preset-filesystem-diff.test.ts`.
- [ ] T100 [P] [US6] Add filesystem integration tests for incompatible description, value, type, foundation level, token-vs-group, group-vs-token, external alias, target symlink, concurrent change, and blocking conflict zero writes in `tests/integration/presets/preset-filesystem-conflicts.test.ts`.
- [ ] T101 [P] [US20] Add filesystem integration tests for write error, verification error, retained backup, second application, bytes, mtime, temporaries, backups, stdout, stderr, JSON, operations, conflicts, summary, and `wrote` in `tests/integration/presets/preset-filesystem-apply.test.ts`.
- [ ] T102 [P] [US13] Add child-process tests for `neuraz-ds presets list`, `list --json`, `inspect <id>`, `inspect <id> --json`, `plan <id>`, `plan <id> --json`, `apply <id>`, and `apply <id> --json` with no TTY in `tests/cli/presets-binary.test.ts`.
- [ ] T103 [P] [US13] Add installed-package child-process tests for the same command matrix from an `npm pack` tarball installation in `tests/integration/presets/presets-installed-tarball.test.ts`.
- [ ] T104 [US13] Fix any integration-only composition gaps in `src/cli/composition.ts`, `src/infrastructure/presets/bundled-preset-catalog.ts`, and `src/infrastructure/fs/single-file-atomic-writer.ts` exposed by the filesystem and child-process tests, without broadening scope.
- [ ] T105 [US12] Add deterministic snapshot-free assertions that repeated child-process commands produce parseable JSON and stable human output without timestamps, UUIDs, locale, env influence, mandatory colors, or TTY dependence in `tests/cli/presets-binary.test.ts`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, targeted filesystem/binary tests, accumulated `npm test`, `npm run build`.
**Recommended checkpoint commit**: `feat: verify presets end to end`

## Phase 7: Regresion y cierre

### Checkpoint L: Packaging, smoke, documentacion y auditoria

**Goal**: Prove packaging, public documentation, compatibility with closed features, and final audit before the feature can be marked ready for `/speckit-implement` closure.

**Independent test**: `npm pack --dry-run --json`, `npm pack`, installed tarball smoke, and full regression show 001-004 unchanged and 005 complete without starting 006.

- [ ] T106 [P] [US1] Add packaging tests for `npm pack --dry-run --json` and `npm pack` proving tarball includes `dist/`, `presets/`, `package.json`, and necessary public documentation, and excludes `src/`, `tests/`, `specs/`, `.agents/`, temporaries, and test backups in `tests/integration/presets/npm-pack.test.ts`.
- [ ] T107 [P] [US13] Add tarball smoke tests for `neuraz-ds --help`, `neuraz-ds presets --help`, `presets list`, `presets inspect <id>`, `presets plan <id>`, `presets apply <id>`, and required JSON variants from a temporary installed project, then clean tarballs and temporary projects in `tests/integration/presets/tarball-smoke.test.ts`.
- [ ] T108 [P] [US9] Add regression tests proving `init` remains unchanged: three files, initial bytes, prompts, idempotent second run exit 2, and no automatic preset application in `tests/integration/presets/regression-001-init.test.ts`.
- [ ] T109 [P] [US9] Add regression tests proving `validate` and `inspect` remain unchanged for outcomes, aliases, types, limits, and reused analysis after presets in `tests/integration/presets/regression-002-validate-inspect.test.ts`.
- [ ] T110 [P] [US11] Add byte-identity regression tests for `neuraz-ds validate --json` and `neuraz-ds inspect --json` in `tests/integration/presets/regression-003-json.test.ts`.
- [ ] T111 [P] [US9] Add regression tests proving `foundations` human and `foundations --json` remain unchanged, categories/levels still use 004 semantics, and successful preset apply is observable through foundations in `tests/integration/presets/regression-004-foundations.test.ts`.
- [ ] T112 [US14] Update public README documentation for implemented preset commands, catalog behavior, plan vs apply, safe merge, outcomes/exits, backup, and verification-error in `README.md`.
- [ ] T113 [US19] Update `specs/005-presets/quickstart.md` only if implementation behavior needs post-implementation examples for unsupported `--category`, no `--force`, no `--dry-run`, no themes, no component tokens, no local/external presets, and no `006` build/export availability.
- [ ] T114 [US19] Create final audit proving `20/20` user stories, `48/48` FR, `12/12` SC, all tasks completed, `17/17` Constitution PASS, `0 CRITICAL`, `0 HIGH`, `0 MEDIUM`, `0 contradicciones`, and `0 NEEDS CLARIFICATION` in `specs/005-presets/audit.md`.
- [ ] T115 [US12] Run and record final gates for implementation closure: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm pack --dry-run --json`, tarball smoke, diff review, `git diff --check`, and no `006` scope in `specs/005-presets/audit.md`.

**Checkpoint gate**: `npm run typecheck`, `npm run lint`, full `npm test`, `npm run build`, `npm pack --dry-run --json`, `npm pack`, installed tarball smoke, `git diff --check`.
**Recommended checkpoint commit**: `docs: close preset implementation audit`

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 / Checkpoint A**: starts first; creates pure domain and port contracts.
- **Phase 2 / Checkpoints B-C**: depends on A; catalog assets require preset envelope/domain contracts, and validation depends on catalog/envelope parsing.
- **Phase 3 / Checkpoints D-E**: depends on C; normalized changes require validated preset token summaries, and diff/conflicts require the generic change model.
- **Phase 4 / Checkpoints F-G**: depends on E; read-only use cases require deterministic planning, and reporters/JSON require stable result shapes.
- **Phase 5 / Checkpoints H-I**: depends on F; writing starts only after read-only planning is complete, then candidate document precedes writer/concurrency/verification.
- **Phase 6 / Checkpoints J-K**: depends on G and I; CLI is an adapter over headless use cases and integration verifies compiled/installed behavior.
- **Phase 7 / Checkpoint L**: depends on all prior checkpoints; packaging, regression, documentation, and audit close the feature.

### Required Order

```text
modelos y contratos internos
-> catalogo
-> carga y validacion
-> cambios normalizados
-> equivalencia
-> diff
-> conflictos
-> casos de uso read-only
-> presentacion humana
-> JSON
-> documento candidato
-> escritura atomica
-> concurrencia
-> verificacion posterior
-> CLI
-> integracion
-> empaquetado
-> regresion
-> auditoria
```

### MVP

The MVP is Checkpoints A-F: **US1**, **US2**, and **US3** only.

It demonstrates:

```text
listar presets
-> inspeccionar un preset
-> generar un plan read-only
```

Apply is intentionally outside the MVP because it requires candidate document building, atomic writer, concurrency, backups, and verification.

### Parallel Opportunities

- T002-T005 can run in parallel after T001 because they cover independent domain test files.
- T013-T015 can run in parallel after Checkpoint A because they cover independent catalog/package tests.
- T025-T027 can run in parallel after Checkpoint B because they cover independent validation matrices.
- T034-T036 can run in parallel after Checkpoint C because they test independent pieces of the generic model.
- T041-T045 can run in parallel after Checkpoint D because they test distinct equivalence/diff/conflict files.
- T051-T053 can run in parallel after Checkpoint E because list, inspect, and plan use-case tests use separate files and fake dependencies.
- T059-T062 can run in parallel after Checkpoint F because human reporter, JSON DTO, JSON mappers, and JSON regressions are separate files.
- T068-T070 can run in parallel after Checkpoint G because candidate preservation/order/safety tests are separate.
- T076-T082 can run in parallel after Checkpoint H because writer, safety, concurrency, verification, backup, and idempotency tests use separate files.
- T090-T092 can run in parallel after Checkpoint I because CLI command, JSON stream, and exit matrix tests are separate.
- T098-T103 can run in parallel after Checkpoint J because filesystem state, diff, conflict, apply, binary, and installed-tarball tests use separate files.
- T106-T111 can run in parallel after Checkpoint K because packaging and 001-004 regression tests use separate files.

## Traceability

### User Stories -> FR -> SC -> Tasks -> Checkpoints

| US | FR | SC | Tasks | Checkpoints |
|---|---|---|---|---|
| US1 Discover available presets | FR-001, FR-002, FR-003, FR-006 | SC-001 | T002, T006, T013, T015-T024, T051, T054, T106 | A, B, F, L |
| US2 Inspect a preset | FR-004, FR-005, FR-006, FR-007 | SC-002 | T004, T007, T022, T025, T031-T032, T052, T055 | A, B, C, F |
| US3 Preview application plan | FR-013, FR-014, FR-015, FR-016 | SC-003, SC-008 | T009, T036-T040, T053, T056-T058, T074 | A, D, F, H |
| US4 Apply a preset | FR-022, FR-023, FR-027, FR-030, FR-031 | SC-005, SC-009 | T071, T075, T079, T086, T089 | H, I |
| US5 Idempotent re-application | FR-024, FR-025, FR-043 | SC-007 | T082 | I |
| US6 Conflicts before write | FR-017, FR-018, FR-019 | SC-004, SC-008 | T045, T048-T049, T100 | E, K |
| US7 Preserve unmanaged content | FR-028, FR-029 | SC-006 | T068, T072, T075 | H |
| US8 Atomicity and safe recovery | FR-023, FR-040, FR-042 | SC-005 | T076-T078, T083-T085 | I |
| US9 Observable via existing pipeline | FR-012, FR-044, FR-045, FR-047, FR-048 | SC-009, SC-011, SC-012 | T027, T029, T033, T080, T087, T108-T111 | C, I, L |
| US10 Headless API | FR-032, FR-033 | SC-010 | T001, T005, T008, T011-T012, T034-T035, T037 | A, D |
| US11 JSON isolated from prior contracts | FR-036, FR-037, FR-039 | SC-011 | T060-T062, T064-T067, T091, T096, T110 | G, J, L |
| US12 Determinism | FR-002, FR-014, FR-043 | SC-001, SC-003, SC-007 | T050, T058, T073, T105, T115 | E, F, H, K, L |
| US13 No-TTY / CI | FR-034, FR-035, FR-039 | SC-010 | T090, T097, T102-T103, T107 | J, K, L |
| US14 Human-readable reporting | FR-015, FR-034, FR-039 | SC-010 | T059, T063, T112 | G, L |
| US15 Included categories explicit | FR-008, FR-011, FR-012 | SC-002 | T014, T026, T030 | B, C |
| US16 Tokens to create visible | FR-014, FR-020 | SC-003 | T042, T047, T069, T099 | E, H, K |
| US17 Existing paths classified | FR-014, FR-017, FR-020, FR-021 | SC-003, SC-004, SC-008 | T041, T043-T044, T046, T070 | E, H |
| US18 Unknown `$extensions` survive | FR-028, FR-029 | SC-006 | T068, T072, T075 | H |
| US19 Category filtering unavailable | FR-010, FR-021, FR-026, FR-048 | SC-012 | T097, T113-T114 | J, L |
| US20 Write errors safe result | FR-023, FR-039, FR-040, FR-042 | SC-005 | T081, T088, T101 | I, K |

### FR Coverage

| FR range | Primary tasks |
|---|---|
| FR-001..003 catalog/source/offline | T013-T024, T051, T054, T106-T107 |
| FR-004..008 envelope/metadata/version/categories | T002-T007, T014, T025, T028, T030 |
| FR-009..012 preset content and foundations metadata | T026-T033, T041, T046 |
| FR-013..016 read-only query/plan/diff | T034-T040, T051-T058 |
| FR-017..019 conflicts/blocking | T045, T048-T050, T100 |
| FR-020..021 safe merge/no force/delete | T041-T049, T068-T075, T093, T097 |
| FR-022..026 apply/idempotency/no VCS | T076-T089, T097 |
| FR-027..029 target and preservation | T068-T075, T089, T099 |
| FR-030..031 pre/post validation | T079-T080, T086-T087, T089 |
| FR-032..033 headless/layering | T001, T005, T008, T011-T012, T034-T037 |
| FR-034..035 CLI/CI-safe | T090-T097, T102-T103, T107 |
| FR-036..037 JSON isolation | T060-T067, T091, T096, T110 |
| FR-038..039 outcomes/exits/streams | T061-T067, T091-T092 |
| FR-040..042 security/limits/errors | T026-T033, T076-T088, T098-T101 |
| FR-043 determinism | T034, T050, T058, T073, T105, T115 |
| FR-044..048 compatibility/future 006 readiness | T108-T115 |

### SC Coverage

| SC | Tasks |
|---|---|
| SC-001 stable preset listing | T013, T018-T021, T024, T051, T106-T107 |
| SC-002 inspect zero writes | T004, T022, T025, T031-T032, T052, T055 |
| SC-003 deterministic preview and byte identity | T041-T050, T053, T056-T058, T074 |
| SC-004 all conflicts before write | T045, T048-T050, T100 |
| SC-005 atomic write failures preserve original | T076-T089, T101 |
| SC-006 unmanaged content preserved | T068-T075, T099 |
| SC-007 reapply unchanged zero writes | T082 |
| SC-008 plan zero writes and conflict zero writes | T053, T058, T074, T100 |
| SC-009 observable via foundations after apply | T080, T087, T111 |
| SC-010 no TTY / no stdin blocking | T059, T090-T092, T102-T103, T107 |
| SC-011 003/004 JSON unchanged | T062, T110-T111 |
| SC-012 001-004 no regressions | T108-T111, T114-T115 |

### Contracts Coverage

| Contract | Tasks |
|---|---|
| `preset-envelope-v1.contract.md` | T002-T007, T025-T028 |
| `preset-catalog-v1.contract.md` | T013-T024, T051, T054, T106-T107 |
| `preset-validation-v1.contract.md` | T025-T033 |
| `preset-conflicts-v1.contract.md` | T045, T048-T050, T100 |
| `preset-application-plan-v1.contract.md` | T034-T050, T053, T056-T058 |
| `preset-apply-result-v1.contract.md` | T076-T089, T101 |
| `preset-command-v1.contract.md` | T090-T097, T102-T103 |
| `preset-json-v1.contract.md` | T060-T067, T091, T096, T110 |

### ADR Coverage

| ADR | Tasks |
|---|---|
| ADR-0018 bundled preset catalog and envelope | T013-T024, T025-T033, T106-T107 |
| ADR-0019 deterministic safe-merge planning | T034-T050, T068-T075 |
| ADR-0020 atomic preset application and verification | T076-T089, T098-T101 |
| ADR-0021 preset commands, outcomes and JSON contracts | T059-T067, T090-T097, T102-T103 |

### Risk Coverage

| Risk | Test tasks |
|---|---|
| assets missing from tarball | T023, T106-T107 |
| duplicate IDs / invalid envelope | T013, T025 |
| invalid DTCG/foundation metadata/external alias | T026-T027, T031-T033 |
| ambiguous update / destructive merge | T041-T049, T068-T075 |
| lost `$extensions` / unknown properties | T068, T072, T075, T099 |
| non-deterministic order/output | T034, T050, T058, T105 |
| partial write / orphan temp / write error | T076-T089, T101 |
| concurrent modification | T078, T085 |
| verification failure / backup | T081, T088 |
| preset vs DS not-found / read vs write error | T053, T061, T092, T098, T101 |
| JSON 003/004 regression | T062, T110-T111 |
| importer scope creep / build-export scope creep | T005, T035, T113-T114 |

## Out of Scope Guard

No task may implement or expose themes, dark mode, component tokens, category selection, `--force`, `--dry-run`, delete operations, destructive replacement, local presets, external presets, marketplace, internet downloads, Figma, URL analysis, image analysis, AI, CSS, SCSS, Style Dictionary build/export, viewer, TUI, MCP, multiple Design Systems, multiple token files, automatic Git commits, or npm publication.

The reusable change model may support future importers by accepting source-agnostic token changes, but this feature must not implement those importers.

## Final Validation for `tasks.md`

- PASS: All task IDs are unique and sequential.
- PASS: No task is duplicated.
- PASS: All task descriptions include concrete paths.
- PASS: All 20 user stories have tasks.
- PASS: All 48 functional requirements have task coverage.
- PASS: All 12 success criteria have task coverage.
- PASS: All 8 contracts have implementation and test tasks.
- PASS: ADR-0018 through ADR-0021 have related tasks.
- PASS: All remediated risks have tests.
- PASS: All preset outcomes and exit codes have tests.
- PASS: All subcommands have tests.
- PASS: All write paths have failure tests.
- PASS: No out-of-scope work is included.
- PASS: No hidden decisions remain.
- PASS: `NEEDS CLARIFICATION`: 0.
- PASS: Contradictions: 0.
