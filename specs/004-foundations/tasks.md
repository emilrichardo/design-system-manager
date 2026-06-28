# Tasks: 004-foundations

**Feature**: Read-only foundations view (`neuraz-ds foundations` [+ `--json`]). **Base**: `5769f16`.
**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Data model**: [data-model.md](data-model.md)
· **Contracts**: [contracts/](contracts/) · **ADR**: 0014–0017.

> **Reglas globales**: solo lectura del DS; reutiliza el análisis único de `002` (1 read, 1
> `JSON.parse`, 1 análisis DTCG) + **una** pasada de metadata `O(nodes)` sobre `parsed` (sin I/O, sin
> re-resolver alias/tipos/estadísticas, sin mutar); clasificación por metadata `$extensions` (nivel) y
> por segmento canónico exacto del path (categoría); sin tocar `001`/`002`/`003` ni el JSON v1.
> Cada tarea: `Done:` + `Test:`. `[P]` = paralelizable (archivos distintos, sin dependencia mutua).
> Ningún checkpoint avanza solo: typecheck + lint + tests acumulados + build verdes antes de seguir.

---

## Checkpoint A — Modelos y registro foundation (dominio + tipos de result)

- [X] T001 [P] [US2] Definir `FoundationLevel` (`primitive|semantic|unclassified`), `FoundationLevelSource` (`token|group|none|invalid`) y `FoundationLevelResolution` (`level/source/sourcePath/valid`) en `src/domain/foundations/foundation-level.ts` (tipos puros).
  - Done: tipos type-only; `unclassified` documentado como estado derivado (no persistible); sin Node/CLI.
  - Test: `tests/unit/foundations/foundation-level.test.ts` — invariantes (source token/group ⇒ level∈{primitive,semantic}; none ⇒ unclassified/null; invalid ⇒ unclassified/valid=false).
- [X] T002 [US2] [US7] Crear el registro inmutable de categorías en `src/domain/foundations/foundation-category.ts`: `FoundationCategoryId` (9 ids), `FoundationCategoryDefinition` (`id/displayOrder/supportedTypes/validationDepth/allowsPrimitive/allowsSemantic`) y `FOUNDATION_CATEGORIES` en orden canónico (color..motion, displayOrder 0–8). Sin valores/escala/preset/CSS/componentes.
  - Done: 9 definiciones; supportedTypes según [foundation-category-definition-v1](contracts/foundation-category-definition-v1.contract.md); solo `color` `validationDepth:"deep"`; `Object.freeze` (registro y arrays).
  - Test: incluido en T005.
- [X] T003 [P] [US3] Definir `FoundationCategoryState` (`absent|partial|complete|invalid`) y `FoundationCategoryRef` (`FoundationCategoryId|"unresolved"`) en `src/domain/foundations/category-state.ts`.
  - Done: type-only; precedencia documentada `invalid>partial>complete>absent`.
  - Test: cubierto por T005 + reducer T028.
- [X] T004 [P] [US7] [US8] Definir códigos de issue foundation en `src/domain/foundations/foundation-issue.ts` (constantes estables: `foundation-level-invalid`, `foundation-forbidden-dependency`, `foundation-token-unclassified`, `foundation-category-unresolved`, `foundation-type-mismatch`) reutilizando la forma `AnalysisIssue` de `002` (sin duplicar tipo).
  - Done: solo constantes/estructura; sin `context`/stack; severidades documentadas.
  - Test: `tests/unit/foundations/foundation-issue.test.ts` — códigos estables y únicos; severidades correctas.
- [X] T005 [P] [US1] [US7] `tests/unit/foundations/foundation-category.test.ts` — registro.
  - Done: n/a (test).
  - Test: 9 ids únicos; orden 0–8 continuo y canónico; solo color deep; supportedTypes esperados; registro/arrays congelados (mutación lanza); sin claves de valor/preset.
- [X] T006 [US7] Definir los tipos del resultado público en `src/application/foundations/foundations-ports.ts`: `FoundationTokenInspection`, `FoundationCategoryInspection`, `FoundationsSummary`, `FoundationsValidation`, `FoundationsInspection`, `FoundationsResult` (unión discriminada por outcome) — por [data-model.md](data-model.md) §4–§7.
  - Done: capa aplicación; JSON-safe; sin AST/`$extensions`/Error; reutiliza `AnalysisIssue`/`AnalysisLimitsResult`/`AnalysisHost`/`HostError`/`StructuralState` de dominio.
  - Test: cubierto por los mappers/use-case (T020/T034) que tipan contra estos tipos.
