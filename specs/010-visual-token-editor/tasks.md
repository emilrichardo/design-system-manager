# Tasks: 010-visual-token-editor

**Input**: `specs/010-visual-token-editor/spec.md`, `plan.md`, `research.md`, `data-model.md`,
`contracts/`, `quickstart.md`
**Scope**: Local Visual Token Editor over the existing `009` Viewer shell and `008` token mutation
contracts. User action -> structured command -> plan -> visual diff -> validation -> approval ->
transactional apply -> verification -> Viewer session reload. No direct source editing, no filesystem
access in the UI/application editor layer, no duplicated planner/diff/aliases/writer.
**Generated**: 2026-07-01
**Status**: Backlog; ninguna tarea completada. Esta especificacion no implementa codigo productivo.

## Execution Rules

- Orden por checkpoint: A -> B -> C -> D -> E -> F. Cada checkpoint termina con gate y commit sugerido.
- Checkpoints amplios: evitar microtareas. Marcar tareas solo dentro del checkpoint activo.
- Reglas contractuales no negociables:
  - **Flujo obligatorio**: user action -> `TokenMutationCommandV1` -> `planTokenMutation` -> non-editable
    diff -> approval -> `applyTokenMutation` -> verification/recovery -> Viewer reload.
  - **No duplicar 008**: sin planner/diff/reference-update/validation/writer nuevo en el Editor.
  - **No duplicar 009**: reusar shell, navegacion, token tree, session states, search/filter y contratos.
  - **Application editor sin infraestructura**: sin `node:fs`, `node:http`, DOM, Commander, browser globals
    ni writer ports en `src/application/editor/**`.
  - **No implicit force**: dependents, non-empty groups, collisions, invalid batch and type mismatch block.
  - **Public safety**: logical paths/safe values only; no raw bytes/absolute paths/stack/secrets.
- No crear `specs/010-visual-token-editor/audit.md` hasta el cierre del checkpoint F.
- No modificar `design-system/**` ni reabrir features cerradas `001`-`009`.

## Checkpoint A — Contracts and editor state

**Objective**: Editor application contracts, DTOs, state machine and architecture guards; no HTTP routes,
no UI controls, no productive write path.
**Preconditions**: `008` and `009` closed; spec/plan/research/data-model/contracts current.

### Tasks

- [X] T001 [US1][US6] Create `src/application/editor/session.ts` with `EditorSessionV1`, editor modes and mappings to existing `ViewerSessionV1`.
- [X] T002 [US1][US2][US3][US4][US5] Create `src/application/editor/command-draft.ts` mapping every visual operation to `TokenMutationOperationV1` and `TokenMutationCommandV1`.
- [X] T003 [US1][US6] Create `src/application/editor/review.ts` with `EditorReviewV1`, `canApprove`, expired-plan blocking and non-editable diff metadata.
- [X] T004 [US6] Create `src/application/editor/apply-result.ts` mapping `TokenMutationResultV1` outcomes/recovery to editor apply states.
- [X] T005 [US1][US7] Create `src/application/editor/state-machine.ts` for draft -> planning -> review -> approval/apply -> reload transitions.
- [X] T006 [P] [US1][US7] Create `tests/application/editor/contract-shapes.test.ts` for null policy, safe public fields and no absolute paths/raw bytes/stack/secrets.
- [X] T007 [P] [US7] Extend `scripts/arch-guard.mjs` and add `tests/architecture/editor/forbidden-imports.test.ts` to block fs/http/DOM/Commander/writer imports in `src/application/editor/**`.
- [X] T008 Gate A: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: no behavior changes to `008` or `009`.
**Suggested commit**: `feat: add editor contracts and state`
**First task next checkpoint**: T009.

## Checkpoint B — Viewer integration and local editor adapter

**Objective**: Integrate Editor session with `009` session and add thin loopback adapter contracts/routes for plan/refresh without direct writes.
**Preconditions**: Checkpoint A complete and gate green.

### Tasks

