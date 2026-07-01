# Audit — 010-visual-token-editor

Feature: Visual Token Editor — edición visual de tokens sobre el shell del Design System Viewer (`009`),
que reutiliza sin reescribir la planificación, el diff y el apply transaccional de `008`
(`planTokenMutation`/`applyTokenMutation`). Aprobación explícita obligatoria antes de cualquier escritura;
estados distintos de concurrencia/recovery; recarga de una sesión del Viewer nueva e independiente tras
aplicar.
Cierre auditado sobre el Checkpoint F (T041–T049), creado en el commit
`feat: add editor accessibility, packaging and close`.

## Estado

- User stories: 7/7 cubiertas (US1–US7).
- Functional requirements: 22/22 cubiertos (FR-001–FR-022).
- Success criteria: 9/9 cubiertos (SC-001–SC-009).
- Checkpoints A–F: T001–T049 completos al cierre.
- Tests: suite completa en verde (2040/2040, 367 archivos), incluyendo el binario `view` real con el
  Editor conectado (adapter HTTP real vía `dist/`), el tarball instalado con un apply real desde un cwd
  ajeno, la auditoría estática de accesibilidad, fault injection de concurrencia/recovery reutilizando el
  seam `WriterFileSystem` de `008`, y la regresión `001`–`009`.

## Matriz US → tareas → evidencia

| US | Descripción | Tareas | Evidencia productiva | Evidencia de test |
|---|---|---|---|---|
| US1 | editar el valor de un token vía revisión | T009, T025, T027, T028, T033, T034, T035 | `apply-editor-command.ts`, `review.ts`, `http-server.ts` (`/api/editor/plan`, `/api/editor/apply`) | `rename-move-diff.test.ts`, `approval-boundary.test.ts`, `apply-refresh.test.ts` |
| US2 | crear/duplicar/eliminar tokens de forma segura | T009, T021, T026, T030 | `value-controls.ts`, UI "Token and group administration" form | `conflicts.test.ts`, `no-direct-writes.test.ts` |
| US3 | gestionar alias y referencias | T020, T025, T029 | `command-draft.ts` (`set-alias`/`remove-alias`), UI alias form | `rename-move-diff.test.ts` |
| US4 | organizar grupos | T021, T026 | UI "Token and group administration" form (`create-group`/`rename-group`/`move-group`/`remove-empty-group`) | `conflicts.test.ts` (`group-removal-non-empty`) |
| US5 | editar metadata y tipo con claridad | T019, T020 | `value-controls.ts` (`EditorValueControlV1`), UI "Type and metadata" form | `value-controls.test.ts` |
| US6 | manejar concurrencia y recovery | T033, T034, T036, T038 | `apply-result.ts` (`mapOutcomeToEditorApplyState`, estados `source-changed-concurrently`/`source-unavailable`/`write-error`/`recovery-required`) | `concurrency-recovery.test.ts` |
| US7 | trabajar de forma accesible sin depender del puntero | T012, T023, T041, T042 | UI: labels, `aria-describedby`/`aria-invalid`, live regions, sin drag-and-drop | `form-accessibility.test.ts`, `accessibility.test.ts` |

## Cobertura FR (22/22)

- FR-001..002 (reusa shell/navegación/proyecciones de `009` sin duplicar DTOs): A, C
  (`editor-session.ts` compone sobre `ViewerSessionV1`, nunca reconstruye la sesión).
- FR-003..004 (toda acción se convierte en `TokenMutationCommandV1`; llama a `008` para plan/diff/
  conflicts/warnings): B, C, D (`command-draft.ts`, `plan-editor-command.ts` → `planTokenMutation`).
- FR-005 (aprobación explícita obligatoria; cancel/back-to-edit): D (`state-machine.ts` transición
  `reset`/`change-draft`; UI `renderReviewPanel` approve/cancel/back).
- FR-006 (diff no editable con added/updated/renamed/moved/removed/alias/metadata/group): D
  (`review.ts` `createEditorDiffView`, UI `diffEntryRow`).