- [X] T007 [P] [US7] Barrels `src/domain/foundations/index.ts` y `src/application/foundations/index.ts`; reexport mínimo en `src/application/index.ts` (tipos + registro + use case a medida que existan).
  - Done: API headless disponible; arch-guard OK (dominio/aplicación sin Node/CLI/infra).
  - Test: `tests/unit/foundations/exports.test.ts` — importa el registro y un tipo desde el índice público.
- [X] T008 [US7] `tests/unit/foundations/dto-invariants.test.ts` — invariantes runtime que TS no garantiza.
  - Done: n/a (test).
  - Test: sobre literales de muestra (`FoundationsResult` por outcome) valida ausencia recursiva de `undefined` y presencia de campos estables.

**Checkpoint A** → typecheck/lint/tests/build verdes. Commit sugerido: `feat: add foundation models and registry`.

---

## Checkpoint B — Lectura y resolución de metadata (`$extensions`)

- [X] T009 [US2] [US8] Implementar el parser de declaración foundation en `src/application/foundations/parse-foundation-extension.ts`: lee `$extensions["ar.neuraz.design-system-manager"].foundation.level` de **un nodo** y devuelve `{ kind: "primitive"|"semantic"|"absent"|"invalid", reason? }`.
  - Done: detecta ausente / namespace no-objeto / `foundation` no-objeto / `level` no-string / valor no permitido / `"unclassified"` persistido (inválido); preserva propiedades desconocidas (no muta); por [foundation-extension-v1](contracts/foundation-extension-v1.contract.md).
  - Test: incluido en T012.
- [X] T010 [US2] Implementar `resolveFoundationLevel` en `src/application/foundations/resolve-level.ts`: precedencia *token propio → grupo ancestro más cercano → `unclassified`*, devolviendo `FoundationLevelResolution`.
  - Done: el token sobrescribe al grupo; convención Neuraz (no DTCG); no infiere por path/nombre/`$type`/alias/manifest/config; declaración inválida ⇒ `unclassified`/`source:"invalid"`/`sourcePath` del declarante; por [foundation-level-resolution-v1](contracts/foundation-level-resolution-v1.contract.md).
  - Test: incluido en T012.
- [X] T011 [US8] Implementar la **pasada de metadata `O(nodes)`** en `src/application/foundations/metadata-pass.ts`: recorre **una vez** `analysis.documents["design-system/tokens/base.tokens.json"].parsed`, construye un índice `path → FoundationLevelResolution` (+ declaraciones inválidas con su path) y deduplica las inválidas por declaración.
  - Done: sin filesystem, sin segundo `JSON.parse`, sin re-resolver alias/tipos/estadísticas, sin mutar `parsed`; orden por inserción del objeto (determinista); **una** `foundation-level-invalid` por declaración (no por descendiente).
  - Test: incluido en T012 + spies en T037.
- [X] T012 [P] [US2] [US8] `tests/unit/foundations/metadata-resolution.test.ts`.
  - Done: n/a (test).
  - Test: metadata en token; en grupo; varios ancestros (más cercano gana); override de token sobre grupo; sin metadata → unclassified; cada forma inválida; **grupo inválido con 500 descendientes → 1 issue**; descendientes no inventan nivel; `$extensions` desconocido intacto; input congelado; determinismo.

**Checkpoint B** → verdes. Commit: `feat: add foundation metadata resolution`.

---

## Checkpoint C — Proyección de tokens y categorías

- [X] T013 [US1] [US3] Implementar `resolveFoundationCategory(path)` en `src/application/foundations/resolve-category.ts`: primer segmento canónico exacto == `FoundationCategoryId`, si no `"unresolved"`.
  - Done: match exacto; sin plurales/sinónimos/normalización/case-folding/locale; sin inferencia por `$type`; función pura; por [foundation-category-definition-v1](contracts/foundation-category-definition-v1.contract.md).
  - Test: incluido en T014.
- [X] T014 [P] [US1] [US3] `tests/unit/foundations/resolve-category.test.ts`.
  - Done: n/a (test).
  - Test: las 9 ids; `colors`/`space`/`font`/`size`/`Color` → unresolved; primer segmento vacío/path malformado → unresolved; case-sensitive; determinismo; sin mutación.
