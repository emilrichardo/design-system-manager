# Audit — 008-token-mutations

Feature: Token Mutation Commands and Safe Diff — structured, transactional mutations of
`design-system/tokens/base.tokens.json` (create/update/rename/move/remove tokens and groups, set/remove
alias), with deterministic diff, safe validation, all-or-nothing apply, and a thin CLI/JSON adapter.
Cierre auditado sobre el Checkpoint F (T044–T052), creado en el commit
`feat: add token mutation packaging, regression and close`.

## Estado

- User stories: 14/14 cubiertas.
- Functional requirements: 26/26 cubiertos.
- Success criteria: 12/12 cubiertos.
- Constitución: 17/17 principios PASS/N/A, 0 FAIL.
- Checkpoints A–F: T001–T052 completos al cierre.
- Resultado `/speckit-analyze` equivalente: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 contradicciones,
  0 requisitos sin cobertura, 0 marcadores `[NEEDS CLARIFICATION]`, 0 violaciones de constitución.
- Tests: suite completa en verde, incluyendo el binario `token` real, el tarball instalado y la
  regresión `001`–`007`.

## Matriz US → tareas → evidencia

| US | Descripción | Tareas | Evidencia productiva | Evidencia de test |
|---|---|---|---|---|
| US1 | plan de creación (read-only) | T001, T004, T022 | `domain/token-mutations/*`, `plan-token-mutation.ts` | `validation-matrix.test.ts`, `rename-move-remove.test.ts` |
| US2 | apply de creación (transaccional) | T026, T027, T031 | `token-source-writer.ts`, `apply-token-mutation.ts` | `apply.test.ts` |
| US3 | actualizar el valor de un token | T011, T015 | `candidate-builder.ts` (update-value), `diff-calculator.ts` | `candidate-builder.test.ts`, `diff-calculator.test.ts` |
| US4 | crear/eliminar un alias | T018 | `validate-command.ts` (set/remove-alias) | `validation-matrix.test.ts` |
| US5 | renombrar con referencias | T019, T020, T024 | `reference-update.ts` | `rename-move-remove.test.ts` |
| US6 | mover un token | T019, T020 | `reference-update.ts`, `candidate-builder.ts` | `rename-move-remove.test.ts` |
| US7 | remove sin dependientes | T021, T031 | `removal-policy.ts` | `rename-move-remove.test.ts`, `apply.test.ts` |
| US8 | bloquear remove con dependientes | T021, T024 | `removal-policy.ts` (`checkRemovalDependents`) | `rename-move-remove.test.ts`, `apply.test.ts` |
| US9 | gestionar grupos | T021, T024 | `removal-policy.ts` (`checkGroupRemoval`), operaciones de grupo | `rename-move-remove.test.ts` |
| US10 | diff determinista | T002, T010, T014 | `domain/token-mutations/diff.ts`, `diff-calculator.ts` | `diff-calculator.test.ts` |
| US11 | conflicto por cambio concurrente | T012, T029, T032 | `ports.ts` (identity), `token-source-writer.ts` | `apply-recovery.test.ts` |
| US12 | salida JSON machine-readable | T003, T035, T041 | `json/map-mutation.ts`, `token-mutation-json-*` | `json-envelope.test.ts` |
| US13 | reuso headless (CLI/MCP/Studio) | T005, T007, T037, T042 | `ports.ts`, `cli/commands/token.ts` | `headless-reuse.test.ts`, `token-commands.test.ts` |
| US14 | preservar assets/build/desconocido | T033, T046, T047 | separación de superficies, preservación de `$extensions` | `preserve-untouched.test.ts`, `regression-001-007.test.ts`, `preserve-unknown-content.test.ts` |

## Cobertura FR (26/26)

- FR-001..003 (comando estructurado, operaciones de token/grupo): A (`operation.ts`, `command.ts`).
- FR-004..005 (flujo obligatorio, una sola lectura semántica): B/C (`plan-token-mutation.ts`,
  `source-snapshot-reader.ts` reusando `002`/`006`).
- FR-006..008 (plan read-only, diff completo, valores públicos seguros): B (`diff-calculator.ts`,
  `document-model.ts`).
- FR-009..010 (validación pre-write, clasificación block/explicit/never-silent): C (`validate-command.ts`).
- FR-011..012 (política v1 update-all-affected, colisión bloquea): C (`reference-update.ts`,
  `validate-command.ts`).
- FR-013..014 (remove con dependientes bloquea, grupo no vacío bloquea): C (`removal-policy.ts`).
- FR-015..017 (apply transaccional, concurrencia, idempotencia): D (`token-source-writer.ts`,
  `apply-token-mutation.ts`).
