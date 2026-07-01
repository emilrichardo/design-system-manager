# Audit — 009-design-system-viewer

Feature: Design System Viewer — visualizador local, estrictamente de solo lectura, de tokens y
foundations (Overview, Colors, Typography, Spacing, Radius, Borders, Shadows, Motion, Aliases,
Foundations, Assets, Presets, Issues, Build), proyectado 1:1 desde los casos de uso headless ya cerrados
de `002`–`008`, servido por un adapter `node:http` puro + un bundle estático vanilla TypeScript/DOM (sin
framework, sin dependencia runtime nueva).
Cierre auditado sobre el Checkpoint F (T052–T059), creado en el commit
`feat: add viewer packaging, regression and close`.

## Estado

- User stories: 14/14 cubiertas.
- Functional requirements: 26/26 cubiertos.
- Success criteria: 11/11 cubiertos.
- Constitución: 17/17 principios PASS/N/A, 0 FAIL.
- Checkpoints A–F: T001–T059 completos al cierre.
- Resultado `/speckit-analyze` equivalente: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 contradicciones,
  0 requisitos sin cobertura, 0 marcadores `[NEEDS CLARIFICATION]`, 0 violaciones de constitución.
- Tests: suite completa en verde (1975/1975), incluyendo el binario `view` real, el servidor HTTP real
  (proceso in-process vía `dist/`), el tarball instalado, la auditoría estática de accesibilidad, la
  prueba explícita de cero escrituras (bytes + mtime) y la regresión `001`–`008`.

## Matriz US → tareas → evidencia

| US | Descripción | Tareas | Evidencia productiva | Evidencia de test |
|---|---|---|---|---|
| US1 | abrir un DS local | T010, T021, T023, T026, T027, T044, T045 | `build-session.ts`, `http-server.ts`, `cli/commands/view.ts` | `session-states.test.ts`, `http-server.test.ts`, `view-command.test.ts` |
| US2 | ver overview | T001, T002, T010, T011, T016, T018 | `overview.ts` (`projectOverview`) | `build-session.test.ts`, `overview-navigation.test.ts` |
| US3 | explorar colores | T004, T029, T030, T033, T034 | `contrast.ts`, `color.ts` (`projectColorSwatch`) | `contrast.test.ts` |
| US4 | explorar tipografía | T004, T031, T033, T035 | `typography.ts` (`projectTypography`) | `typography.test.ts` |
| US5 | spacing/radius/borders/shadows/motion | T003, T014, T032, T036 | `foundation.ts` (`projectFoundationCategory`) | `foundation-views.test.ts` |
| US6 | inspeccionar un token | T003, T013 | `token.ts` (`projectToken`) | `contract-shapes.test.ts` |
| US7 | navegar aliases | T005, T040, T041, T047 | `alias.ts` (`projectAlias`, `projectRenameMoveImpactPreview`) | `aliases.test.ts` |
| US8 | explorar assets | T005, T039, T046 | `asset.ts` (`projectAssetsFromList`) | `assets.test.ts` |
| US9 | ver issues | T006, T015, T042, T048 | `issue.ts` (`projectAllIssues`) | `issues.test.ts` |
| US10 | buscar y filtrar | T012, T037, T043 | `search-filter.ts` | `search-filter.test.ts` |
| US11 | estados vacíos/error | T017, T044 | `session.ts` (`mapAnalysisOutcomeToViewerState`/`deriveEmptyState`), UI `STATE_MESSAGES` | `session-states.test.ts` |
| US12 | funcionar offline | T021, T026, T027, T050, T053 | `http-server.ts` (127.0.0.1-only) | `offline.test.ts`, `tarball-smoke.test.ts` |
| US13 | consumir casos de uso headless | T007, T020, T023, T024, T025, T052, T053, T056 | `ports.ts`, `json/map-viewer.ts`, `cli/commands/view.ts` | `forbidden-imports.test.ts`, `headless`-style assertions across all application tests |
| US14 | preservar cero escrituras | T016, T024, T054, T055 | invariantes de solo lectura en toda la capa de aplicación | `zero-write-full-session.test.ts`, `regression-001-008.test.ts` |