- [X] T015 [US1] Implementar la compatibilidad categoría/tipo en `src/application/foundations/type-compatibility.ts`: `(category, effectiveType) → "compatible"|"mismatch"|"unknown"` usando el `effectiveType` ya calculado por `002` (sin re-resolver `$type`).
  - Done: compatible si `effectiveType ∈ supportedTypes`; `unknown` si tipo ausente/no reconocido; mismatch en otro caso; emite `foundation-type-mismatch` (warning) sin duplicar issues DTCG de `002`.
  - Test: incluido en T016.
- [X] T016 [P] [US1] `tests/unit/foundations/type-compatibility.test.ts`.
  - Done: n/a (test).
  - Test: tabla completa (spacing/radius/sizing+dimension, opacity+number, color+color = compatible; spacing+color, color+dimension = mismatch); tipo ausente/desconocido → unknown; tipo recuperado por alias; no duplica `dtcg-type-not-deeply-inspected`.
- [X] T017 [US1] [US7] Implementar `projectFoundationToken` en `src/application/foundations/project-token.ts`: une `TokenNodeSummary` (de `analysis.nodes`, por path) + nivel efectivo (T011) + categoría (T013) → `FoundationTokenInspection`.
  - Done: conserva solo campos aprobados (path/category/level/levelSource/levelSourcePath/effectiveType/kind/aliasTarget/aliasState/trust); copias defensivas; sin AST/`$extensions`/`$value`/Error/Map; no muta el nodo.
  - Test: incluido en T018.
- [X] T018 [P] [US1] [US7] `tests/unit/foundations/project-token.test.ts`.
  - Done: n/a (test).
  - Test: primitive/semantic/unclassified; categoría resuelta y unresolved; alias (target/state/effectiveType/trust reutilizados); input congelado; copias defensivas; determinismo; sin campos prohibidos.

**Checkpoint C** → verdes. Commit: `feat: add foundation token and category projection`.

---

## Checkpoint D — Estados, dependencias, validación y outcome

- [X] T019 [US4] [US7] Implementar la validación de dependencias en `src/application/foundations/validate-dependencies.ts`: reglas primitive→valor/primitive, semantic→primitive/semantic; **primitive→semantic = `foundation-forbidden-dependency`**.
  - Done: reutiliza `aliasTarget`/`aliasState`/`effectiveType`/`trust` y el grafo ya construido por `002` (sin re-resolver); niveles de ambos extremos vía índice (T011); cadenas (primitive→primitive→semantic) evaluadas sobre datos retenidos, sin segunda resolución.
  - Test: incluido en T020.
- [X] T020 [P] [US4] [US5] [US6] [US7] `tests/unit/foundations/validate-dependencies.test.ts`.
  - Done: n/a (test).
  - Test: primitive concreto; primitive→primitive; semantic→primitive; semantic→semantic; **primitive→semantic** (forbidden); cadena transitiva; cycle; missing; alias-to-group; target unclassified/unresolved; NO duplica issues de `002` (missing/cycle/to-group surfaced por referencia).
- [X] T021 [US3] Implementar el reductor de estado de categoría en `src/domain/foundations/category-state.ts` (`computeCategoryState`): precedencia `invalid > partial > complete > absent`.
  - Done: absent = sin tokens; invalid = metadata inválida/forbidden/cycle/missing/to-group/type-mismatch invalidante; partial = unclassified/limits.partial/doc incompleto; complete = todos clasificados y válidos dentro de la profundidad soportada (sin roster de valores); categorías superficiales **pueden** ser complete.
  - Test: incluido en T022.
- [X] T022 [P] [US3] `tests/unit/foundations/category-state.test.ts`.
  - Done: n/a (test).
  - Test: matriz de la spec/[foundations-result-v1](contracts/foundations-result-v1.contract.md) — sin tokens→absent; solo unclassified→partial; clasificados válidos→complete; mezcla→partial; metadata inválida/forbidden/type-mismatch→invalid; límite→partial; superficial completa→complete; unresolved no invalida otra categoría.
- [X] T023 [US3] Implementar `computeFoundationsSummary` en `src/application/foundations/summary.ts` (conteos deterministas de categorías por estado + tokens por nivel + unresolved + issues por severidad; reusa limits).
  - Done: no recalcula estadísticas DTCG; orden estable; copias defensivas.
  - Test: `tests/unit/foundations/summary.test.ts` — vacío, solo-absent, mezcla, todos-complete, invalid dominante, con limits; determinismo.