- FR-007 (apply solo tras aprobación, identidad de comando/plan): E (`apply-editor-command.ts` llama
  `applyTokenMutation` directamente; 008 re-deriva y rechaza si no es aprobable — nunca duplicado en el
  adapter HTTP).
- FR-008 (tras `applied`, recarga del Viewer y datos refrescados): E (`refresh.ts`-equivalente en
  `apply-editor-command.ts`: `buildViewerSession` nuevo e independiente; UI `refreshCurrentView`).
- FR-009 (operaciones visuales soportadas: create/update-value/update-type/update-description/
  update-category/set-alias/remove-alias/rename/move/duplicate/remove, grupos): C
  (`renderEditorDraftForms`: value/metadata/alias/admin forms).
- FR-010 (preserva políticas de 008: rename/move actualiza referencias, remove con dependientes bloquea,
  grupo no vacío bloquea): D (`conflicts.test.ts` sobre el mismo `planTokenMutation`, nunca reimplementado).
- FR-011 (declared/resolved/current/pending value distinguidos): B, D (`review.ts`/`EditorPlanViewV1`
  distingue `before`/`after` por entrada de diff; `token.ts` de 009 aporta declared/resolved).
- FR-012 (editores de tipo: color/number/dimension/fontFamily/fontWeight/duration/cubicBezier/string/
  boolean): B (`value-controls.ts` `SUPPORTED_EDITOR_VALUE_TYPES`).
- FR-013 (tipos compuestos/no soportados de solo lectura o bloqueados): B (`value-controls.ts`
  `COMPOSITE_TYPES` → `EditorValueControlStateV1` "unsupported"/"composite").
- FR-014 (vistas/estados para detail/value/type/alias/group/plan/diff/approval/apply/recovery): A, D, E
  (`session.ts` `EditorWorkflowStateV1`, `apply-result.ts` `EditorApplyStateV1`).
- FR-015 (plan expired/source changed concurrently/invalid command/blocked/backup/recovery surfaced):
  D, E (`review.ts` `expiredPlan`, `apply-result.ts` estados distintos, UI
  `EDITOR_APPLY_STATE_MESSAGES`).
- FR-016 (UI nunca importa `node:fs`/writer adapters/`applyTokenMutation` directamente): A, arch-guard
  extendido para `src/application/editor/**`; `main.ts` solo usa `fetch` contra `/api/editor/**`.
- FR-017 (contratos públicos solo con paths lógicos/valores seguros; sin paths absolutos/stack/bytes):
  D, E (`review.ts`/`apply-result.ts` mappers; verificado en `rename-move-diff.test.ts`,
  `approval-boundary.test.ts`, `tarball-smoke.test.ts`).
- FR-018 (adapter loopback-only, offline, hereda garantías de 009): C, F (`http-server.ts` reutiliza
  `127.0.0.1`-only; `tarball-smoke.test.ts` offline real).
- FR-019 (accesibilidad: teclado/foco/labels/errores asociados/anuncios/reduced-motion/contraste/no
  color-only): C, F (`accessibility.test.ts` cubre `editor-accessibility-v1.contract.md`).
- FR-020 (alternativas sin drag para mover/reordenar): C (inputs de texto para parent/destination path,
  nunca drop targets).
- FR-021 (fuera de alcance: edición de assets/presets/Figma/scraping/imágenes/IA/MCP/nube/auth/
  multi-theme/editor de componentes): documentado en spec/plan/README/capability-map; ningún checkpoint
  las implementa.
- FR-022 (Core/framework boundary intacto: sin React/DOM/Commander en `application/editor`): A
  (`scripts/arch-guard.mjs` regla `src/application/editor/**`), verificado en
  `tests/architecture/editor/forbidden-imports.test.ts`.

## Cobertura SC (9/9)

- SC-001 (100% de flujos de escritura pasan por preview + aprobación explícita): `approval-boundary.test.ts`,
  `no-direct-writes.test.ts` (cero escrituras antes de aprobar, con o sin conflictos).
- SC-002 (cada operación soportada se completa o bloquea con mensaje específico): `conflicts.test.ts`,
  `value-controls.test.ts`.
