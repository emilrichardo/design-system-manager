# Audit — 005-presets (closure)

Verifiable closure audit for the `005-presets` feature. Figures below were counted from the canonical
sources in this repository, not copied from the planning template.

## 1. Status

| Field | Value |
|---|---|
| Feature | `005-presets` (bundled, immutable preset catalog: list/inspect/plan/apply) |
| Date | 2026-06-29 |
| Commit base | `62fa5cc` (test: add preset end-to-end coverage) |
| Final commit | `docs: close presets feature` (this commit) |
| Node | `v22.16.0` (satisfies `engines.node >=22`) |
| Tests | `1264/1264` passing |
| Test files | `208` |
| Typecheck | PASS (`tsc --noEmit -p tsconfig.json`) |
| Lint / arch-guard | PASS (`node scripts/arch-guard.mjs` → `arch-guard: OK`) |
| Build | PASS (`tsc -p tsconfig.json`) |
| Packaging | PASS (`npm pack --dry-run --json`: 342 files; includes `dist/`, `presets/catalog.json`, `presets/neutral-base.preset.json`, `package.json`, `README.md`; excludes `src/`,`tests/`,`specs/`,`.agents/`,`.specify/`,`node_modules/`) |
| Installed smoke | PASS (`tests/integration/presets/tarball-smoke.test.ts`: real `npm install <tgz>` into a temp project, binary run from a foreign cwd with spaces+Unicode, no TTY, stdin closed) |

## 2. Counts (verified)

| Item | Expected (plan) | Real | Source |
|---|---|---|---|
| User stories | 20 | **20/20** | `spec.md` (`### User Story 1..20`) |
| Functional requirements | 48 | **48/48** | `spec.md` (`FR-001..` unique) |
| Success criteria | 12 | **12/12** | `spec.md` (`SC-001..` unique) |
| Tasks | 115 | **115/115** | `tasks.md` (`T001..T115`, unique, all `[X]`) |
| Constitution principles | 17 | **17/17 PASS** | `plan.md` Constitution Check (I–XVII) |

No discrepancy with the planned figures; all were re-counted from source.

## 3. Traceability (requirement/story → tasks → production → tests → gate)