## Cobertura FR (26/26)

- FR-001..002 (proyección desde use cases existentes, sin parseo directo): A, B (`ports.ts`,
  `build-session.ts`).
- FR-003 (una sola carga por sesión/refresh; búsqueda sin recarga): B, D/E (`snapshot-session.ts`,
  `search-filter.ts`).
- FR-004 (cero escrituras, invariante transversal): A–F, verificado explícitamente en F
  (`zero-write-full-session.test.ts`, comparación de bytes Y mtime).
- FR-005..006 (contratos versionados, sin bytes/paths absolutos/secrets): A (`data-model.md`,
  `contracts/*.contract.md`).
- FR-007 (estados proyectados, nunca inventados): A, B (`mapAnalysisOutcomeToViewerState` exhaustivo).
- FR-008 (orden determinista): B (`VIEWER_SECTION_ORDER`, orden de documento preservado en foundations).
- FR-009 (detalle de token: declared/resolved/effective/metadata): B, D (`projectToken`).
- FR-010 (política de contraste WCAG 2.1 AA): D (`contrast.ts`).
- FR-011 (tipografía: family/weight/style/size/lineHeight/letterSpacing + font asset): D
  (`projectTypography`).
- FR-012 (foundations restantes: spacing/radius/borders/shadows/motion): B, D
  (`projectFoundationCategory`).
- FR-013 (issues consolidados, 5 fuentes incl. stale-build): E (`projectAllIssues`).
- FR-014 (assets 1:1 de 007, sin bytes/sanitización fabricada): E (`projectAssetsFromList`).
- FR-015 (aliases: chain/dependents/impact preview read-only reusando 008): E (`projectAlias`,
  `projectRenameMoveImpactPreview`).
- FR-016 (navegación/búsqueda sin llamada adicional): D, E (`projectNavigation`, `search-filter.ts`).
- FR-017..018 (presets/build como rollups del Overview, v1 scope): B, D (`data-model.md` "Assumptions").
- FR-019..020 (Core sin Commander/React/browser/`node:http`): A, C (`scripts/arch-guard.mjs` extendido).
- FR-021 (offline, solo loopback): C, E (`http-server.ts` 127.0.0.1-only, `offline.test.ts`).
- FR-022 (accesibilidad: teclado/foco/landmarks/reduced-motion/no-color-only): E (`ui/main.ts`,
  `http-server.ts` shell HTML/CSS, `accessibility.test.ts`).
- FR-023 (JSON envelope propio e independiente): A, C (`json/dto.ts`, `json/map-viewer.ts`).
- FR-024 (fuera de alcance transversal: edición/Figma/scraping/IA/MCP dedicado): documentado en spec/plan;
  ningún Checkpoint las implementa.
- FR-025 (contratos públicos reutilizables, sin duplicar DTOs de 002–008): A (reuso explícito de
  literales/tipos de 002/004/006/007/008 en cada `ViewerXxxV1`).
- FR-026 (regresión histórica intacta): F (`regression-001-008.test.ts`).

## Auditoría constitucional (17/17)

- I–III (un DS por proyecto, archivos locales, DTCG): el Viewer proyecta la misma fuente única; nunca
  escribe (`regression-001-008.test.ts` confirma que build/assets/host manifest quedan intactos).
- IV (pipeline): reutiliza la tubería única de `002`/`004`/`006` (una lectura/parse/análisis por
  request); sin segundo traversal ni segundo analyzer (`build-session.test.ts` cuenta invocaciones).
- V (independencia de framework): Core headless (`src/application/viewer/**`, guard dedicado); UI vanilla
  TS/DOM sin framework (ADR-0026).