- SC-003 (diff visual coincide exactamente con el diff de 008): `rename-move-diff.test.ts` (comparación
  byte-a-byte de `entries`/`summary` entre `planTokenMutation` directo y la ruta del Editor).
- SC-004 (preview fallido/conflicto/cambio concurrente/write-error/verification-error producen mensaje
  específico, nunca error genérico): `EDITOR_APPLY_STATE_MESSAGES` (8 estados distintos),
  `concurrency-recovery.test.ts`.
- SC-005 (apply exitoso recarga el Viewer y muestra datos refrescados en la misma sesión de navegación):
  `apply-refresh.test.ts` (incluye preservación de sección visible vía `currentSectionId`).
- SC-006 (cada editor de tipo soportado tiene al menos un caso válido e inválido): `value-controls.test.ts`
  (ya cubierto en Checkpoint B, sin regresión).
- SC-007 (usuarios solo-teclado completan create/edit/preview/approve/cancel/mover grupo):
  `form-accessibility.test.ts`, `accessibility.test.ts`.
- SC-008 (ningún contrato público expone paths absolutos/bytes/stack/secrets): verificado
  transversalmente en `rename-move-diff.test.ts`, `approval-boundary.test.ts`, `tarball-smoke.test.ts`.
- SC-009 (`neuraz-ds view` con el Editor instalable desde un tarball real, offline, con apply real):
  `tarball-smoke.test.ts` (proceso hijo real del binario instalado, sin `npm link`, plan+apply+refresh
  reales sobre un host con ruta de espacios/Unicode).

## Reuso sin duplicación (008/009)

- **Planner/diff**: `plan-editor-command.ts` llama `planTokenMutation` (008) directamente; el Editor
  NUNCA reconstruye validación, resolución de aliases ni cálculo de diff. `EditorDiffViewV1`/
  `EditorPlanViewV1` son wrappers de presentación (añaden `isEmpty`/`canRequestApproval`), nunca datos
  recalculados — confirmado byte-a-byte en `rename-move-diff.test.ts`.
- **Apply/writer**: `apply-editor-command.ts` llama `applyTokenMutation` (008) directamente, que a su vez
  reutiliza `createTokenSourceWriter`/`WriterFileSystem` (el mismo seam de fault injection de 008). El
  gate de aprobación NO se reimplementa en el adapter HTTP: un comando bloqueado se rechaza dentro de
  `applyTokenMutation` mismo (verificado en `approval-boundary.test.ts` y `no-direct-writes.test.ts`).
- **Viewer**: `editor-session.ts` compone `EditorSessionV1` a partir de un `ViewerSessionV1` ya
  construido por `buildViewerSession` (009); el refresh post-apply invoca `buildViewerSession` de nuevo
  como una sesión NUEVA e independiente (nunca comparte objetos mutables entre la sesión previa a la
  aprobación y la posterior al apply).
- **UI**: un único bundle estático (`src/infrastructure/viewer/ui/main.ts`) sirve Viewer y Editor; el
  Editor solo agrega funciones nuevas, sin bifurcar el shell/CSS/accesibilidad ya cerrados en 009.

## Estados de apply (FR-014/FR-015, US6)

`EditorApplyStateV1` distingue explícitamente: `applied`, `unchanged`, `conflict`,
`source-changed-concurrently`, `source-unavailable`, `write-error`, `verification-error`,
`recovery-required` — cada uno con mensaje textual propio en `EDITOR_APPLY_STATE_MESSAGES` (nunca solo el
nombre crudo del estado, nunca solo color). `recovery-required` tiene precedencia de presentación sobre el
outcome subyacente cuando `recovery.recoveryRequired === true` (decisión ya tomada en Checkpoint A,
confirmada en `concurrency-recovery.test.ts`). Backup/recovery se comunican como texto explícito
(`backupRelativePath`, `recoveryRequired`, `sourceAvailable`).

## Accesibilidad (`editor-accessibility-v1.contract.md`)

Cubierto en `tests/integration/editor/accessibility.test.ts` (7 casos) más
`form-accessibility.test.ts` (Checkpoint C, sin regresión):