| Area | Tasks | Production | Tests | Gate evidence |
|---|---|---|---|---|
| Catalog (bundled, offline) | T013–T024, T051, T106–T107 | `src/infrastructure/presets/bundled-preset-catalog.ts` | `catalog-offline.test.ts`, `presets-packaging.test.ts`, `npm-pack.test.ts`, `tarball-smoke.test.ts` | pack dry-run + real install |
| Assets (`catalog.json`, `neutral-base.preset.json`) | T013–T024, T106 | `presets/*.json` | `npm-pack.test.ts`, `presets-installed-tarball.test.ts` | tarball extraction |
| Envelope (id/name/version/includedCategories/tokens) | T006–T012 | `src/domain/presets/preset-envelope.ts`, `preset-id.ts` | `preset-envelope*.test.ts` | typecheck/test |
| Validation (envelope + token block) | T008–T012, T015–T017 | `src/infrastructure/presets/preset-token-analyzer.ts` | `preset-validation-reuse.test.ts`, `preset-filesystem-states.test.ts` | invalid-preset → exit 3 |
| Aliases / foundation projection reuse | T025–T029 | reuse of 002 analyzer + 004 `projectFoundationMetadata` | `preset-validation-reuse.test.ts`, `regression-004-foundations.test.ts` | test |
| Change model | T034–T041 | `src/domain/changes/*` | `token-change*.test.ts` | typecheck/test |
| Equivalence | T036–T038 | `src/domain/changes/equivalence.ts` | `equivalence*.test.ts`, `no-write-byte-identity.test.ts` | test |
| Diff (create/update/unchanged/conflict/skip) | T039–T045 | `src/domain/changes/application-plan.ts` | `preset-filesystem-diff.test.ts` | plan read-only |
| Conflicts (15 stable codes) | T042–T045 | `src/domain/changes/*conflict*` | `preset-filesystem-conflicts.test.ts` | conflict → exit 4 |
| list | T013–T024, T051, T054 | `src/application/presets/list-presets.ts` | `presets-commands.test.ts`, `presets-binary.test.ts` | binary list |
| inspect | T052–T055 | `src/application/presets/inspect-preset.ts` | `presets-commands.test.ts`, `tarball-smoke.test.ts` | binary inspect |
| plan | T046–T051 | `src/application/presets/plan-preset-application.ts` | `preset-filesystem-*.test.ts`, `presets-readonly-flow.test.ts` | bytes unchanged |
| reporters (human) | T056–T059, T063 | `src/infrastructure/reporter/presets-*` | `presets-commands.test.ts` | stdout/stderr split |
| JSON (isolated contract) | T060–T067, T091, T096, T110 | `src/application/presets/json/*`, `src/infrastructure/reporter/presets-json-serializer.ts` | `presets-json-commands.test.ts`, `json-regression-003-004.test.ts`, `regression-003-json.test.ts` | byte-stable 003/004 |
| candidate builder | T068–T072 | `src/application/presets/build-preset-candidate-document.ts` | `build-preset-candidate*.test.ts` | test |
| safe merge (add-only) | T073–T080 | `apply-preset.ts` + change model | `preset-filesystem-apply.test.ts`, `preset-preservation.test.ts` | applied/unchanged |
| writer (atomic) | T081–T085 | `src/infrastructure/fs/single-file-atomic-writer.ts` | `preset-filesystem-apply.test.ts` | write-error intact |
| path containment / symlinks | T081–T085 | `single-file-atomic-writer.ts` (path-safety) | path-safety unit + writer tests | test |
| concurrency (optimistic) | T086–T088 | `single-file-atomic-writer.ts` | `preset-concurrency.test.ts` | test |
| temporaries / backup | T081–T089 | atomic writer + verification | `preset-filesystem-apply.test.ts`, `preset-verification-error.test.ts` | no residue / backup on verify-error |
| verification (pre/post) | T087–T089 | `verify-preset-candidate.ts`, `verify-preset-application.ts` | `preset-verification-error.test.ts` | exit 7 |
| CLI / composition | T090–T097 | `src/cli/commands/presets.ts`, `program.ts`, `composition.ts` | `presets-exit-matrix.test.ts`, `presets-binary.test.ts` | exit matrix |
| child processes | T098–T105, T107 | (binary) | `presets-binary.test.ts`, `presets-installed-tarball.test.ts`, `tarball-smoke.test.ts` | no TTY / stdin closed |
| packaging | T106 | `package.json` (`files`) | `npm-pack.test.ts`, `presets-packaging.test.ts` | dry-run + tarball |
| installation | T107 | (tarball) | `tarball-smoke.test.ts` | real `npm install` |
| regression 001–004 | T108–T111 | (no production change) | `regression-001-init.test.ts`, `regression-002-validate-inspect.test.ts`, `regression-003-json.test.ts`, `regression-004-foundations.test.ts` | byte/contract identity |
| documentation | T112–T114 | `README.md`, `quickstart.md`, `audit.md` | n/a | review |

## 4. Security audit

