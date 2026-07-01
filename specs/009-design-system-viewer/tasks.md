# Tasks: 009-design-system-viewer

**Input**: `specs/009-design-system-viewer/spec.md`, `plan.md`, `research.md`, `data-model.md`,
`contracts/`, `quickstart.md`
**Scope**: A local, 100% read-only visual projection of the Design System (Overview, Colors, Typography,
Spacing, Radius, Borders, Shadows, Motion, Aliases, Foundations, Assets, Presets, Issues, Build artifacts),
built as a new read projection layer over the existing headless use cases of `002`–`008`. One session load
per open/refresh; zero writes ever; Core stays framework-agnostic (no React/browser/Commander in
`src/application/viewer/**`); a thin `node:http`-only local server serves a pre-built static UI bundle plus
a read-only JSON API.
**Generated**: 2026-06-30
**Status**: Backlog; ninguna tarea completada. Esta especificación no implementa código.

## Execution Rules

- Orden por checkpoint: A → B → C → D → E → F. Cada checkpoint termina con un gate y un commit sugerido.
- Checkpoints amplios: cada tarea es una unidad significativa y verificable; evitar microtareas e informes
  intermedios. Marcar tareas solo dentro del rango del checkpoint en curso.
- Reglas contractuales no negociables (spec, research, data-model, contracts):
  - **Cero escrituras**: ninguna tarea de ninguna checkpoint escribe, borra o modifica un archivo bajo la
    raíz del host, `design-system/**` ni el manifest. No hay writer/candidate builder en este slice.
  - **Una sola carga por sesión**: cada caso de uso reusado (`002`/`004`/`005`/`006`/`007`/`008`) se invoca
    como máximo una vez por sesión/refresh; ninguna vista dispara una segunda lectura/parseo/análisis.
  - **Proyectar, nunca inventar**: todo estado de UI (`loading|ready|empty|invalid-design-system|not-found|
    read-error|partial`) debe trazarse a un outcome ya devuelto por un caso de uso reusado
    (`contracts/viewer-session-outcomes-v1.contract.md`); prohibido `success`/`blocked`/`partial-data`
    fabricado.
  - **Core sin framework**: `src/application/viewer/**` no importa Commander/React/browser/`node:http`
    directo a `design-system/**`; solo `src/infrastructure/viewer/**` conoce el servidor/DOM.
  - **Sin nueva dependencia runtime**: `package.json.dependencies` no gana entradas nuevas por esta
    feature; un bundler para el bundle estático, si se necesita, es `devDependency` solo de empaquetado.
  - **Política de contraste WCAG 2.1 AA**: ya especificada en `spec.md`/`contracts/viewer-color-v1.contract.md`;
    la Checkpoint D solo la implementa, no la redefine.
  - **Alias impact preview**: reusa el plan/diff read-only de `008`; nunca llama `applyTokenMutation`;
    nunca persiste el comando/plan sintético.
  - **Paths públicos lógicos**; sin rutas absolutas/bytes/`Error`/stack/secrets en ningún `ViewerXxxV1`.
- No crear `specs/009-design-system-viewer/audit.md` hasta el cierre del checkpoint F.
- No modificar `design-system/**`, ni los árboles cerrados de `001`–`008`, durante ninguna tarea.

## Checkpoint A — Contracts, projection types and session ports

**Objective**: Tipos puros de cada `ViewerXxxV1` (alineados 1:1 con `contracts/`), el mapeo de outcomes, y
los puertos de dependencias de sesión (`ViewerSessionDependencies` sobre `002`–`008`); sin lectura real,
sin servidor, sin UI.
**Preconditions**: spec/plan/research/data-model/contracts vigentes; `001`–`008` cerradas.

### Tasks

- [X] T001 [US2][US13] Crear `src/application/viewer/session.ts`: tipos `ViewerSessionV1`, `ViewerStateV1`
  y la función pura `mapAnalysisOutcomeToViewerState` (tabla de `contracts/viewer-session-outcomes-v1.contract.md`).