- FR-018 (preservación de contenido desconocido): B/D (`candidate-builder.ts`, `preserve-untouched.test.ts`).
- FR-019 (outcomes cerrados): A (`outcome.ts`).
- FR-020 (headless, sin Commander/process/TTY): B/D (`apply-token-mutation.ts`, `plan-token-mutation.ts`).
- FR-021 (contratos `1.0.0` estables): A, E (`result.ts`, `json/dto.ts`).
- FR-022 (paths lógicos, sin absolutos): A, D (`paths.ts`, `token-source-writer.ts`).
- FR-023 (no toca build/assets/host manifest/asset manifest): D, F (`preserve-untouched.test.ts`,
  `regression-001-007.test.ts`).
- FR-024 (batch todo o nada): C, D (`validate-command.ts`, `apply.test.ts`).
- FR-025 (CLI como adapter delgado): E (`cli/commands/token.ts`, `program.ts`).
- FR-026 (fuera de alcance: visual/viewer/asset ops/Figma/IA en el core): documentado en spec/plan; ningún
  Checkpoint las implementa.

## Auditoría constitucional (17/17)

- I–III (un DS por proyecto, archivos locales, DTCG): las mutaciones tocan exclusivamente
  `design-system/tokens/base.tokens.json`; `regression-001-007.test.ts` confirma que build/assets/host
  manifest quedan intactos.
- IV (pipeline): reutiliza la tubería única de `002`/`006` (una lectura/parse/análisis); sin segundo
  traversal ni segundo analyzer.
- V (independencia de framework): casos de uso headless (`headless-reuse.test.ts`); CLI es un adapter
  delgado (FR-025).
- VI–IX (herramienta, edición sin ocultar fuente, validación antes de escribir, contratos antes que
  implementación): `plan` valida el candidato antes de que `apply` escriba; contratos `1.0.0` propios.
- X–XIII (UI N/A, local-first): operación 100% local, sin red, sin backend.
- XIV (seguridad): writer transaccional con backup/restore/verificación posterior, identity check de
  concurrencia, sin `--force`, sin paths absolutos públicos, preservación de `$extensions` desconocidos.
- XV (agentes): `TokenMutationJsonEnvelopeV1` estable e independiente; MCP/Studio futuros reusan
  `planTokenMutation`/`applyTokenMutation` sin reescribir validación/diff/aliases/writer.
- XVI–XVII (incremental/portable): exit codes reutilizando la tabla común (`0/2/3/4/5/6/7/70`); el archivo
  de comando declarativo (`TokenMutationCommandV1`) es JSON portable, sin depender del Studio.

Sin violaciones; principios de UI/contenido (X, XI) N/A para esta feature de CLI headless.

## Hallazgos

- CRITICAL: 0
- HIGH: 0
- MEDIUM: 0
- LOW: 0

## Decisión de diseño documentada (T052)

El writer transaccional de Checkpoint D (`createTokenSourceWriter`) se construyó sobre el seam inyectable
`WriterFileSystem` de `006` en vez de llamar directamente al `SingleFileAtomicWriter` de `005`, porque
`005` no expone un seam de fault-injection y las pruebas de recuperación (T032) exigen simular fallos
antes/después del backup, en el rename y en la verificación posterior/restore. El contrato y el
comportamiento de `005` no se modificaron. Un posible refactor futuro podría extraer una abstracción de
escritura single-file compartida entre `005` y `008`; queda documentado en `plan.md` como no implementado.

## Packaging e instalación (verificados)

- `npm pack --dry-run --json`: incluye `dist/cli/commands/token.js`,
  `dist/application/token-mutations/apply-token-mutation.js`,
  `dist/infrastructure/token-mutations/token-source-writer.js`,
  `dist/infrastructure/reporter/token-mutation-terminal-reporter.js`; excluye `src/`, `tests/`, `specs/`,
  `.agents/`.
- `npm pack` + `npm install <tgz>` real (sin `npm link`, sin symlink al repo): el binario instalado
  ejecuta `token plan`/`token apply`/`token rename`/`token remove` desde un cwd ajeno con espacios y
  Unicode; `token apply --json` emite un envelope propio; el paquete instalado no referencia la raíz del
  repositorio.

## Gates finales registrados

```text
npm run typecheck         → OK
npm run lint              → arch-guard: OK
npm test                  → suite completa en verde (incluye binario, tarball y regresión 001–007)
npm run build             → OK
npm pack --dry-run --json → incluye dist token; excluye src/tests/specs/.agents
git diff --check          → limpio
```

Decisión: **008-token-mutations CERRADA**. No se inicia `009`; no se implementan MCP ni Studio; sin
Figma/scraping/IA/editor visual.