- Teclado completo: todas las acciones son `<button>`/`<form>` nativos; cero `dragstart`/`ondrop`/
  `draggable`.
- Labels: `label.htmlFor` explícito en cada control (`labeledInput`/`labeledSelect`).
- Errores asociados por control: `aria-describedby` + `aria-invalid` + `role="alert"` en el input de
  valor (Checkpoint F, T041), con foco movido al control inválido.
- Anuncios: `aria-live="polite"` en el panel de revisión y en el estado del plan/apply (preview,
  aprobación, conflicto, apply, recovery).
- Foco visible, `prefers-reduced-motion` y skip-link heredados sin regresión del shell de 009.
- Ninguna comunicación depende solo del color: swatches siempre acompañados de texto
  (`describeValue`).

## Packaging y regresión (Checkpoint F)

- `npm pack --dry-run --json`: incluye `dist/application/editor/**` completo, el bundle estático único
  (`dist/infrastructure/viewer/ui/main.js`), el adapter HTTP extendido
  (`dist/infrastructure/viewer/http-server.js`) y el CLI actualizado
  (`dist/cli/{composition,index,program,commands/view}.js`); excluye `src/`, `tests/`, `specs/`,
  `.agents/` (`npm-pack.test.ts`, 4 casos).
- Tarball real instalado (`npm install <tgz>`, sin `npm link`/symlinks): proceso hijo real del binario
  ejecuta `view --port 0`, y un cliente HTTP real ejerce `/api/editor/plan` (preview, cero escrituras) y
  `/api/editor/apply` (escritura real, `refresh.state: "reloaded"`) desde un host con ruta de espacios y
  Unicode, sin referencias al repo en ninguna respuesta (`tarball-smoke.test.ts`, 3 casos).
- Regresión `001`–`009`: un apply real del Editor deja `design-system/build/**`, el asset manifest y el
  host manifest byte-estables; `008` CLI (`token plan`/`token apply`), `007` Asset Manager, `006`
  build/export (unchanged en la segunda pasada), `002`/`004`/`005` (validate/inspect/foundations/presets)
  y `001` init (`unchanged`) y `003` (`validate --json` byte-estable) siguen comportándose exactamente
  igual tras el Editor (`regression-001-009.test.ts`, 8 casos).
- CLI real: `neuraz-ds view` conecta el modo Editor mediante `createEditorDependencies()` (nuevo en
  `src/cli/composition.ts`) sin alterar el modo de solo lectura preexistente — verificado manualmente
  contra el binario compilado (`init` → `view --port` → `plan`/`apply` reales sobre un host temporal) y
  cubierto por la suite completa (2040/2040) que incluye los tests de `009` sin `editorServerDeps`
  configurado.
- Documentación: `README.md` (sección "Modo Editor"), `docs/product/capability-map.md` (Editor visual de
  tokens y diff/aprobación marcados `implemented`) y `specs/010-visual-token-editor/quickstart.md`
  (de "planned" a "implemented" con rutas/comandos reales) actualizados exclusivamente en este
  Checkpoint.

## Fuera de alcance (confirmado, sin implementar)

Edición de assets, autoría de presets, Figma, scraping, análisis de imágenes, IA, MCP server dedicado,
nube, autenticación, multi-theme, editor de componentes. Ningún checkpoint A–F los introdujo.

## Gates finales

- `npm run typecheck`: limpio.
- `npm run lint` (`scripts/arch-guard.mjs`): `OK`.
- `npm test`: 2040/2040 (367 archivos).
- `npm run build`: limpio.
- `npm pack --dry-run --json`: 612 archivos, sin `src/`/`tests/`/`specs/`/`.agents/`.
- `git diff --check`: limpio.
- `npm run agent:status -- --feature 010-visual-token-editor`: 49/49, sin checkpoint activo.
- `npm run agent:brief -- --feature 010-visual-token-editor`: rechaza trabajo adicional (feature cerrada).

## Decisión

**010-visual-token-editor: COMPLETADO** — 49/49 tareas, Checkpoints A–F cerrados, 0 bloqueos.