- [X] T002 [US2] Crear `src/application/viewer/overview.ts` y `navigation.ts`: tipos `ViewerOverviewV1`,
  `ViewerNavigationV1`, `ViewerSectionId`, `ViewerSectionSummary` (solo tipos, sin proyección aún).
- [X] T003 [US6][US9] Crear `src/application/viewer/token.ts` y `foundation.ts`: tipos `ViewerTokenV1`,
  `ViewerFoundationV1`, reutilizando literales de `002`/`004`/`006` (sin redefinir sus uniones).
- [X] T004 [US3][US4] Crear `src/application/viewer/color.ts` y `typography.ts`: tipos `ViewerColorV1`,
  `ViewerContrastResult`, `ViewerTypographyV1`, `ViewerLicenseState` (sin implementar la fórmula todavía).
- [X] T005 [US7][US8] Crear `src/application/viewer/alias.ts` y `asset.ts`: tipos `ViewerAliasV1`,
  `ViewerRenameMoveImpactV1`, `ViewerAssetV1`.
- [X] T006 [US9] Crear `src/application/viewer/issue.ts`: tipo `ViewerIssueV1` y las literales `source`
  cerradas (`validation|foundations|assets|aliases|build`).
- [X] T007 [US13] Crear `src/application/viewer/ports.ts`: `ViewerSessionDependencies` (referencias a
  `AnalyzeUseCase` de `002`, `InspectFoundations`/`ProjectFoundationsUseCase` de `004`, `ListPresets` de
  `005`, un puerto de lectura de build/manifest de `006`, `listAssets`/`inspectAsset` de `007`,
  `AnalyzedTokenSource`/plan read-only de `008`); sin Node/Commander/infra concreta.
- [X] T008 [P] [US13][US14] Crear `tests/application/viewer/contract-shapes.test.ts`: cada `ViewerXxxV1`
  cumple la null policy y las exclusiones de `data-model.md` (sin bytes/rutas absolutas/`Error`/secrets),
  usando fixtures construidos a mano (sin sesión real todavía).
- [X] T009 Gate A: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna (tipos nuevos aislados; `001`–`008` sin cambios).
**Suggested commit**: `feat: add viewer contracts, projection types and session ports`
**Exclusions**: sin proyección real, sin servidor, sin UI, sin política de contraste implementada.
**First task next checkpoint**: T010.

## Checkpoint B — Single session load and read-only application layer

**Objective**: `buildViewerSession` real (una invocación por caso de uso reusado), proyecciones de
Overview/Navigation/Token/Foundation/Issue (sin colores/tipografía/assets/aliases todavía), con pruebas de
conteo de llamadas y de cero escrituras.
**Preconditions**: Checkpoint A completo y gate verde.

### Tasks

- [X] T010 [US1][US2] Crear `src/application/viewer/build-session.ts`: `buildViewerSession` — invoca
  `analyze` (`002`), la proyección de foundations embebida en el snapshot de `006`, `listPresets` (`005`) y
  la lectura de build/manifest (`006`), cada una como máximo una vez; aplica `mapAnalysisOutcomeToViewerState`
  + el juicio derivado `empty`.
- [X] T011 [US2] Implementar `projectOverview` en `overview.ts`: agrega validación/tokens/grupos/aliases/
  foundations/presets/build desde el único `ViewerSessionV1` cargado (sin recomputar conteos).
- [X] T012 [US2][US10] Implementar `projectNavigation` en `navigation.ts`: las 14 secciones en orden
  canónico, con `count`/`state` derivados de `projectOverview`/`projectFoundationCategory`.
- [X] T013 [US6] Implementar `projectToken` en `token.ts`: combina `002` `TokenNodeSummary` + `004`
  `FoundationTokenInspection` + `006` `ResolvedTokenRecord` para un path.
- [X] T014 [US5][US6] Implementar `projectFoundationCategory` en `foundation.ts`: reusa `004`
  `FoundationCategoryInspection` + `projectToken` por token, preservando el orden de documento.
- [X] T015 [US9] Implementar `projectIssues` (parcial, sin `assets`/`aliases`/`stale-build` todavía) en
  `issue.ts`: consolida `002` errors/warnings + `004` foundation issues.
