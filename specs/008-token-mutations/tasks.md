# Tasks: 008-token-mutations

**Input**: `specs/008-token-mutations/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Scope**: Headless, safe, command-driven mutation API over `design-system/tokens/base.tokens.json`.
Reuses the `002`/`004` analysis and the `005` single-file atomic write guarantees (PATTERNS, not a new
writer). Plan is read-only/deterministic; apply is transactional; rename/move rewrite all affected
aliases; remove with dependents and non-empty group removal are blocked. Shared base for CLI/MCP/skills/
Studio/Visual Token Editor/preset authoring/approved importers.
**Generated**: 2026-06-30
**Status**: Backlog; ninguna tarea completada. No implementa código aquí.

## Execution Rules

- Orden por checkpoint: A → B → C → D → E → F. Cada checkpoint termina con un gate y un commit sugerido.
- Checkpoints amplios: cada tarea es una unidad significativa y verificable; evitar microtareas e
  informes intermedios. Marcar tareas solo dentro del rango del checkpoint en curso.
- Reglas contractuales no negociables (spec, research, data-model, contracts):
  - **Flujo obligatorio**: command → snapshot → analyze → validate command → plan → diff → validate
    candidate → approval boundary → transactional apply → post-write verification. Nunca command → write.
  - **Plan read-only y determinista**: la fuente queda byte-idéntica; mismo command+fuente ⇒ mismo plan/diff.
  - **Rename/move**: política v1 = actualizar todas las referencias afectadas; sin aliases rotos; el diff
    lista cada referencia modificada; colisión bloquea.
  - **Remove**: con dependientes bloquea (sin `--force`); grupo no vacío bloquea; solo `remove-empty-group`.
  - **Escritura transaccional** reutilizando `005` (snapshot identity, concurrencia por bytes, backup,
    restore, verificación, idempotencia); todo o nada; sin escritura parcial visible.
  - **Separación**: las mutaciones solo tocan `design-system/tokens/base.tokens.json`; nunca
    `design-system/build/**`, `design-system/assets/**`, host manifest ni asset manifest; `001`–`007`
    byte-estables.
  - **Paths públicos lógicos**; sin rutas absolutas/bytes/stack; `internal-error` solo en adapter.
- No crear `specs/008-token-mutations/audit.md` hasta el cierre del checkpoint F.
- No modificar `src/**`, `tests/**` ni `package.json` durante la fase de especificación (esta fase).

## Checkpoint A — Domain models and contracts surface

**Objective**: Modelos de dominio inmutables (operations, command, diff, plan, result, outcomes, issues,
recovery) y la superficie pública, alineados con los contratos `1.0.0`; sin filesystem ni adaptadores.
**Preconditions**: spec/plan/research/data-model/contracts vigentes; `001`–`007` cerradas.

### Tasks

- [X] T001 [US1] Crear `src/domain/token-mutations/operation.ts` y `command.ts`:
  `TokenMutationOperationV1` (unión discriminada de 15 operaciones token/grupo) y `TokenMutationCommandV1`.
- [X] T002 [US10] Crear `src/domain/token-mutations/diff.ts`: `TokenMutationDiffV1`/`TokenMutationDiffEntry`
  y `TokenMutationDiffKind` (added/updated/renamed/moved/removed/alias-changed/metadata-changed/group-changed).
- [X] T003 [US12] Crear `src/domain/token-mutations/result.ts` y `outcome.ts`: `TokenMutationOutcome`
  (closed), `MutationIssue`/`MutationIssueCode`, `MutationRecoveryState`, `SafeMutationError`,
  `TokenMutationResultV1`; invariantes `wrote`/recovery; prohibir `partial`/`success`/`blocked`.
- [X] T004 [US1] Crear `src/domain/token-mutations/paths.ts`: validación de path lógico de token
  (sin traversal/segmento vacío/clave `$`), helpers de parent/segment y orden canónico de diff.
- [X] T005 [US13] Crear `src/domain/token-mutations/index.ts`: superficie pública (solo tipos y funciones puras).
- [X] T006 [P] [US1] Crear `tests/domain/token-mutations/models.test.ts`: uniones cerradas, inmutabilidad,
  null policy, invariantes outcome/recovery, prohibición de `partial`/`success`.
- [X] T007 [US13] Crear `src/application/token-mutations/ports.ts`: puertos (`SourceSnapshotPort`,
  `TokenSourceWriterPort`, análisis reutilizado) y tipos internos; sin Node/Commander/infra.
- [X] T008 Gate A: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna (modelos nuevos aislados).
**Suggested commit**: `feat: add token mutation domain models and contracts surface`
**Exclusions**: sin planner, sin validación, sin writer, sin CLI.
**First task next checkpoint**: T009.

## Checkpoint B — Planner, candidate builder and diff

**Objective**: Construcción determinista del documento candidato a partir de las operaciones, cálculo del
diff seguro, y lectura del snapshot semántico (reusando `006`/`002`). Plan read-only.
**Preconditions**: Checkpoint A completo y gate A verde.

### Tasks

- [X] T009 [US1] Crear `src/application/token-mutations/candidate-builder.ts`: aplica las operaciones en
  orden a un modelo de trabajo en memoria; preserva contenido desconocido y orden de claves; no escribe.
- [X] T010 [US10] Crear `src/application/token-mutations/diff-calculator.ts`: deriva `TokenMutationDiffV1`
  (before/after seguros, referencias afectadas) de forma determinista.
- [X] T011 [US3] Crear `src/infrastructure/token-mutations/candidate-serializer.ts`: serialización canónica
  del documento candidato (igual que el write path de tokens existente) + hash del candidato.
- [X] T012 [US11] Crear `src/infrastructure/token-mutations/source-snapshot-reader.ts`: una lectura/parse/
  análisis (reusa `006`/`createBoundAnalyze`); captura `SourceSnapshotIdentity` (path lógico + hash).
- [X] T013 [P] [US1] Crear `tests/application/token-mutations/candidate-builder.test.ts`: create/update/
  duplicate/remove sobre el modelo; preservación de `$extensions` desconocidos y orden.
- [X] T014 [P] [US10] Crear `tests/application/token-mutations/diff-calculator.test.ts`: todos los
  `DiffKind`, determinismo, ausencia de bytes/rutas absolutas.
- [X] T015 [US3] Crear `src/application/token-mutations/plan-skeleton.ts`: ensamblaje preliminar del plan
  (operations + diff + candidateHash + source) SIN validación completa todavía.
- [X] T016 Gate B: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: la fuente queda byte-idéntica tras planificar.
**Suggested commit**: `feat: add token mutation planner, candidate builder and diff`
**Exclusions**: sin validación de comandos completa, sin writes.
**First task next checkpoint**: T017.

## Checkpoint C — Command validation and reference updates

**Objective**: Validación determinista de comandos y documento candidato, y motor de actualización de
referencias (rename/move = update-all-affected). Ensamblar `planTokenMutation` (read-only) completo.
**Preconditions**: Checkpoints A–B completos y gates verdes.

### Tasks

- [ ] T017 [US1] Crear `src/application/token-mutations/validate-command.ts`: invalid-path, token-exists,
  token-not-found, group-not-found, alias-not-found, invalid-dtcg-value (clasificadas → `invalid-command`).
- [ ] T018 [US4] Añadir validación de alias reutilizando el grafo de `002`: alias-cycle, alias-to-group,
  type-mismatch; nunca resueltos en silencio.
- [ ] T019 [US5] [US6] Crear detección de colisiones y conflicto padre/descendiente: rename-collision,
  move-collision, parent-descendant-conflict (→ `conflict`/`invalid-command`).
- [ ] T020 [US5] Crear `src/application/token-mutations/reference-update.ts`: política v1
  update-all-affected — reescribe toda referencia a paths afectados por rename/move (token y grupo);
  emite entradas `alias-changed`; jamás deja aliases rotos.
- [ ] T021 [US8] [US9] Crear `src/application/token-mutations/removal-policy.ts`: removal-with-dependents
  (bloquea, lista dependientes), group-removal-non-empty (bloquea), `remove-empty-group` solo si vacío.
- [ ] T022 [US1] Crear `src/application/token-mutations/plan-token-mutation.ts`: caso de uso read-only que
  integra snapshot → analyze → validate → candidate → diff → validate candidate; produce `TokenMutationResultV1`.
- [ ] T023 [P] [US1] Crear `tests/integration/token-mutations/validation-matrix.test.ts`: cada caso de
  validación (block / explicit-operation / never-silent) con su código estable.
- [ ] T024 [P] [US5] Crear `tests/integration/token-mutations/rename-move-remove.test.ts`: reescritura de
  referencias (token y grupo), colisiones, remove con/sin dependientes, grupo vacío/no vacío.
- [ ] T025 Gate C: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: sin aliases rotos en ningún candidato; `plan` no escribe.
**Suggested commit**: `feat: add token mutation validation and reference updates`
**Exclusions**: sin apply/writer todavía.
**First task next checkpoint**: T026.

## Checkpoint D — Transactional apply, idempotency, concurrency and recovery

**Objective**: `applyTokenMutation` transaccional reutilizando el writer single-file de `005`; idempotencia,
detección de cambio concurrente, verificación posterior y estados de recuperación; todo o nada.
**Preconditions**: Checkpoints A–C completos y gates verdes.

### Tasks

- [ ] T026 [US2] Crear `src/infrastructure/token-mutations/token-source-writer.ts`: adapter del puerto de
  escritura sobre el `SingleFileAtomicWriter` de `005` (temp→identity check→replace→backup→restore→verify).
- [ ] T027 [US2] Crear `src/application/token-mutations/apply-token-mutation.ts`: re-deriva el plan,
  approval boundary, escribe solo si `writable` y sin cambio concurrente; mapea a `TokenMutationResultV1`.
- [ ] T028 [US2] Añadir decisión de idempotencia: candidato == fuente actual ⇒ `unchanged`/`wrote:false`
  sin escribir (antes de tocar el writer).
- [ ] T029 [US11] Conectar la detección de concurrencia por snapshot identity (bytes/hash) →
  `conflict`/`concurrent-source-change` si la fuente cambió entre plan y apply.
- [ ] T030 [US2] Definir semántica de recovery/verification: verificación posterior, `verification-error`
  con backup retenido y `recoveryRequired`, sin rollback automático tras el commit point.
- [ ] T031 [P] [US2] Crear `tests/integration/token-mutations/apply.test.ts` (fs temporal): applied,
  unchanged, candidato válido tras apply, batch all-or-nothing.
- [ ] T032 [P] [US11] Crear `tests/integration/token-mutations/apply-recovery.test.ts` (fault injection):
  fallo antes/después del reemplazo, restore ok/fallido, verificación posterior fallida, cambio concurrente.
- [ ] T033 [P] [US14] Crear `tests/integration/token-mutations/preserve-untouched.test.ts`: assets/build/
  manifests intactos; `$extensions` desconocidos preservados; sin aliases rotos.
- [ ] T034 Gate D: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: tokens/build/assets/manifests intactos; `001`–`007` byte-estables.
**Suggested commit**: `feat: add transactional token mutation apply with recovery and idempotency`
**Exclusions**: sin CLI todavía.
**First task next checkpoint**: T035.

## Checkpoint E — Presentation, JSON envelope and thin CLI

**Objective**: DTO/mapper/serializer `TokenMutationJsonEnvelopeV1`, reporters humano/JSON, y una CLI fina
`token` (plan/apply + archivo declarativo + shorthands), adapter sobre los casos de uso headless.
**Preconditions**: Checkpoints A–D completos y gates verdes.

### Tasks

- [ ] T035 [US12] Crear `src/application/token-mutations/json/map-mutation.ts` + `TokenMutationJsonEnvelopeV1`
  (command `token-plan|token-apply`; paths lógicos; null policy; independiente de `003`).
- [ ] T036 [US12] Crear `src/infrastructure/reporter/token-mutation-json-serializer.ts` y los reporters
  `token-mutation-terminal-reporter.ts` / `token-mutation-json-reporter.ts` (deterministas, 2 espacios, LF).
- [ ] T037 [US13] Crear `src/cli/commands/token.ts` y conectar `program.ts`/`composition.ts`:
  `token plan|apply` con `--file <command.json>` y shorthands (`create/update/rename/move/remove`); sin
  flags fuera de alcance; sin `--force`.
- [ ] T038 [US12] Añadir mapeo de exit codes (`exitCodeForTokenMutationOutcome`) reutilizando la tabla
  común; `internal-error`→70 solo en el adapter.
- [ ] T039 [P] [US13] Crear `tests/cli/token-commands.test.ts` y `token-help.test.ts`: superficie de
  comandos, selección de reporter, ayuda sin flags fuera de alcance; `plan` no escribe.
- [ ] T040 [P] [US2] Crear `tests/cli/token-binary.test.ts` (proceso hijo): plan/apply, JSON, paths con
  espacios/Unicode, cwd distinto, stdin cerrado; streams y exit codes.
- [ ] T041 [P] [US12] Crear `tests/integration/token-mutations/json-envelope.test.ts`: parseable,
  formatVersion, paths lógicos, determinismo; bytes de `003`/`004`/`006`/`007` intactos.
- [ ] T042 [P] [US13] Crear `tests/application/token-mutations/headless-reuse.test.ts`: casos de uso sin
  Commander/process/TTY; resultados estructurados reutilizables por MCP/Studio.
- [ ] T043 Gate E: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: contratos JSON de `003`/`004`/`006`/`007` byte-estables.
**Suggested commit**: `feat: add token mutation cli, json envelope and reporters`
**Exclusions**: sin MCP, sin Studio, sin editor visual.
**First task next checkpoint**: T044.

## Checkpoint F — Packaging, regression and close

**Objective**: Empaquetado, instalación desde tarball real, regresión granular `001`–`007`, documentación
y cierre con auditoría. MCP/Studio/Visual Token Editor/preset authoring quedan como reuso futuro.
**Preconditions**: Checkpoints A–E completos y gates verdes.

### Tasks

- [ ] T044 [US13] Crear `tests/integration/token-mutations/npm-pack.test.ts`: `npm pack --dry-run --json`
  incluye `dist/cli/commands/token.js` y `dist/**/token-mutations/**`; excluye `src/`, `tests/`, `specs/`, `.agents/`.
- [ ] T045 [US13] Crear `tests/integration/token-mutations/tarball-smoke.test.ts`: `npm pack` real +
  `npm install <tgz>` (sin npm link); `token plan`/`token apply` desde cwd ajeno; sin referencias al repo.
- [ ] T046 [P] [US14] Crear `tests/integration/token-mutations/regression-001-007.test.ts`: ninguna
  mutación modifica build/assets/host/asset-manifest; init/validate/inspect/foundations/presets/build/
  export/asset byte-estables.
- [ ] T047 [P] [US14] Crear `tests/integration/token-mutations/preserve-unknown-content.test.ts`:
  `$extensions` desconocidos y propiedades no gestionadas intactos tras mutaciones.
- [ ] T048 [US13] Actualizar `README.md` y `docs/product/capability-map.md`: comandos `token`, política
  rename/move, política remove, separación tokens/build/assets; marcar la capacidad como implementada.
- [ ] T049 [US12] Actualizar `specs/008-token-mutations/quickstart.md` con el flujo reproducible real y los
  outcomes/exits definitivos.
- [ ] T050 Gate F (suite completa): `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  `npm pack --dry-run --json`, `git diff --check`.
- [ ] T051 [US14] Crear `specs/008-token-mutations/audit.md` con trazabilidad (14/14 US, 26/26 FR, 12/12 SC,
  17/17 Constitution), hallazgos (0 CRITICAL/HIGH/MEDIUM) y gates finales; cerrar la feature.
- [ ] T052 [US13] Documentar (en `plan.md`/audit) el posible refactor de una abstracción de escritura
  single-file compartida con `005`, sin implementarlo ni alterar el comportamiento/contratos de `005`.

**Regression**: T046/T047 prueban que `001`–`007` no cambian comportamiento, bytes, JSON ni exits.
**Suggested commit**: `feat: add token mutation packaging, regression and close`
**Exclusions**: no iniciar `009`; no implementar MCP/Studio/editor; sin Figma/scraping/IA.
**First task next checkpoint**: ninguno; F cierra `008`.

## Dependencies

```text
A → B → C → D → E → F
```

Reglas duras (no violar):
- `plan` (B/C) NO escribe; el writer (D) no precede a la validación (C).
- La CLI (E) no precede a los casos de uso (C/D).
- `verification-error` (D) no precede al reemplazo atómico (D).
- Ninguna tarea modifica build/assets/host-manifest/asset-manifest.

## Parallel Opportunities

- En B: candidate-builder, diff-calculator y serializer son ramas independientes (`[P]` en tests).
- En C: las pruebas de matriz de validación y de rename/move/remove son `[P]`.
- En D/E/F: las pruebas marcadas `[P]` editan archivos de test separados.

## Traceability — User Stories → Tasks (14/14)

| US | Tasks | US | Tasks |
|---|---|---|---|
| US1 plan create | T001, T004, T022 | US8 block remove w/ deps | T021, T024 |
| US2 apply create | T026, T027, T031 | US9 manage groups | T021, T024 |
| US3 update value | T011, T015 | US10 deterministic diff | T002, T010, T014 |
| US4 alias create/remove | T018 | US11 concurrent conflict | T012, T029, T032 |
| US5 rename w/ refs | T019, T020, T024 | US12 JSON output | T003, T035, T041 |
| US6 move token | T019, T020 | US13 headless reuse | T005, T007, T037, T042 |
| US7 remove no deps | T021, T031 | US14 preserve assets/build/unknown | T033, T046, T047 |

## Traceability — Functional Requirements → Checkpoints

| FR | Checkpoint | FR | Checkpoint |
|---|---|---|---|
| FR-001..003 | A | FR-015..017 | D |
| FR-004..006 | B, C | FR-018 | B, D |
| FR-007..008 | A, B | FR-019 | A, E |
| FR-009..010 | C | FR-020 | A, C, D |
| FR-011..012 | C | FR-021 | A, E |
| FR-013..014 | C | FR-022..024 | A–D |
| | | FR-025..026 | E, F |