- [X] T024 [US3] [US7] Implementar `projectFoundations` en `src/application/foundations/project-foundations.ts`: ensambla las 9 `FoundationCategoryInspection` (orden canónico) + `unresolved` + summary + validation a partir del análisis + índice de metadata.
  - Done: pura; todas las categorías presentes (incl. absent); tokens en orden de `002`; issues estables; reutiliza `validation.limits` de `002`.
  - Test: incluido en T026.
- [X] T025 [US2] [US7] Implementar el clasificador de outcome global en `src/application/foundations/classify-foundations-outcome.ts`: precedencia `not-found > read-error > structural-partial > foundations-invalid > foundations-partial > valid`; reutiliza `exitCodeForOutcome` en la capa CLI (no aquí).
  - Done: reusa los 5 outcomes de `002`; `unclassified`/type-mismatch → partial (no complete-invalid); sin nueva tabla.
  - Test: incluido en T026.
- [X] T026 [P] [US2] [US3] [US4] `tests/unit/foundations/foundations-outcome.test.ts`.
  - Done: n/a (test).
  - Test: valid completo; todas absent (valid); partial por unclassified; partial por limits; foundations-invalid; structural-partial + invalid (gana structural-partial); read-error + recuperable; not-found; init→partial. Distinción estructural vs foundations preservada (structuralState + category states + issues).

**Checkpoint D** → verdes. Commit: `feat: add foundation states, dependency validation and outcome`.

---

## Checkpoint E — Caso de uso headless

- [X] T027 [US12] [US13] Definir el puerto de reporter mínimo `FoundationsReporter` en `src/application/foundations/foundations-ports.ts` centrado en `completed(result)` (más eventos solo si la presentación los necesita), coherente con `002`.
  - Done: sin eventos inútiles; type-only.
  - Test: cubierto por reporters T040/T049.
- [X] T028 [US1] [US3] [US4] Implementar `inspectFoundations(input, deps)` en `src/application/foundations/inspect-foundations.ts`: invoca `analyze(input)` **una vez** (AnalyzeUseCase enlazado), ejecuta la pasada de metadata + proyección, produce `FoundationsResult` (unión discriminada), notifica `reporter.completed`.
  - Done: sin fs/parse/alias/type/escritura/CLI/ANSI/JSON/exit-codes; `not-found` sin inspección; recuperables conservan inspección.
  - Test: incluido en T029.
- [X] T029 [P] [US1] [US4] `tests/unit/foundations/inspect-foundations.test.ts` (analyzer fake/spy).
  - Done: n/a (test).
  - Test: 5 outcomes; init; metadata válida/ inválida; categorías; aliases; limits; **analyze llamado una vez**; sin mutación; determinismo.

**Checkpoint E** → verdes. Commit: `feat: add foundations headless use case`.

---

## Checkpoint F — Presentación humana

- [X] T030 [US1] [US3] Implementar `FoundationsTerminalReporter` en `src/infrastructure/reporter/foundations-terminal-reporter.ts` (implementa `FoundationsReporter`, usa `OutputWriter`).
  - Done: escribe en `completed`; muestra resumen, 9 categorías en orden canónico con estado + conteos (primitive/semantic/unclassified), unresolved, issues, limits; sin prompts/colores obligatorios; stdout/stderr por outcome; cota visual de tokens opcional documentada (modelo headless sin truncar).
  - Test: incluido en T031.
- [X] T031 [P] [US1] [US3] [US11] `tests/unit/cli/foundations-terminal-reporter.test.ts` (IO falso).
  - Done: n/a (test).
  - Test: valid/complete-invalid/partial/not-found/read-error; init; 9 categorías presentes; unresolved; issues; limits; sin TTY; determinismo; cota (si existe) sin truncar el modelo.

**Checkpoint F** → verdes. Commit: `feat: add foundations human reporter`.

---

## Checkpoint G — Contrato y presentación JSON (separado de 003)

- [X] T032 [P] [US5] Crear `FOUNDATIONS_JSON_FORMAT_VERSION = "1.0.0"` en `src/application/foundations/json/format-version.ts` (independiente del de 003).
  - Done: literal inmutable; sin lectura dinámica.
  - Test: `tests/unit/foundations/json/format-version.test.ts` — valor exacto.