- [X] T016 [P] [US1][US14] Crear `tests/application/viewer/build-session.test.ts` (fs temporal reusando los
  fixtures de `002`/`004`/`006`): conteo de invocaciones = 1 por caso de uso reusado; el host root queda
  byte-idéntico antes/después.
- [X] T017 [P] [US11] Crear `tests/application/viewer/session-states.test.ts`: cada outcome de `002`
  (`valid`/`complete-invalid`/`partial`/`not-found`/`read-error`) produce el `ViewerStateV1` correcto,
  incluido el caso `empty` derivado.
- [X] T018 [P] [US2][US5] Crear `tests/application/viewer/overview-navigation.test.ts`: los números del
  overview y de cada sección de navegación igualan los conteos fuente para la misma sesión (SC-003).
- [X] T019 Gate B: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: cero escrituras bajo la raíz del host en cualquier test de esta checkpoint.
**Suggested commit**: `feat: add viewer single-session load and overview projections`
**Exclusions**: sin colores/tipografía/assets/aliases/servidor/UI todavía.
**First task next checkpoint**: T020.

## Checkpoint C — Local HTTP adapter, static UI shell and navigation

**Objective**: Adaptador `node:http`-only que sirve el bundle estático (esqueleto) y una API JSON de solo
lectura (`GET`) respaldada 1:1 por la capa de aplicación; shell de navegación mínimo; guard de arquitectura
que prohíbe imports prohibidos en `src/application/viewer/**`.
**Preconditions**: Checkpoints A–B completos y gates verdes.

### Tasks

- [X] T020 [US1][US13] Crear `src/application/viewer/json/map-viewer.ts` + `ViewerJsonEnvelopeV1`
  (`contracts/viewer-json-envelope-v1.contract.md`): `formatVersion` primero, `section`, `state`, `data`.
- [X] T021 [US1][US12] Crear `src/infrastructure/viewer/http-server.ts`: servidor `node:http` puro
  (`127.0.0.1`, puerto efímero por defecto), rutas `GET /api/session` y `GET /api/section/:id`, sirve el
  bundle estático desde `src/infrastructure/viewer/ui/dist/`; nunca `POST`/`PUT`/`DELETE`.
- [X] T022 [US1] Crear el esqueleto de `src/infrastructure/viewer/ui/` (TypeScript vanilla + DOM): shell de
  navegación con las 14 secciones canónicas, `fetch` solo contra `http://127.0.0.1:<port>/api/**`.
- [X] T023 [US13] Crear `src/cli/commands/view.ts` (adapter fino) y conectar `program.ts`/`composition.ts`:
  `neuraz-ds view [--port <n>] [--json]`; `--json` imprime `ViewerJsonEnvelopeV1` de la sesión sin abrir
  servidor ni navegador.
- [X] T024 [US14][US19-guard] Extender `scripts/arch-guard.mjs` (o crear un chequeo equivalente) para
  prohibir, dentro de `src/application/viewer/**`: imports de `node:http`, DOM/`window`/`document`,
  Commander, y cualquier puerto de escritura (`*WriterPort`/`*Writer`).
- [X] T025 [P] [US13] Crear `tests/architecture/viewer/forbidden-imports.test.ts`: falla si
  `src/application/viewer/**` importa algo prohibido por T024; falla si `src/domain/viewer/**` existe
  (decisión de `plan.md`: no hay paquete de dominio nuevo).
- [X] T026 [P] [US1][US12] Crear `tests/integration/viewer/http-server.test.ts`: `GET /api/session`
  responde un `ViewerJsonEnvelopeV1` válido; ningún método distinto de `GET` está soportado; funciona con
  la interfaz de red del proceso deshabilitada salvo loopback (offline, FR-021).
- [X] T027 [P] [US13] Crear `tests/cli/view-command.test.ts`: `view --json` no abre servidor ni navegador,
  imprime exactamente un envelope, exit 0 para `ready`/`empty`.
- [X] T028 Gate C: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: cero escrituras; `001`–`008` sin cambios de comportamiento/JSON/exit codes.
**Suggested commit**: `feat: add viewer http adapter, static shell and view command`
**Exclusions**: sin colores/tipografía/assets/aliases/issues completos, sin accesibilidad completa.
**First task next checkpoint**: T029.