- [X] T009 [US1][US6] Create `src/application/editor/editor-session.ts` to compose current Viewer session with editor draft/review/apply state without duplicating Viewer projections.
- [X] T010 [US1][US2][US3] Create `src/application/editor/plan-editor-command.ts` that calls `planTokenMutation` and maps the result to `EditorReviewV1`.
- [X] T011 [US1][US6] Create `src/application/editor/json/dto.ts` and `map-editor.ts` for `EditorJsonEnvelopeV1`, independent from `ViewerJsonEnvelopeV1`.
- [X] T012 [US1][US6] Extend `src/infrastructure/viewer/http-server.ts` with loopback-only editor plan/session/refresh routes as thin adapters over application/editor.
- [X] T013 [US1][US7] Connect initial UI editor mode in `src/infrastructure/viewer/ui/main.ts` or `ui/editor.ts`, reusing existing navigation and session loading states.
- [X] T014 [P] [US1] Create `tests/integration/editor/http-plan-route.test.ts` proving plan route accepts only structured commands, returns one editor envelope and writes nothing.
- [X] T015 [P] [US1][US6] Create `tests/application/editor/viewer-integration.test.ts` proving editor session reuses Viewer session data and does not duplicate projections/use-case calls.
- [X] T016 Gate B: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: Viewer read-only routes from `009` keep their behavior and JSON shapes.
**Suggested commit**: `feat: integrate editor with viewer session`
**First task next checkpoint**: T017.

## Checkpoint C — Forms and type-aware editors

**Objective**: Token detail editing, type selector, alias selector, metadata, group administration and supported value controls.
**Preconditions**: Checkpoints A-B complete and gates green.

### Tasks

- [X] T017 [US1][US5] Create `src/application/editor/value-controls.ts` for supported type-control models and read-only unsupported/composite states.
- [X] T018 [US1] Implement UI detail/value editor controls for `color`, `number`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `string` and `boolean`.
- [X] T019 [US5] Implement type selector and metadata editor UI, distinguishing declared/effective type, description and Neuraz category metadata.
- [X] T020 [US3] Implement alias selector UI for `set-alias` and `remove-alias`, showing current target, chain and resolved value.
- [X] T021 [US2][US4] Implement token/group create, duplicate, rename, move and remove forms with non-drag parent/path selectors.
- [X] T022 [P] [US1][US5] Create `tests/application/editor/value-controls.test.ts` covering valid/invalid supported type inputs and blocked unsupported/composite values.
- [X] T023 [P] [US7] Create `tests/integration/editor/form-accessibility.test.ts` for labels, control-associated errors, focus and keyboard-only operation in editor forms.
- [X] T024 Gate C: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: current Viewer token/foundation/asset views stay usable without entering edit mode.
**Suggested commit**: `feat: add visual token editor forms`
**First task next checkpoint**: T025.

## Checkpoint D — Plan, visual diff and approval

**Objective**: Full review flow with mutation plan, visual diff, conflicts, warnings, approval/cancel/back-to-edit.
**Preconditions**: Checkpoints A-C complete and gates green.

### Tasks

- [X] T025 [US1][US2][US3][US4] Implement visual diff UI for added, updated, renamed, moved, alias-changed, metadata-changed, group-changed and removed entries.
- [X] T026 [US2][US3][US4][US6] Implement conflicts/warnings panels for dependents, collisions, invalid command, unsupported type, plan expired and source unavailable.
- [X] T027 [US1] Implement approval controls: approve, cancel and back-to-edit; block approve unless `EditorReviewV1.canApprove`.
- [X] T028 [US1][US6] Ensure editing after review invalidates the review and requires a new plan.
- [X] T029 [P] [US3] Create `tests/integration/editor/rename-move-diff.test.ts` proving visual diff matches `008` diff references exactly.
- [X] T030 [P] [US2][US4] Create `tests/integration/editor/conflicts.test.ts` for removal-with-dependents, group-removal-non-empty and collisions with zero writes.
- [X] T031 [P] [US1] Create `tests/integration/editor/approval-boundary.test.ts` proving no apply occurs before explicit approval and cancel/back-to-edit write nothing.
- [X] T032 Gate D: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: `planTokenMutation` remains the only source of plan/diff data.
**Suggested commit**: `feat: add editor plan diff and approval`
**First task next checkpoint**: T033.

## Checkpoint E — Apply, concurrency, recovery and Viewer reload

**Objective**: Transactional apply through `008`, explicit concurrency/recovery states and post-apply Viewer session reload.
**Preconditions**: Checkpoints A-D complete and gates green.

### Tasks