- VI–IX (herramienta, edición sin ocultar fuente, validación antes de escribir, contratos antes que
  implementación): N/A para escritura (el Viewer no escribe); contratos `1.0.0` definidos antes de
  implementar (Checkpoint A).
- X–XIII (UI cliente no autoridad, local-first): la UI consume exclusivamente el JSON API local; sin red,
  sin backend remoto.
- XIV (seguridad): sin bytes crudos/paths absolutos/`Error`/stack/secrets en ningún `ViewerXxxV1`; el
  preview de impacto de alias nunca escribe ni persiste (`aliases.test.ts`).
- XV (agentes): `ViewerJsonEnvelopeV1` estable e independiente; el mismo JSON API sirve a `view --json`,
  a la UI y a un futuro consumidor MCP sin reescribir nada.
- XVI–XVII (incremental/portable): exit codes reutilizando la tabla común (`0/3/4/5/6/70`, sin `1`/`2`/`7`
  al ser de solo lectura); bundle estático + adapter portables sin el Studio.

Sin violaciones.

## Hallazgos

- CRITICAL: 0
- HIGH: 0
- MEDIUM: 0
- LOW: 0

## Límites conocidos y decisiones documentadas

- **`readBuildSnapshot` exige el documento de tokens**: un host con `neuraz-ds.config.json` pero sin
  `design-system/tokens/base.tokens.json` surge como `not-found` en el Viewer, no como el `partial` que
  una clasificación cruda de `002` reportaría. No se corrigió con una segunda lectura/análisis (violaría
  FR-003) ni leyendo bytes crudos en la capa de aplicación (violaría el arch-guard). Documentado en
  `build-session.ts` y verificado en `session-states.test.ts`.
- **`007` no recalcula sanitización SVG para assets ya almacenados**: `ViewerAssetV1.sanitization` es
  siempre `null` para toda proyección de lectura (`plan-asset-import.ts` solo la calcula durante el
  import, antes de escribir). Nunca se fabrica un resultado — documentado en `asset.ts`, verificado en
  `assets.test.ts`.
- **Enlace tipografía↔asset por nombre**: `007` no expone metadata de familia tipada en `AssetRecord`; el
  enlace usa una coincidencia difusa contra el nombre base del archivo (única señal disponible),
  documentado en `typography.ts`.
- **Presets/build son rollups, no vistas de detalle profundas** (decisión de alcance v1 en
  `data-model.md` "Assumptions"): las secciones `presets`/`build` muestran `ViewerPresetSummaryV1`/
  `ViewerBuildStatusV1` (recuento/estado), no un listado completo de presets o artifacts — deliberado, no
  una carencia.

## Packaging e instalación (verificados)

- `npm pack --dry-run --json`: incluye `dist/cli/commands/view.js`, `dist/application/viewer/**` y
  `dist/infrastructure/viewer/**` (incluido el bundle estático compilado `ui/main.js`); excluye `src/`,
  `tests/`, `specs/`, `.agents/`.
- `npm pack` + `npm install <tgz>` real (sin `npm link`, sin symlink al repo): el binario instalado
  ejecuta `view --json` desde un cwd ajeno con espacios y Unicode, offline, sin referencias a la raíz del
  repositorio; no escribe bajo `design-system/**`.

## Gates finales registrados

```text
npm run typecheck         → OK
npm run lint               → arch-guard: OK (incluida la extensión T024 para application/viewer)
npm test                   → 351 archivos de test / 1975 tests en verde (incluye binario, servidor HTTP
                              real, tarball, accesibilidad estática, cero-escritura y regresión 001–008)
npm run build              → OK
npm pack --dry-run --json  → incluye dist/cli/commands/view.js + dist/**/viewer/**; excluye src/tests/specs/.agents
git diff --check           → limpio
```

Decisión: **009-design-system-viewer CERRADA**. No se inicia `010-visual-token-editor`; no se implementan
MCP server dedicado, edición de tokens/assets/presets, Figma, scraping ni IA.