## Checkpoint D — Colors, typography and remaining foundation views

**Objective**: Política de contraste WCAG 2.1 AA implementada como función pura; proyección de colores y
tipografía (con enlace a assets de fuente de `007`); vistas de Spacing/Radius/Borders/Shadows/Motion sobre
`projectFoundationCategory` ya existente.
**Preconditions**: Checkpoints A–C completos y gates verdes.

### Tasks

- [ ] T029 [US3] Crear `src/application/viewer/contrast.ts`: `computeContrast` — luminancia relativa +
  ratio WCAG 2.1 §1.4.3 sobre sRGB; sin nueva dependencia (aritmética cerrada); `not-computable` cuando el
  valor no es reducible a sRGB.
- [ ] T030 [US3] Implementar `projectColorSwatch` en `color.ts`: `sRgb` derivado una vez del
  `resolvedValue`; `contrast` solo cuando se solicita un par texto/fondo, usando `computeContrast`.
- [ ] T031 [US4] Implementar `projectTypography` en `typography.ts`: subcampos resueltos (family/weight/
  style/size/lineHeight/letterSpacing) leídos tal cual; `linkedFontAsset` por coincidencia de familia contra
  `007` `listAssets` (una sola consulta reusada de la sesión); `licenseState` derivado.
- [ ] T032 [US5] Conectar las vistas Spacing/Radius/Borders/Shadows/Motion en la UI (`src/infrastructure/
  viewer/ui/`) sobre `GET /api/section/:id` reusando `ViewerFoundationV1` sin una quinta forma de contrato.
- [ ] T033 [US3][US4] Conectar las vistas Colors/Typography en la UI: swatches, selector de par texto/fondo,
  previsualización tipográfica, estado de licencia visible.
- [ ] T034 [P] [US3] Crear `tests/application/viewer/contrast.test.ts`: casos `pass`/`fail`/
  `not-computable` para normal/large text y no-texto, valores límite (4.5:1/3:1) exactos.
- [ ] T035 [P] [US4] Crear `tests/application/viewer/typography.test.ts`: coincidencia de familia con/sin
  asset, `licenseState` correcto en los tres casos, subcampos ausentes ⇒ `null` (nunca default).
- [ ] T036 [P] [US5] Crear `tests/application/viewer/foundation-views.test.ts`: cada categoría restante
  (spacing/radius/border/shadow/motion) lista exactamente los tokens que `004` le asigna, mismos conteos que
  el Overview.
- [ ] T037 [P] [US10] Crear `tests/application/viewer/search-filter.test.ts` (alcance inicial: tokens):
  búsqueda por path/categoría/nivel/tipo opera sobre la sesión ya cargada; cero invocaciones adicionales de
  casos de uso reusados durante la búsqueda.
- [ ] T038 Gate D: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: la política de contraste no altera ningún valor de token; `001`–`008` byte-estables.
**Suggested commit**: `feat: add viewer contrast policy, colors and typography views`
**Exclusions**: sin assets/aliases/issues completos, sin accesibilidad completa todavía.
**First task next checkpoint**: T039.

## Checkpoint E — Assets, aliases, issues, search completion and accessibility

**Objective**: Vista de Assets (1:1 de `007`), vista de Aliases con impact preview read-only reusando `008`,
consolidación completa de Issues (incluida `stale-build`), extensión de búsqueda a assets/foundations, y
los requisitos de accesibilidad de `spec.md` implementados y probados.
**Preconditions**: Checkpoints A–D completos y gates verdes.

### Tasks

- [ ] T039 [US8] Implementar `projectAsset` en `asset.ts`: mapeo 1:1 desde `007` `AssetRecord`/
  `AssetInspection`/`AssetListResult`; sin bytes crudos.
- [ ] T040 [US7] Implementar `projectAlias` en `alias.ts`: `chain`/`dependents`/`state` desde `002`/`006`/
  `008` `AnalyzedTokenSource.dependentsOf`.