| Property | Verdict | Evidence |
|---|---|---|
| No delete | PASS | diff operations are create/update/unchanged/conflict/skip; no `delete` operation exists |
| No overwrite | PASS | a differing token becomes a blocking conflict, never an overwrite (`preset-filesystem-conflicts.test.ts`) |
| No force | PASS | no `--force` flag exists (`tarball-smoke.test.ts` help assertions) |
| No partial write | PASS | atomic temp + rename; read-only dir → `write-error`, original intact (`preset-filesystem-apply.test.ts`) |
| Fixed target | PASS | always `design-system/tokens/base.tokens.json` |
| Path containment | PASS | writer rejects escapes; path-safety covered by writer tests |
| Symlinks | PASS | writer path-safety (seam of Checkpoint I) |
| Optimistic concurrency | PASS | `preset-concurrency.test.ts` |
| Atomic rename | PASS | `single-file-atomic-writer.ts` + apply tests (bytes/mtime stable on re-apply) |
| Backup | PASS | cleaned after success; retained on `verification-error` (`preset-verification-error.test.ts`) |
| verification-error | PASS | exit 7, backup retained, no destructive rollback |
| Public paths only | PASS | JSON has no absolute repo paths (`tarball-smoke.test.ts` asserts no `REPO_ROOT`) |
| No stacks | PASS | error envelopes carry a stable message only |
| No secrets | PASS | no environment/credential surface in this feature |

## 5. Architecture audit

Layering `domain ← application ← infrastructure ← CLI` holds (enforced by `scripts/arch-guard.mjs`,
green). Decoupling verified:

- **presets**: domain (`src/domain/presets`, `src/domain/changes`) has no fs/CLI imports.
- **change model**: generic (`TokenChange`/`ApplicationPlan`), reused by plan and apply; pure.
- **reporters**: human and JSON are infrastructure adapters; use cases never format.
- **JSON**: `PresetsJsonEnvelopeV1` is a separate contract (no cast over 003/004 envelopes).
- **writer**: `createSingleFileAtomicWriter` is infrastructure behind an application port.

The catalog resolves bundled assets via `import.meta.url`, never `process.cwd()`
(`presets-installed-tarball.test.ts`, `tarball-smoke.test.ts`).

## 6. Findings

| Severity | Count | Detail |
|---|---|---|
| CRITICAL | 0 | — |
| HIGH | 0 | (the K-phase idempotency defect — preset declared the foundation level on the pre-existing `color` group — was fixed before K closed: each preset token is now self-describing; re-verified here via `tarball-smoke.test.ts` and `regression-004-foundations.test.ts`) |
| MEDIUM | 0 | — |
| LOW | 1 | Environment: gates ran on Node `v22.16.0` (not `24.14.0`). Accepted: satisfies `engines.node >=22`; not a functional defect. |
| NEEDS CLARIFICATION | 0 | — |
| Contradictions | 0 | `tasks.md` (T106–T115) matches spec/plan/contracts; no conflict found |

No MEDIUM/HIGH/CRITICAL: the feature is eligible for closure.

## 7. Final gates (T115)

Recorded from this closure run (Node v22.16.0):

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | PASS |
| Lint / arch-guard | `npm run lint` | PASS (`arch-guard: OK`) |
| Tests | `npm test` | PASS — `1264/1264`, `208` files |
| Build | `npm run build` | PASS |
| Packaging | `npm pack --dry-run --json` | PASS — 342 files; assets present; forbidden paths absent; no residual tarball |
| Real tarball install + smoke | `tests/integration/presets/tarball-smoke.test.ts` | PASS — applied/0 then unchanged/2 from the installed binary |
| Regression 001 | `regression-001-init.test.ts` | PASS — init unchanged; no auto-applied preset |
| Regression 002 | `regression-002-validate-inspect.test.ts` | PASS — validate/inspect semantics intact |
| Regression 003 | `regression-003-json.test.ts` | PASS — `validate/inspect --json` byte-stable |
| Regression 004 | `regression-004-foundations.test.ts` | PASS — foundations contract intact; apply observable |
| Diff review | `git diff --check` | clean |
| Residues | repo + temp dirs | none (no `*.tgz`, no temp projects, no backups) |
| 006 scope | — | not started |

## 8. Closure

`005-presets` is closed: 115/115 tasks complete (checkpoints A–L), all gates green, 0
CRITICAL/HIGH/MEDIUM findings, 0 contradictions, 0 NEEDS CLARIFICATION. Next feature `006-build-export`
was not started.