- [ ] T033 [US1][US6] Create `src/application/editor/apply-editor-command.ts` to call `applyTokenMutation`, map result and trigger refresh orchestration.
- [ ] T034 [US1][US6] Extend local editor adapter route for apply, requiring an approvable review/command and returning `EditorApplyResultV1`.
- [ ] T035 [US1] Implement post-apply Viewer reload in UI and keep apply result visible when reload fails.
- [ ] T036 [US6] Implement distinct UI states for unchanged, source changed concurrently, write error, verification error, backup available, recovery required and source unavailable.
- [ ] T037 [P] [US1] Create `tests/integration/editor/apply-refresh.test.ts` for applied -> Viewer reload -> updated token visible, plus refresh-failed preserving apply result.
- [ ] T038 [P] [US6] Create `tests/integration/editor/concurrency-recovery.test.ts` with fault injection for concurrent-source-change, write-error and verification-error recovery fields.
- [ ] T039 [P] [US2][US3][US4] Create `tests/integration/editor/no-direct-writes.test.ts` proving only `008` apply writes and preview/error states leave host bytes unchanged.
- [ ] T040 Gate E: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: `008` CLI/token JSON outcomes stay byte-stable; `009` Viewer refresh remains read-only.
**Suggested commit**: `feat: add editor apply recovery and refresh`
**First task next checkpoint**: T041.

## Checkpoint F — Accessibility, packaging, regression and close

**Objective**: Complete accessibility, offline/tarball packaging, regression for `001`-`009`, docs and audit closure.
**Preconditions**: Checkpoints A-E complete and gates green.

### Tasks

- [ ] T041 [US7] Complete keyboard navigation, focus management, live announcements, reduced motion, contrast and non-color-only state communication in editor UI.
- [ ] T042 [P] [US7] Create `tests/integration/editor/accessibility.test.ts` covering every item in `contracts/editor-accessibility-v1.contract.md`.
- [ ] T043 [US1][US7] Update `README.md` and `docs/product/capability-map.md` with Visual Token Editor behavior, boundaries and implemented/planned status at closure.
- [ ] T044 [US1] Update `specs/010-visual-token-editor/quickstart.md` from planned to implemented with real commands, routes and outcomes.
- [ ] T045 [P] [US1] Create `tests/integration/editor/npm-pack.test.ts` verifying editor application/infrastructure dist files are included and specs/src/tests/.agents are excluded.
- [ ] T046 [P] [US1] Create `tests/integration/editor/tarball-smoke.test.ts` with real `npm pack` + install, offline loopback editor preview/apply smoke from foreign cwd.
- [ ] T047 [P] [US1][US6] Create `tests/integration/editor/regression-001-009.test.ts` proving closed features keep behavior/JSON/exits and `design-system/build/**`/assets/manifests are untouched by editor token flows.
- [ ] T048 Gate F: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm pack --dry-run --json`, `git diff --check`.
- [ ] T049 [US1][US7] Create `specs/010-visual-token-editor/audit.md` with traceability, gates, findings and final closure.

**Regression**: full `001`-`009` regression plus editor tarball/offline checks.
**Suggested commit**: `feat: add visual token editor accessibility packaging and close`
**First task next checkpoint**: none; F closes `010`.

## Dependencies

```text
A -> B -> C -> D -> E -> F
```

Hard dependencies:

- B depends on A contracts and arch guard.
- C depends on B session/adapter contracts.
- D depends on C command-producing controls.
- E depends on D approval boundary.
- F depends on all implementation checkpoints.

## Parallel Opportunities

- A: T006 and T007 can run in parallel after T001-T005 shapes are drafted.
- B: T014 and T015 test different seams.
- C: T022 and T023 test application controls vs UI accessibility.
- D: T029, T030 and T031 cover independent review paths.
- E: T037, T038 and T039 cover independent apply/recovery/no-write paths.
- F: T042, T045, T046 and T047 are independent regression/packaging/a11y branches.

## Traceability — User Stories -> Tasks

| US | Tasks |
|---|---|
| US1 edit value through review | T001, T002, T003, T009, T010, T013, T014, T018, T025, T027, T031, T033, T035, T037, T043-T049 |
| US2 create/duplicate/remove tokens | T002, T010, T021, T025, T026, T030, T039 |
| US3 aliases/references | T002, T020, T025, T026, T029, T039 |
| US4 groups | T002, T021, T025, T026, T030 |
| US5 metadata/type clarity | T002, T017, T019, T022 |
| US6 concurrency/recovery | T001, T003, T004, T005, T009, T010, T026, T033-T038, T047 |
| US7 accessibility | T005, T007, T013, T021, T023, T041, T042, T049 |

## Traceability — Functional Requirements -> Checkpoints

| FR | Checkpoint |
|---|---|
| FR-001..002 | A, B |
| FR-003..008 | A, B, D, E |
| FR-009..013 | C |
| FR-014..015 | D, E |
| FR-016..018 | A, B, F |
| FR-019..020 | C, F |
| FR-021..022 | all checkpoints, verified in F |