- [ ] T041 [US7] Implementar `projectRenameMoveImpactPreview`: comando sintético `rename-token`/
  `move-token` descartable → plan/diff read-only de `008`; nunca `applyTokenMutation`; nunca persistido.
- [ ] T042 [US9] Completar `projectIssues`: añade `007` `AssetIssue`, `002` alias states no válidos, y el
  flag `stale-build` (comparación de hash de fuente vs. manifest de `006`).
- [ ] T043 [US10] Extender búsqueda/filtro (`search-filter.ts`) a assets (kind/MIME/licencia) y a
  foundations (categoría/nivel) sobre la misma sesión cargada; sin llamadas adicionales.
- [ ] T044 [US1][US11] Conectar en la UI los estados `loading|ready|empty|invalid-design-system|not-found|
  read-error|partial` para cada sección (nunca pantalla en blanco en `partial`).
- [ ] T045 [US1][accessibility] Implementar navegación por teclado + foco visible (≥3:1) + landmarks
  semánticos + `prefers-reduced-motion` + alternativas textuales a swatches/iconos/estados en
  `src/infrastructure/viewer/ui/`, per la sección Accessibility de `spec.md`.
- [ ] T046 [P] [US8] Crear `tests/application/viewer/assets.test.ts`: paridad campo a campo con `007`,
  `sanitization` solo para SVG, `license.status === "unspecified"` ⇒ identifier/notice nulos.
- [ ] T047 [P] [US7] Crear `tests/application/viewer/aliases.test.ts`: dependientes correctos, preview de
  impacto nunca escribe ni persiste, `blockingReason` reusa los códigos de `008` sin inventar nuevos.
- [ ] T048 [P] [US9] Crear `tests/application/viewer/issues.test.ts`: total consolidado = suma de fuentes +
  `stale-build`; `stale-build` siempre `warning`.
- [ ] T049 [P] [US1][accessibility] Crear `tests/integration/viewer/accessibility.test.ts` (DOM headless o
  auditoría estática de landmarks/aria/foco/reduced-motion): cada requisito testable de la sección
  Accessibility tiene una aserción propia.
- [ ] T050 [P] [US12] Crear `tests/integration/viewer/offline.test.ts`: sesión completa (abrir + cada
  vista + búsqueda + preview de alias) exitosa con la interfaz de red deshabilitada salvo loopback.
- [ ] T051 Gate E: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna mutación de `design-system/**`; `001`–`008` byte-estables; sin llamada a
`applyTokenMutation` en ningún test.
**Suggested commit**: `feat: add viewer assets, aliases, issues and accessibility`
**Exclusions**: sin empaquetado/tarball todavía; sin MCP server dedicado (reusa el mismo JSON API).
**First task next checkpoint**: T052.

## Checkpoint F — Packaging, regression and close

**Objective**: Empaquetado del bundle estático + adapter en el tarball, instalación real, regresión
granular `001`–`008`, documentación actualizada y cierre con auditoría.
**Preconditions**: Checkpoints A–E completos y gates verdes.

### Tasks

- [ ] T052 [US13] Crear `tests/integration/viewer/npm-pack.test.ts`: `npm pack --dry-run --json` incluye
  `dist/cli/commands/view.js`, `dist/infrastructure/viewer/**` (incluido el bundle estático compilado) y
  `dist/application/viewer/**`; excluye `src/`, `tests/`, `specs/`, `.agents/`.
- [ ] T053 [US13][US12] Crear `tests/integration/viewer/tarball-smoke.test.ts`: `npm pack` real + `npm
  install <tgz>` (sin `npm link`); `view --json` desde un cwd ajeno, offline, sin referencias al repo.
- [ ] T054 [P] [US14] Crear `tests/integration/viewer/regression-001-008.test.ts`: ninguna sesión del
  Viewer modifica `design-system/build/**`, `design-system/assets/**`, el manifest del host, el manifest de
  assets ni el resultado de `token plan`/`token apply` de `008`; `001`–`008` byte-estables.
- [ ] T055 [P] [US14] Crear `tests/integration/viewer/zero-write-full-session.test.ts`: sesión completa
  (cada vista + búsqueda + preview de alias) deja el host root byte-idéntico (SC-007).