- [X] T033 [US5] [US7] Definir los DTO JSON en `src/application/foundations/json/dto.ts`: `FoundationsJsonEnvelopeV1` (+ `JsonFoundationsResultV1`, `JsonFoundationTokenV1`, `JsonFoundationIssueV1`) por [foundations-json-result-v1](contracts/foundations-json-result-v1.contract.md). NO amplía `JsonEnvelopeV1`/`JsonCommand`/`JSON_FORMAT_VERSION` de 003.
  - Done: 4 campos base; `error` solo en not-found/internal-error; null-policy; sin `undefined`.
  - Test: cubierto por mappers T035/T036.
- [X] T034 [US5] Implementar los mappers JSON en `src/application/foundations/json/map-foundations.ts`: `FoundationsResult → FoundationsJsonEnvelopeV1` (host/result/categories/tokens/summary/validation/limits/issues/unresolved) — puros, JSON-safe, no serializan dominio.
  - Done: todos los token paths (sin cota 200); null-policy; sin AST/`$extensions`/Error.
  - Test: incluido en T037.
- [X] T035 [P] [US8] Implementar `toFoundationsInternalErrorEnvelope(command="foundations")` en `src/application/foundations/json/map-internal-error.ts` (propio; NO reutiliza el de 003 typed a `validate|inspect`).
  - Done: `{formatVersion, command:"foundations", outcome:"internal-error", result:null, error:{code:"internal-cli-error", message}}`; mensaje fijo seguro.
  - Test: incluido en T037.
- [X] T036 [US5] Implementar `serializeFoundationsJsonV1(envelope)` en `src/infrastructure/reporter/foundations-json-serializer.ts` (`JSON.stringify(env,null,2)+"\n"`); NO cambia la firma de `serializeJsonV1` ni hace cast.
  - Done: función pura; 2 espacios + 1 newline; sin BOM/ANSI; determinista.
  - Test: incluido en T037.
- [X] T037 [P] [US5] [US8] `tests/unit/foundations/json/foundations-json.test.ts` (serializer + mappers).
  - Done: n/a (test).
  - Test: envelope parseable por outcome; 2 espacios; 1 newline; sin BOM/ANSI; Unicode; determinista; input congelado; excepción de `JSON.stringify` propagada; internal-error seguro (sin stack); `JsonEnvelopeV1`/`JSON_FORMAT_VERSION` de 003 sin tocar.
- [X] T038 [US5] Implementar `FoundationsJsonReporter` en `src/infrastructure/reporter/foundations-json-reporter.ts` (implementa `FoundationsReporter`; eventos previos no-op; `completed` → una escritura a `io.out`).
  - Done: stdout 1 JSON para todos los outcomes esperados; stderr vacío; no texto humano; no cota 200.
  - Test: incluido en T039.
- [X] T039 [P] [US5] `tests/unit/cli/foundations-json-reporter.test.ts` (IO falso).
  - Done: n/a (test).
  - Test: 5 outcomes en stdout; una escritura; eventos previos no escriben; JSON parseable; >200 tokens conservados; IO fallido propaga; sin mutación.

**Checkpoint G** → verdes. Commit: `feat: add foundations JSON contract and reporter`.

---

## Checkpoint H — CLI y composición

- [X] T040 [US1] Acción del comando en `src/cli/commands/foundations.ts`: `runFoundations(executionDir, deps)` delega en `inspectFoundations`; sin FS/JSON/exit-codes/prompts.
  - Done: devuelve `FoundationsResult`; análogo a runValidate/runInspect.
  - Test: incluido en T044.
- [X] T041 [US6] Extender `src/cli/composition.ts`: `createFoundationsDependencies(io, analyze)` (reporter humano) y `createFoundationsJsonDependencies(io, analyze)` (reporter JSON), reutilizando `createBoundAnalyze`.
  - Done: mismo analyzer enlazado (sin segundo análisis); un solo reporter por modo.
  - Test: `tests/unit/cli/foundations-composition.test.ts` — reporter correcto por factory; mismo analyze.