- [ ] T056 [US13] Actualizar `README.md` y `docs/product/capability-map.md`: comando `view`, arquitectura
  del adapter (`node:http` + bundle estático), estados soportados, invariante de cero escrituras; marcar la
  capacidad "Visualizador del Design System" como implementada.
- [ ] T057 [US1] Actualizar `specs/009-design-system-viewer/quickstart.md` con el flujo reproducible real y
  los estados/exit codes definitivos (reemplazando el marcador "planned — not yet implemented").
- [ ] T058 Gate F (suite completa): `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  `npm pack --dry-run --json`, `git diff --check`.
- [ ] T059 [US14] Crear `specs/009-design-system-viewer/audit.md` con trazabilidad (14/14 US, 26/26 FR,
  11/11 SC, 17/17 Constitution), hallazgos (0 CRITICAL/HIGH/MEDIUM) y gates finales; cerrar la feature.

**Regression**: T054/T055 prueban que `001`–`008` y el host root no cambian comportamiento, bytes, JSON ni
exits; que ninguna sesión del Viewer produce un efecto de escritura observable.
**Suggested commit**: `feat: add viewer packaging, regression and close`
**Exclusions**: no iniciar `010-visual-token-editor`; no implementar MCP server dedicado, Figma, scraping ni
IA; sin edición de tokens/assets/presets.
**First task next checkpoint**: ninguno; F cierra `009`.

## Dependencies

```text
A → B → C → D → E → F
```

Reglas duras (no violar):
- Ninguna tarea de B–F añade una segunda invocación de un caso de uso reusado por sesión (A/B fijan el
  contrato de una sola carga).
- El servidor HTTP (C) no precede a la capa de aplicación de sesión (B).
- Los proyectores de colores/tipografía (D) no preceden al `projectToken`/`projectFoundationCategory`
  genéricos (B).
- El preview de impacto de alias (E) no precede a los puertos read-only de `008` declarados en A (T007).
- Ninguna tarea escribe bajo `design-system/**`, el manifest del host o cualquier árbol de `001`–`008`.

## Parallel Opportunities

- En A: T002–T006 son tipos independientes por vista (`[P]` implícito entre archivos distintos; T008 marca
  explícitamente el test de formas).
- En B/D/E: toda tarea marcada `[P]` edita un archivo de test distinto e independiente.
- En F: T054/T055 son ramas de regresión independientes.

## Traceability — User Stories → Tasks (14/14)

| US | Tasks | US | Tasks |
|---|---|---|---|
| US1 open a local DS | T010, T021, T023, T026, T027, T044, T045 | US8 explore assets | T005, T039, T046 |
| US2 view overview | T001, T002, T010, T011, T016, T018 | US9 view issues | T006, T015, T042, T048 |
| US3 explore colors | T004, T029, T030, T033, T034 | US10 search and filter | T012, T037, T043 |
| US4 explore typography | T004, T031, T033, T035 | US11 empty/error states | T017, T044 |
| US5 spacing/radius/borders/shadows/motion | T003, T014, T032, T036 | US12 work offline | T021, T026, T027, T050, T053 |
| US6 inspect a token | T003, T013 | US13 consume headless use cases | T007, T020, T023, T024, T025, T052, T053, T056 |
| US7 navigate aliases | T005, T040, T041, T047 | US14 preserve zero writes | T016, T024, T054, T055 |

## Traceability — Functional Requirements → Checkpoints

| FR | Checkpoint | FR | Checkpoint |
|---|---|---|---|
| FR-001..002 | A, B | FR-014 | E |
| FR-003 | B, D, E (search) | FR-015 | E |
| FR-004 | A–F (invariante transversal) | FR-016 | D, E |
| FR-005..006 | A | FR-017..018 | B, D |
| FR-007 | A, B | FR-019..020 | A, C |
| FR-008 | B | FR-021 | C, E |
| FR-009 | B | FR-022 | E |
| FR-010 | D | FR-023 | A, C |
| FR-011 | D | FR-024 | A–F (fuera de alcance transversal) |
| FR-012 | B, D | FR-025 | A |
| FR-013 | E | FR-026 | A–F (invariante transversal) |