- [X] T042 [US1] [US8] Registrar el comando `foundations` con opción local `--json` (default false) en `src/cli/program.ts`; selección de modo por `opts.json`; manejo de internal-error JSON propio (catch → `serializeFoundationsJsonV1(toFoundationsInternalErrorEnvelope("foundations"))` a stderr, exit 70, stdout vacío); pasar deps desde `src/cli/index.ts`.
  - Done: comando dedicado, sin subcomandos; `--json` no global; `init --json`/`--json foundations` siguen error de uso (3); `exitCodeForOutcome` reutilizado; init/validate/inspect intactos.
  - Test: incluido en T043/T044.
- [X] T043 [P] [US6] [US8] `tests/cli/foundations-commands.test.ts` (vía `runCli`, IO falso).
  - Done: n/a (test).
  - Test: `--json` reconocido y default false; help menciona `--json`; humano vs JSON; `init --json`→3; `--json foundations`→3; opción desconocida→3; un caso de uso; exit codes por outcome; internal-error JSON (stderr/empty stdout/70); runtime sin foundationsDeps no rompe tests de 001.
- [X] T044 [P] [US1] `tests/cli/foundations-commands.test.ts` (exit + streams) — *(misma suite que T043; reservar id para granularidad de ejecución).* Verifica streams: outcomes esperados → stdout 1 JSON / stderr vacío incluso con exit 3/4/5/6.
  - Done: n/a (test).
  - Test: matriz outcome→exit; stderr vacío en outcomes esperados (JSON).

**Checkpoint H** → verdes (binario funcional con `foundations` + `--json`). Commit: `feat: add foundations CLI command`.

---

## Checkpoint I — Integración, filesystem y procesos hijos

- [X] T045 [US1] [US4] [US9] `tests/integration/foundations/foundations-fs.test.ts` (proyectos temporales reales, helpers existentes).
  - Done: n/a (test).
  - Test: not-found; init; metadata token primitive/semantic; metadata grupo; override; metadata inválida; categoría exacta; unresolved; type-mismatch; primitive→semantic; semantic→primitive; missing alias; cycle; alias-to-group; tipo desconocido/superficial; limits; UTF-8 inválido; structural partial; read-error; `$extensions` desconocido; Unicode; paths con espacios — verificando outcome/exit/category-state/issues/summary y **bytes idénticos** (no escritura).
- [X] T046 [P] [US3] `tests/integration/foundations/foundations-paths.test.ts` — >200 tokens.
  - Done: n/a (test).
  - Test: 250 tokens en una categoría → JSON conserva todos (`paths.length===total`); sin mensaje de truncado.
- [X] T047 [US1] [US5] [US11] `tests/cli/foundations-binary.test.ts` (binario compilado real, stdin cerrado).
  - Done: n/a (test).
  - Test: matriz `valid→0/complete-invalid→3/partial→4/not-found→5/read-error→6`; sin TTY; stdout 1 JSON con `\n`, sin ANSI, `formatVersion:"1.0.0"`, `command:"foundations"`, outcome correcto; stderr vacío; help; usage errors→3; sin archivos nuevos.
- [X] T048 [US5] `tests/integration/foundations/single-analysis.test.ts` (spies sobre reader/parse/analyze/metadata-pass).
  - Done: n/a (test).
  - Test: `readCalls===1`, `parseCalls===1`, `analysisCalls===1`, `metadataProjectionCalls===1`; sin segunda resolución de alias/tipos; mapper/reporter no analizan.
- [X] T049 [P] [US9] [US10] `tests/integration/foundations/purity-determinism.test.ts`.
  - Done: n/a (test).
  - Test: bytes/contenido/listado del proyecto idénticos antes/después (sin `atime`); `$extensions`/contenido desconocido intactos; sin staging; mismo input → mismos bytes JSON; sin timestamps/UUID/locale/TTY/env.

**Checkpoint I** → verdes. Commit: `test: add foundations integration coverage`.

---

## Checkpoint J — Regresión, documentación, empaquetado y cierre

- [X] T050 [US6] `tests/integration/foundations/regression-flow.test.ts`: `init → foundations (partial/4) → init (unchanged/2)`.
  - Done: n/a (test).
  - Test: init genera 3 archivos; foundations → `color` partial (2 tokens unclassified), resto absent, outcome partial/exit 4; segundo init `unchanged`/2; tres documentos **byte-idénticos**; package.json sin cambios.
- [X] T051 [US14] Verificación de regresión `003` byte-idéntica en `tests/integration/foundations/json-v1-stability.test.ts`.
  - Done: n/a (test).
  - Test: `validate --json` / `inspect --json` byte-idénticos a 003; `JSON_FORMAT_VERSION`/envelope/command union/mappers/serializer observable sin cambios.
- [X] T052 [US14] Confirmar regresión histórica 001 (274) + 002 (315) + 003 (177) verde; la pasada de metadata solo corre en `foundations` (no en validate/inspect).
  - Done: suite histórica intacta; sin tocar reporters/outcomes/exit/cota 200/traversal de 002.
  - Test: `npm test` completo verde; aserción de que validate/inspect no invocan la proyección foundation.
- [X] T053 [P] [US1] [US14] Actualizar `README.md`: comando `foundations` (+ `--json`), metadata `$extensions`, primitive/semantic/unclassified, categorías canónicas, init→partial, tabla de exits, validación profunda solo color, relación con 005/006, limitaciones. No presentar 005/006 como disponibles.
  - Done: coherente con contratos; sin prometer fuera de alcance.
  - Test: revisión manual; sin contradicciones con spec/contracts.
- [X] T054 [P] Alinear el texto de ayuda de `foundations` (descripción de `--json`) y verificar `quickstart.md`.
  - Done: `foundations --help` menciona `--json`; quickstart coherente.
  - Test: child-process help → exit 0; `--json` listado.
- [X] T055 Empaquetado: `npm run build` + `npm pack --dry-run` (+ tarball real verificado/eliminado).
  - Done: nuevos módulos en `dist/` (domain/application/infrastructure/cli foundations); tarball solo `dist`+`package.json`+`README.md`; sin specs/tests/fixtures/`.agents`; **sin nuevas dependencias**.
  - Test: `tests/integration/packaging-npx.test.ts` verde; listado del tarball revisado.
- [X] T056 Smoke del paquete instalado: `neuraz-ds --help`, `foundations --help`, `foundations`, `foundations --json`.
  - Done: binario emite JSON v1 de foundations válido; **no** publica.
  - Test: smoke (parse stdout, exit esperado).
- [X] T057 Cierre: crear `specs/004-foundations/audit.md` (matriz US/FR/SC, constitución 17/17, deuda aceptada) y verificar pipeline completo.
  - Done: 14/14 · 47/47 · 11/11; deuda documentada (pasada metadata O(nodes) sin I/O/reanálisis; solo color profundo; resto superficial; init→partial/4 intencional); typecheck/lint/test/build/pack verdes; working tree limpio.
  - Test: pipeline completo verde; sin desviaciones abiertas.

**Checkpoint J** cierra la feature. Commit: `docs: close foundations feature`.

---

## Dependencias entre checkpoints

```text
A (modelos/registro) → B (metadata) → C (proyección/categorías) → D (estados/validación/outcome)
→ E (caso de uso) → F (humano) → G (JSON) → H (CLI) → I (integración/child) → J (regresión/cierre)
```

Reglas duras: reporter no antes de los modelos; JSON no antes del result; CLI no antes del caso de
uso; proceso hijo no antes del build (Checkpoint H); documentación no “disponible” antes de
implementar; cierre no antes de la regresión.

## Paralelización (`[P]`)

- A: T001, T004, T005, T007 ‖ (T002/T003/T006 antes de sus tests).
- B: T012 ‖ resto.
- C: T014 ‖ T016; T013/T015/T017 secuenciales por dependencia.
- D: T020 ‖ T022 ‖ T026 (tests distintos).
- G: T032 ‖ T035 ‖ T037 ‖ T039.
- I: T046 ‖ T049. J: T053 ‖ T054.

## Trazabilidad

### US → tareas (14/14)

| US | Tareas |
|---|---|
| US1 listar categorías | T013, T014, T017, T024, T030, T040, T045, T047, T053 |
| US2 primitive/semantic | T001, T009, T010, T011, T012, T025, T028 |
| US3 estados por categoría | T003, T021, T022, T023, T024, T026, T030, T031 |
| US4 validar relaciones | T019, T020, T028, T029, T045 |
| US5 referencias inexistentes | T019, T020 (reusa 002 missing) |
| US6 ciclos | T019, T020 (reusa 002 cycle) |
| US7 dependencias prohibidas | T004, T006, T017, T019, T020, T024 |
| US8 preservar desconocido/inválido | T004, T009, T011, T012, T035, T042, T049 |
| US9 solo lectura | T045, T049, T050 |
| US10 determinismo | T049 |
| US11 sin TTY | T031, T047 |
| US12 preset-ready | T006, T017, T027 |
| US13 export-ready | T017, T024, T027, T028 |
| US14 compat validate/inspect/--json | T051, T052, T053 |

### FR → tareas (47/47)

| FR | Tareas | FR | Tareas |
|---|---|---|---|
| FR-001 (categorías) | T002, T005 | FR-024 (single analysis + metadata pass) | T011, T028, T048 |
| FR-002 (niveles; component fuera) | T001, T006 | FR-025/026 (headless/JSON-ready) | T027, T028, T033 |
| FR-003 (clasificación) | T009, T010 | FR-027 (CLI dedicado) | T042 |
| FR-004 (no conflación) | T013, T015, T017 | FR-028 (JSON aislado) | T033, T036, T051 |
| FR-005..009 (alias dirs) | T019, T020 | FR-029/030 (preservación/unmanaged) | T011, T017, T049 |
| FR-010 (component out) | T019 | FR-031/032 (determinismo) | T023, T024, T049 |
| FR-011 (missing) | T019, T020 | FR-033 (seguridad) | T004, T035, T045 |
| FR-012 (cycle) | T019, T020 | FR-034 (init intacto) | T050, T052 |
| FR-013 (to-group) | T019, T020 | FR-035 (002 intacto) | T048, T052 |
| FR-014 (type-incompat) | T015, T016 | FR-036 (003 byte-stable) | T051 |
| FR-015..019 (DTCG/depth) | T002, T015, T016 | FR-037..040 (metadata/precedencia) | T009, T010, T011, T012 |
| FR-020/021 (persistencia A / init) | T011, T050 | FR-041 (sin herencia espuria) | T010, T012 |
| FR-022 (estado derivado) | T021, T022 | FR-042 (unclassified) | T010, T011, T021 |
| FR-023 (outcomes 002) | T025, T026 | FR-043 (metadata inválida) | T009, T011, T012 |
| | | FR-044/045 (alias/`$type` no nivel) | T010, T012, T017 |
| | | FR-046 (no duplicar categoría) | T009, T033 |
| | | FR-047 (categoría por segmento) | T013, T014 |

### SC → tareas (11/11)

| SC | Tareas |
|---|---|
| SC-001 categorías | T024, T030, T047 |
| SC-002 nivel determinista | T010, T012 |
| SC-003 forbidden | T019, T020 |
| SC-004 cycle | T019, T020 |
| SC-005 missing | T019, T020 |
| SC-006 preservación byte-idéntica | T045, T049, T050 |
| SC-007 sin escritura | T045, T049 |
| SC-008 determinismo | T049 |
| SC-009 sin TTY | T031, T047 |
| SC-010 regresión + JSON v1 | T051, T052 |
| SC-011 preset/export-ready | T006, T017, T024 |

## Constitution Check (tareas que protegen cada principio)

- **Headless (V/XV)**: modelos/proyección/use case puros (T001–T028); reporters adapters (T030/T038).
- **Fuente local / no escritura (II/XIV)**: solo lectura verificada (T045/T049/T050).
- **DTCG (III)**: clasificación sobre DTCG; profundidad solo color (T002/T015/T016).
- **Análisis único (XVI)**: T011/T028/T048 (1 read/parse/análisis + 1 pasada metadata).
- **Determinismo (XVI)**: T023/T024/T049.
- **CLI como adapter (V/VI)**: flag/selección/error interno solo en CLI (T040–T044).
- **Seguridad (XIV)**: sin stack/context/datos sensibles (T004/T035/T045).
- **Portabilidad / no lock-in (XIII/XVII)**: `$extensions` DTCG portable; JSON aislado (T033/T036).
- **Compatibilidad (XVI)**: regresión 001/002/003 (T050/T051/T052).

## Fuera de alcance (sin tareas)

Presets/valores, themes, dark mode, component tokens, edición/escritura/migración/repair,
auto-clasificación, CSS/SCSS, Style Dictionary, export, MCP/TUI/viewer/Figma, múltiples archivos de
tokens, múltiples DS, validación profunda de todos los tipos, cambios al JSON v1 de validate/inspect,
publicación npm.

---

**Total: 57 tareas** · 10 checkpoints (A–J) · 0 marcadas · 0 `[NEEDS CLARIFICATION]`.
Primera tarea: **T001**. Primer checkpoint para `/speckit-implement`: **Checkpoint A (T001–T008)**.
