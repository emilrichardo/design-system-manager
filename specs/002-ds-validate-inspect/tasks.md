---
description: "Task list for feature 002-ds-validate-inspect — Validación e inspección de un Design System existente"
---

# Tasks: Validación e inspección de un Design System existente (ds-validate-inspect)

**Input**: Design documents from `specs/002-ds-validate-inspect/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, ADRs
(`docs/adr/0006`–`0010`), constitution.md
**Tests**: INCLUIDOS — el usuario solicitó cobertura unitaria, de integración, de CLI y de regresión
de `001` explícita.

## Format & conventions

`- [ ] [TaskID] [P?] [Story?] Descripción con ruta`

- **[P]**: paralelizable (archivos distintos, sin dependencias pendientes).
- **[US#]**: historia asociada (US1 validar-correcto · US2 todos-los-errores · US3 inspeccionar ·
  US4 subcarpeta/workspace · US5 headless · US6 pureza-observacional · US7 estructura-parcial).
  Setup/Foundational/Polish no llevan etiqueta de historia.
- Cada tarea incluye sub-bullets: **Deps**, **Done** (criterio objetivo) y **Test** (prueba que lo
  demuestra).
- Estructura (plan.md, "extensión mínima"): `src/{domain/{analysis,traversal,dtcg},application,
  infrastructure/{analysis,reporter},cli/commands}`, `tests/{unit,integration,cli}`.
- **Reutiliza `001` sin modificarlo**: `resolveHostRoot`, `path-guard`, `inspect-presence`,
  `classify-state`, validadores config/manifest (zod), utilidades de alias/ciclos, `Issue`/
  `ValidationResult`, CLI base. El **schema estricto de generación** de `001` (`dtcg.schema`, color-only)
  **NO se modifica**; `002` añade un **validador de lectura amplio separado**.

> **Organización**: dos comandos de solo lectura que comparten una única tubería. Se entregan por
> **fases por capas** (Fase 1–9, según pedido), `domain → application → infrastructure → cli`. Cada
> tarea se etiqueta con la(s) historia(s) que sirve; la matriz final mapea US → FR → tarea → prueba.

> **Fuera de alcance** (no generar tareas): edición, reparación, migración, escritura, importación,
> Style Dictionary, CSS, TUI, viewer, MCP, `--json`, comandos distintos de `validate`/`inspect`.

---

## Fase 1 — Bootstrap mínimo de feature 002

> Solo wiring/barrels mínimos. NO se duplica el bootstrap de `001` (build/lint/tsconfig/vitest ya existen).

- [X] T001 Crear barrels y árbol de carpetas vacíos de 002 en `src/domain/analysis/index.ts`, `src/domain/traversal/index.ts`, `src/domain/dtcg/index.ts`, `src/infrastructure/analysis/index.ts` y carpetas de test `tests/unit/analysis/`, `tests/integration/validate-inspect/`, `tests/cli/` (reusa la config vitest/tsconfig de 001).
  - **Deps**: ninguna.
  - **Done**: `npm run typecheck` y `npm run build` siguen verdes; `npm test` sigue **274/274** (sin código nuevo ejecutable aún).
  - **Test**: CI base de 001 sin regresión (typecheck + build).
- [X] T002 Centralizar las constantes de 002 en `src/domain/traversal/limits.ts` (placeholders de valores ADR-0009) y `src/cli/inspect-presentation.ts` con `MAX_INSPECT_TERMINAL_TOKEN_ROWS = 200` documentado como **cota de presentación** (no de análisis).
  - **Deps**: T001.
  - **Done**: constantes exportadas y referenciadas por una prueba trivial de import; arch-guard OK (dominio sin Node).
  - **Test**: `tests/unit/analysis/constants.test.ts` afirma valores exactos (5 MiB/16 MiB/32/100000/512/256/1000 y 200).

---

## Fase 2 — Dominio puro (modelos y reglas, sin Node/fs/zod/ajv/CLI)

> Fuente normativa: data-model.md + contratos + ADR-0007/0008/0009/0010. Arch-guard: estos archivos
> NO pueden importar Node/fs/zod/ajv/commander/clack/console.

- [X] T003 [P] Definir `AnalysisIssue` (extiende el `Issue` de `001` de forma aditiva: `severity:"error"|"warning"`, `document?:ManagedDocument`, `context?:Record<string,unknown>`) y `ManagedDocument` en `src/domain/analysis/analysis-issue.ts` (C4).
  - **Deps**: T001. Reusa `src/domain/issue.ts` (sin modificarlo).
  - **Done**: `AnalysisIssue extends Issue`; `code` estable; type-only; arch-guard OK.
  - **Test**: `tests/unit/analysis/analysis-issue.test.ts` — un `AnalysisIssue` es asignable a `Issue` (compat. estructural, C4) y nunca usa texto AJV/Zod como `code`. (FR-007/FR-008)
- [X] T004 [P] Definir `InspectedValue<T>` y el enum de confiabilidad canónico `Trust = "valid"|"recovered"|"untrusted"|"unavailable"` en `src/domain/analysis/inspected-value.ts` (C3).
  - **Deps**: T001.
  - **Done**: enum único `valid/recovered/untrusted/unavailable`; sin `trusted`; type-only.
  - **Test**: `tests/unit/analysis/inspected-value.test.ts` — marca por sección/valor; no envuelve primitivos innecesariamente. (FR-023)
- [X] T005 [P] Definir `StructuralState = "not-initialized"|"partial"|"complete-invalid"|"complete-valid"` y su derivación desde `PreviousState` de `001` en `src/domain/analysis/structural-state.ts`.
  - **Deps**: T001. Reusa `src/domain/state/previous-state.ts`.
  - **Done**: mapeo puro `PreviousState → StructuralState`; sin Node.
  - **Test**: `tests/unit/analysis/structural-state.test.ts` — los 4 estados y el mapeo. (FR-011, US7)
- [X] T006 [P] Definir `TokenNodeSummary` en `src/domain/analysis/token-node-summary.ts`: `path`, `declaredType`, `effectiveType`, `typeOrigin:"own"|"alias"|"group"|"none"`, `typeSourcePath:string|null` (C5), `kind:"concrete"|"alias"`, `aliasTarget`, `aliasState`, `description`, `depth`, `trust:"valid"|"recovered"|"untrusted"`.
  - **Deps**: T004.
  - **Done**: `typeOrigin` literal + `typeSourcePath` separado (C5); type-only.
  - **Test**: `tests/unit/analysis/token-node-summary.test.ts` — `typeSourcePath` solo cuando `typeOrigin==="group"`. (FR-022, C5)
- [X] T007 [P] Definir `AnalysisLimitsResult` (`reached`, `hits:[{limit,detail}]`, `partial`) en `src/domain/traversal/limits.ts` (ampliando T002) con los 7 tipos de límite.
  - **Deps**: T002.
  - **Done**: tipos `file-size|total-size|depth|nodes|path-len|alias-len|issues`; `partial` derivable.
  - **Test**: `tests/unit/analysis/limits.test.ts` — forma del resultado y `partial`. (FR-006, ADR-0009)
- [X] T008 [P] Implementar `tokenPath` (ruta canónica `a.b.c`, orden de inserción JSON) y cálculo de profundidad (raíz=0) en `src/domain/traversal/token-path.ts`.
  - **Deps**: T001.
  - **Done**: función pura determinista; raíz profundidad 0; sin reordenamiento silencioso.
  - **Test**: `tests/unit/analysis/token-path.test.ts` — rutas y profundidad sobre fixtures. (FR-021/FR-022, ADR-0010, SC-007)
- [X] T009 [P] Definir el conjunto de **tipos reconocidos** DTCG 2025.10 (13) y el subconjunto **profundo** (`color`) en `src/domain/dtcg/recognized-types.ts` (centralizado, sin duplicar).
  - **Deps**: T001. Fuente: research.md §1.
  - **Done**: set único exportado; `isRecognized`, `isDeeplySupported` puros.
  - **Test**: `tests/unit/analysis/recognized-types.test.ts` — 13 tipos; `color` profundo; otros reconocidos-no-profundos. (FR-017, SC-009)
- [X] T010 Implementar la precedencia del **`$type` efectivo** (C1) como función pura en `src/domain/traversal/effective-type.ts`: (1) declarado → (2) tipo del token referenciado si alias (resolviendo cadenas) → (3) grupo ancestro más cercano → (4) indeterminable; devuelve `{effectiveType, typeOrigin, typeSourcePath}`.
  - **Deps**: T006, T009. Recibe un resolvedor de alias/índice (inyectado) para no acoplar al recorrido.
  - **Done**: precedencia exacta C1; ciclo/alias roto ⇒ `effectiveType:null`; no infiere de la forma de `$value`; `$extensions` no participa.
  - **Test**: `tests/unit/analysis/effective-type.test.ts` — own; alias en grupo tipado (gana alias); alias encadenado; alias roto; cíclico; heredado de grupo; sin tipo → `null`. (FR-018, SC-009)
- [X] T011 Definir las **reglas de conteo** e `InspectionStatistics` (`total`, `groups`, `concreteValues`, `aliases`, `byType` por tipo efectivo con categoría `(untyped)` y literal por tipo no reconocido, `maxDepth`, `aliasIssues`) en `src/domain/analysis/inspection-statistics.ts`.
  - **Deps**: T006, T008, T010.
  - **Done**: raíz NO cuenta como grupo; grupo vacío cuenta + warning; token = nodo con `$value`; alias = `$value` `{...}`; `concreteValues = total − aliases`.
  - **Test**: `tests/unit/analysis/inspection-statistics.test.ts` — conteos exactos y `byType` (incl. `(untyped)`/no reconocido). (FR-021, SC-007)
- [X] T012 Definir `ValidationReport` en `src/domain/analysis/validation-report.ts` (`valid`, `structuralState`, `checkedDocuments`, `uncheckedDocuments`, `errors:AnalysisIssue[]`, `warnings:AnalysisIssue[]`, `limits`, `summary`).
  - **Deps**: T003, T005, T007.
  - **Done**: `error` invalida, `warning` no; type-only; usa `AnalysisIssue`.
  - **Test**: `tests/unit/analysis/validation-report.test.ts` — `valid=false` con ≥1 error o límite duro. (FR-008/FR-016)
- [X] T013 Definir `DesignSystemInspection` (forma canónica del contrato) en `src/domain/analysis/design-system-inspection.ts`: `host`, `structuralState`, `identity?`/`schemaVersions?` (`InspectedValue`), `files{expected,present:FileInspection[],missing}`, `tokens?{...,paths:TokenNodeSummary[]}`, `validation:ValidationReport`, `limits`.
  - **Deps**: T004, T006, T011, T012.
  - **Done**: incluye `validation`; confiabilidad por sección; sin dependencia de formato terminal. `FileInspection` definido.
  - **Test**: `tests/unit/analysis/design-system-inspection.test.ts` — incluye validación; marca recuperado/no-confiable. (FR-020/FR-023)
- [X] T014 Definir `DesignSystemAnalysis` (modelo interno común) en `src/domain/analysis/design-system-analysis.ts`: `host`, `presence`, `structuralState`, `documents:Record<rel,ParsedDocument>`, `nodes`, `statistics`, `errors`, `warnings`, `limits`, `valid`; + `ParsedDocument`.
  - **Deps**: T011, T012, T013.
  - **Done**: único modelo del que se derivan `ValidationReport` e `DesignSystemInspection`; type-only.
  - **Test**: `tests/unit/analysis/design-system-analysis.test.ts` — forma y trust por documento. (FR-005)

---

## Fase 3 — Puertos y contratos de aplicación (sin infraestructura concreta)

> Todo en `src/application/`. Arch-guard: application sin commander/clack/fs/path/infra/console/exit.

- [X] T015 Extender **aditivamente** el puerto `FileSystem` de `001` con un único método `byteSize(path:string):Promise<number>` en `src/application/ports.ts` (C6). NO se modifica ningún método existente.
  - **Deps**: T001.
  - **Done**: `byteSize` añadido; los adapters de 001 podrán implementarlo; 001 intacto.
  - **Test**: regresión de 001 verde (T060); typecheck. (FR-002/FR-003, C6)
- [X] T016 Definir el puerto `ManagedDocumentReader` y la unión `ReadResult` (`ok|absent|not-regular-file|too-large|outside-root|symlink-external|read-failed`) en `src/application/ports.ts` como **puerto delgado compuesto** sobre `FileSystem` (C6), no un segundo FS.
  - **Deps**: T015.
  - **Done**: contrato de managed-document-reader.contract.md; `readManaged(root,rel,maxBytes)`.
  - **Test**: cubierto por la impl en T024 y sus pruebas. (FR-003/FR-004, US6)
- [X] T017 Definir el puerto del **validador de lectura DTCG amplio** `DtcgReadValidator` (separado de `DocumentValidators` de generación de 001) en `src/application/ports.ts`.
  - **Deps**: T009.
  - **Done**: contrato que reconoce los 13 tipos sin transformar `$value`; separado del schema estricto de 001.
  - **Test**: cubierto por T026. (FR-012/FR-017, separación de schemas)
- [X] T018 Definir los tipos de la **tubería**: `AnalyzeInput {executionDir}`, `AnalyzeDependencies` (resolver, inspector, classifier, reader, documentValidators(001), dtcgReadValidator, límites) en `src/application/ports.ts` (analysis-pipeline.contract.md).
  - **Deps**: T014, T016, T017.
  - **Done**: input/deps sin Commander/Clack/TTY/`process.*`.
  - **Test**: tipos usados por T028. (FR-005, SC-006)
- [X] T019 Definir los puertos de presentación `ValidationReporter` e `InspectionReporter` (reciben datos semánticos; no alteran el resultado) en `src/application/ports.ts`.
  - **Deps**: T012, T013.
  - **Done**: reporters reciben `ValidationReport`/`DesignSystemInspection`; sin texto preformateado en el núcleo.
  - **Test**: cubierto por reporters de Fase 8. (FR-031/FR-032, FR-019 TUI-ready)
- [X] T020 Definir las firmas de los **casos de uso headless** `validateDesignSystem(input,deps)` e `inspectDesignSystem(input,deps)` y sus tipos de salida (`ValidationReport` / `DesignSystemInspection`) en `src/application/ports.ts`.
  - **Deps**: T018, T019.
  - **Done**: firmas sin exit codes ni terminal; salida estructurada (habilita `--json` futuro sin reimplementar, FR-035).
  - **Test**: cubierto por T030/T031 y pruebas headless (T059). (FR-005/FR-035, SC-006)

---

## Fase 4 — Lectura segura e infraestructura base (sin side effects)

> Reutiliza `path-guard` y `resolveHostRoot` de `001`. Implementa la lectura observacionalmente pura.

- [ ] T021 Implementar `FileSystem.byteSize` (stat de tamaño) en `src/infrastructure/fs/node-file-system.ts` (método aditivo; resto del adapter de 001 sin tocar).
  - **Deps**: T015.
  - **Done**: `byteSize` vía `node:fs/promises.stat`; sin lecturas de contenido; 001 intacto.
  - **Test**: `tests/unit/fs/byte-size.test.ts` — tamaño correcto; archivo ausente → error controlado. (FR-006)
- [ ] T022 [P] Añadir `byteSize` al **adapter de FileSystem en memoria** de los tests headless en `tests/helpers/` (sin tocar la API pública).
  - **Deps**: T015.
  - **Done**: adapter en memoria soporta `byteSize`; usable sin FS real.
  - **Test**: usado por pruebas headless (T059). (SC-006, US5)
- [ ] T023 [P] Tarea de **reutilización explícita** del `path-guard` de `001` (`assertWithinRoot`/`realpath`, anti-`..`, rutas absolutas externas, prefijos engañosos, otros workspaces) desde el reader, en `src/infrastructure/analysis/managed-document-reader.ts` (import, sin reimplementar).
  - **Deps**: T016. Reusa `src/infrastructure/host-root/path-guard.ts`.
  - **Done**: el reader delega contención al path-guard existente; cero duplicación.
  - **Test**: cubierto por T025 (escape/symlink). (FR-003, US6)
- [ ] T024 Implementar `ManagedDocumentReader` en `src/infrastructure/analysis/managed-document-reader.ts`: `lstatKind`→`byteSize` (stat antes de leer)→`readManaged` UTF-8 si `≤ maxBytes`; devuelve la unión `ReadResult`. Sin cargar módulos, sin evaluar contenido, sin red, sin escrituras.
  - **Deps**: T016, T021, T023.
  - **Done**: `stat` previo a leer; `>maxBytes`→`too-large` (no lee); UTF-8; acumulación de bytes totales controlada; cero side effects.
  - **Test**: `tests/integration/validate-inspect/reader.test.ts` — too-large, absent, not-regular-file, read-failed (archivo eliminado entre stat y lectura), encoding inválido (lo detecta el parseo posterior, no el reader). (FR-002/FR-003/FR-004, US6)
- [ ] T025 Implementar el manejo de **symlinks externos/rotos y escape** en el reader (rechazo sin seguir el enlace) en `src/infrastructure/analysis/managed-document-reader.ts`.
  - **Deps**: T024.
  - **Done**: symlink externo→`symlink-external`; fuera de raíz→`outside-root`; no se sigue el enlace; coherente con `audit.md` de 001.
  - **Test**: `tests/integration/validate-inspect/security.test.ts` — symlink externo, symlink roto, ruta absoluta externa, prefijo engañoso, otro workspace. (FR-003, US6)

---

## Fase 5 — Validación y recorrido DTCG (validador de lectura amplio + traversal iterativo)

> El **schema estricto de generación de `001` no se modifica**; aquí vive el **validador de lectura amplio** separado.

- [ ] T026 Implementar el **validador de lectura DTCG amplio** `DtcgReadValidator` en `src/infrastructure/analysis/dtcg-read-validator.ts`: reconoce los 13 tipos (T009), valida estructura genérica segura, NO transforma/resuelve `$value`; emite warning `dtcg-type-not-deeply-inspected` (reconocido-no-profundo) y error `dtcg-type-unrecognized` (no reconocido). Separado del `dtcg.schema` (color-only) de 001.
  - **Deps**: T009, T017, T003.
  - **Done**: tipos reconocidos→OK/warning; no reconocido→error; `$extensions` no legitima tipo; schema de 001 intacto.
  - **Test**: `tests/unit/analysis/dtcg-read-validator.test.ts` — reconocido-profundo (color) OK; reconocido-no-profundo→warning; no reconocido→error; `$extensions` no convierte desconocido en válido. (FR-012/FR-017/FR-019, SC-009)
- [ ] T027 Implementar `traverse-dtcg-tree` **iterativo** (stack explícito, orden de inserción JSON) en `src/infrastructure/analysis/traverse-dtcg-tree.ts`: distingue grupos/tokens/reservadas(`$…`)/valores/aliases; construye el índice `tokenPath → token` en una pasada; valida aliases (formato, existencia, alias-a-grupo) y ciclos (directos/indirectos) **reusando utilidades de `001`**; resuelve `effective-type` (T010); produce `TokenNodeSummary[]` + `InspectionStatistics`; aplica límites de nodos/profundidad/issues emitiendo `limit-*-exceeded`.
  - **Deps**: T008, T010, T011, T026. Reusa utilidades de alias/ciclos de `src/infrastructure/validation/dtcg-validator.ts`.
  - **Done**: O(nodos+aliases); sin recursión; orden determinista; índice de una pasada; aliases/ciclos detectados; límites duros→error+`partial`; sin truncado silencioso.
  - **Test**: `tests/unit/analysis/traverse.test.ts` + `tests/integration/validate-inspect/traverse.test.ts` — grupos/tokens/aliases; alias roto/a-grupo/ciclo directo/indirecto; árbol profundo; límite de nodos; determinismo. (FR-006/FR-013/FR-021/FR-022, SC-003/SC-004/SC-007, ADR-0010)
- [ ] T028 [P] Implementar la **emisión de warnings/errors** restantes en el recorrido: `dtcg-empty-group` (grupo vacío), `dtcg-description-missing` (descripción ausente, warning), `dtcg-type-undeterminable` (sin tipo efectivo) en `src/infrastructure/analysis/traverse-dtcg-tree.ts`.
  - **Deps**: T027.
  - **Done**: códigos estables; severidades correctas; descripción opcional ⇒ solo warning; documento de tokens vacío válido (0 tokens).
  - **Test**: `tests/unit/analysis/traverse-issues.test.ts` — cada código y severidad. (FR-008/FR-018, US7)

---

## Fase 6 — Tubería compartida (una sola lectura/parseo/recorrido)

- [ ] T029 Implementar `analyzeExistingDesignSystem(input, deps)` en `src/application/analyze-design-system.ts`: orquesta resolve(host) → inspect-presence(001) → classify-state(001) → read(managed) → parse(`JSON.parse` seguro, marca trust) → validate(config/manifest zod de 001 + `DtcgReadValidator`) → traverse(árbol DTCG) → coherence → produce `DesignSystemAnalysis`. **Una sola** lectura/parseo/recorrido.
  - **Deps**: T014, T018, T024, T026, T027. Reusa `resolveHostRoot`, `inspectPresence`, `classifyState`, `documentValidators` de 001.
  - **Done**: un único `DesignSystemAnalysis`; sin doble lectura/parseo/recorrido; acumula todos los errores recuperables; categoriza host/structure/read/validation/limit; sin escritura.
  - **Test**: `tests/integration/validate-inspect/analyze.test.ts` — un solo paso de lectura (espía del reader) produce análisis completo; acumulación de errores. (FR-001/FR-004/FR-010/FR-011/FR-012/FR-015, SC-001)
- [ ] T030 Implementar la **comprobación de coherencia entre documentos** (config `designSystemDir` ↔ ubicación del manifiesto; `tokensDir` del manifiesto consistente) dentro de la tubería, en `src/application/analyze-design-system.ts` (o helper `src/application/coherence.ts`).
  - **Deps**: T029.
  - **Done**: `designSystemDir` dentro de la raíz; coincide con la ubicación real del manifiesto; `coherence-*` como error.
  - **Test**: `tests/integration/validate-inspect/coherence.test.ts` — `designSystemDir` con escape/absoluta; desajuste config↔manifiesto. (FR-010/FR-014)

---

## Fase 7 — Casos de uso públicos (proyecciones headless)

- [ ] T031 Implementar `validateDesignSystem(input, deps)` en `src/application/validate-design-system.ts`: invoca la tubería y **proyecta** `DesignSystemAnalysis → ValidationReport`. Sin Commander/Clack/TTY/consola/exit codes.
  - **Deps**: T029, T012, T020.
  - **Done**: devuelve `ValidationReport` estructurado; no escribe; comportamiento por estado (not-initialized/partial/complete-invalid/complete-valid).
  - **Test**: `tests/integration/validate-inspect/validate-usecase.test.ts` — 4 estados; acumula todos los errores; idéntico en 2 ejecuciones. (FR-005/FR-016, US1/US2, SC-001/SC-003)
- [ ] T032 Implementar `inspectDesignSystem(input, deps)` en `src/application/inspect-design-system.ts`: invoca la tubería y **proyecta** `DesignSystemAnalysis → DesignSystemInspection` (que **incluye** el `ValidationReport`). Marca datos recuperados/no confiables; conserva **todos** los nodos (sin cota; la cota es de presentación).
  - **Deps**: T029, T013, T031, T020.
  - **Done**: devuelve `DesignSystemInspection` con `validation`; en complete-invalid/partial distingue recuperado/no-confiable; no infiere componentes/páginas/estilos; no resuelve colores a CSS; no escribe.
  - **Test**: `tests/integration/validate-inspect/inspect-usecase.test.ts` — conteos exactos en válido; recuperable en inválido; incluye validación. (FR-020/FR-021/FR-023/FR-024, US3, SC-007)
- [ ] T033 [P] Probar el **comportamiento por estados** de ambos casos de uso de forma explícita en `tests/integration/validate-inspect/states.test.ts`: not-initialized; partial (presentes/ausentes, sin reparar); complete-invalid (errores + recuperable); complete-valid.
  - **Deps**: T031, T032.
  - **Done**: cada estado produce el resultado semántico esperado; inspect entrega informe incluso en inválido/parcial; ninguno repara ni infiere.
  - **Test**: el propio archivo. (FR-011/FR-016/FR-023, US7, SC-001)

---

## Fase 8 — CLI (presentación + exit codes; sin lógica de negocio)

> La CLI solo provee `cwd`, ejecuta casos de uso, presenta y mapea exit codes. Sin prompts; funciona sin TTY/en CI.

- [ ] T034 Generalizar `src/cli/exit-codes.ts` a la **tabla común** del binario añadiendo `exitCodeForValidation(report)` y `exitCodeForInspection(inspection)` (0/3/4/5/6) **sin** modificar `exitCodeForResult` de `init` (ADR-0006). `2` sigue siendo `unchanged`.
  - **Deps**: T012, T013.
  - **Done**: funciones puras nuevas; init intacto; ningún código con doble significado.
  - **Test**: `tests/unit/cli/exit-codes.test.ts` — validate/inspect: válido→0, completo-inválido→3, parcial→4, no-localizable→5, lectura/fs→6; init sin cambios; `2` no reasignado. (FR-033/FR-034, SC-010)
- [ ] T035 [P] Implementar el **reporter textual de `validate`** en `src/infrastructure/reporter/validate-terminal-reporter.ts`: raíz anfitriona, archivos comprobados, estado final, nº errores/warnings, lista de issues. Comprensible sin ANSI. No altera el resultado.
  - **Deps**: T019, T031.
  - **Done**: implementa `ValidationReporter`; salida determinista; sin lógica de negocio.
  - **Test**: `tests/cli/validate-output.test.ts` — secciones presentes; igualdad semántica con el núcleo. (FR-031, SC-008)
- [ ] T036 Implementar el **reporter textual de `inspect`** en `src/infrastructure/reporter/inspect-terminal-reporter.ts`: árbol/tabla Identidad/Archivos/Tokens{Grupos,Valores,Aliases}/Validación; aplica `MAX_INSPECT_TERMINAL_TOKEN_ROWS = 200` **solo a la impresión** de filas de tokens, con aviso "Mostrando 200 de N; (N−200) no se muestran" en orden ADR-0010. No altera estadísticas/`valid`/issues/exit/parcialidad.
  - **Deps**: T019, T032, T002.
  - **Done**: cota de presentación 200; estadísticas completas siempre; aviso explícito (no truncado silencioso); sin navegación/Ink/Blessed/React.
  - **Test**: `tests/cli/inspect-cap.test.ts` — 199 filas (sin aviso); 200 (borde, sin aviso); 201 (200 + aviso de 1 omitido); conteos completos con solo 200 filas; mensaje exacto; CLI≡núcleo. (FR-032, C2, SC-007/SC-008)
- [ ] T037 Registrar los comandos `validate` e `inspect` en `src/cli/commands/validate.ts` y `src/cli/commands/inspect.ts` (Commander), delegando **toda** la lógica a los casos de uso; sin prompts; sin TTY obligatorio.
  - **Deps**: T031, T032, T034, T035, T036.
  - **Done**: comandos que pasan `executionDir`, ejecutan el caso de uso, presentan y mapean exit code; cero reglas de negocio en el comando.
  - **Test**: `tests/cli/commands.test.ts` — comandos registrados; sin prompts; ejecutan en CI sin TTY. (FR-030, US4)
- [ ] T038 Conectar el wiring de dependencias en `src/cli/composition.ts` y registrar los subcomandos en `src/cli/program.ts` (reusa la CLI base/`runCli` de 001; `init` sin cambios).
  - **Deps**: T037.
  - **Done**: composición de adapters reales (reader, validadores, reporters); `validate`/`inspect` visibles en `--help`; `init` intacto.
  - **Test**: `tests/cli/program.test.ts` — `--help` lista los 3 comandos; exit 0 para help/version. (FR-030/FR-034)

---

## Fase 9 — Testing integral, pureza observacional y regresión de `001`

> Muchas pruebas unitarias ya se crean junto a su unidad en Fases 2–8. Esta fase añade integración
> end-to-end, CLI por proceso hijo, pureza observacional y la regresión completa de `001`.

- [ ] T039 [P] Suite de **integración con DS válido creado por `init`** en `tests/integration/validate-inspect/init-fixture.test.ts`: crear el DS con el núcleo de `init` y verificar `validate`→válido/exit 0 e `inspect`→inspección completa/exit 0.
  - **Deps**: T031, T032.
  - **Done**: el documento de `init` valida e inspecciona correctamente.
  - **Test**: el propio archivo. (US1/US3, SC-008, regresión 001)
- [ ] T040 [P] Integración de **DTCG inválido / JSON roto / config / manifest / slug / SemVer** en `tests/integration/validate-inspect/invalid.test.ts`.
  - **Deps**: T031, T032.
  - **Done**: errores estructurados acumulados; inspect entrega lo recuperable; exit 3.
  - **Test**: el propio archivo. (FR-012/FR-015/FR-023, US2, SC-001)
- [ ] T041 [P] Integración de **política de `$type`** en `tests/integration/validate-inspect/type-policy.test.ts`: tipo own; por alias; por group; faltante; reconocido-no-profundo→warning (válido); no reconocido→error (inválido); `$extensions` no legitima; herencia + aliases encadenados.
  - **Deps**: T031, T032.
  - **Done**: cada caso produce severidad/validez correctas; `byType` por tipo efectivo; nodo no reconocido `untrusted`.
  - **Test**: el propio archivo. (FR-017/FR-018/FR-019, C1, SC-009)
- [ ] T042 [P] Integración de **portabilidad** (subcarpeta, monorepo, proyecto sin Git, sin `package.json`) en `tests/integration/validate-inspect/portability.test.ts`.
  - **Deps**: T031, T032.
  - **Done**: resuelve el workspace correcto; sin `package.json`→host/exit 5.
  - **Test**: el propio archivo. (FR-001, US4, SC-005)
- [ ] T043 [P] Integración de **límites** (archivo grande, árbol profundo, límite de nodos, alias largo) en `tests/integration/validate-inspect/limits.test.ts`.
  - **Deps**: T027, T031, T032.
  - **Done**: límite duro→error+`partial`; inspect entrega lo recuperado; sin desbordamiento ni truncado silencioso.
  - **Test**: el propio archivo. (FR-006, ADR-0009)
- [ ] T044 [P] [US6] **Pureza observacional**: snapshot (listado+bytes+mtime+permisos) antes/después de `validate` e `inspect` sobre estados válido/inválido/parcial en `tests/integration/validate-inspect/observational-purity.test.ts`.
  - **Deps**: T031, T032.
  - **Done**: snapshot idéntico; cero escrituras; cero staging; sin temporales en la raíz; `package.json`/config/tokens intactos.
  - **Test**: el propio archivo. (FR-002, US6, SC-002)
- [ ] T045 [P] **Determinismo y equivalencia validate/inspect** en `tests/integration/validate-inspect/determinism.test.ts`: mismo proyecto → mismo resultado/conteos; `inspect.validation` ≡ `validate`; validate→inspect sin cambios.
  - **Deps**: T031, T032.
  - **Done**: resultados deterministas; misma semántica de validación entre ambos comandos.
  - **Test**: el propio archivo. (SC-003/SC-008)
- [ ] T046 [P] [US5] **Headless** con adapters en memoria (sin Commander/Clack/TTY/consola/proceso hijo/`process.*`) en `tests/integration/validate-inspect/headless.test.ts`.
  - **Deps**: T022, T031, T032.
  - **Done**: ambos casos de uso ejecutables sin terminal; mismo resultado semántico que la CLI.
  - **Test**: el propio archivo. (FR-005, US5, SC-006)
- [ ] T047 [P] **CLI por proceso hijo** (CI sin TTY) en `tests/cli/child-process.test.ts`: ayuda, versión, `validate`, `inspect`; stdout/stderr; exit codes 0/3/4/5/6; igualdad semántica con el núcleo.
  - **Deps**: T037, T038.
  - **Done**: exit codes contractuales; sin prompts; funciona con stdin cerrado.
  - **Test**: el propio archivo. (FR-030/FR-031/FR-032/FR-033/FR-034, SC-008)
- [ ] T048 **Regresión completa de `001`** en `tests/integration/regression-001.test.ts`: suite de `init` verde; exit codes de `init` sin cambios; el DS de `init` pasa `validate` y se inspecciona; el `DtcgReadValidator` amplio **no** altera la salida de `init`; el `dtcg.schema` estricto de generación permanece intacto.
  - **Deps**: T029, T031, T032, T034.
  - **Done**: **274/274** de 001 verdes + nuevas aserciones de no-regresión; schema de generación sin cambios.
  - **Test**: el propio archivo + ejecución de la suite 001. (SC-010, separación de schemas)
- [ ] T049 **Arch-guard de 002**: ampliar/validar `scripts/arch-guard.mjs` para los nuevos directorios (dominio sin Node/fs/zod/ajv; aplicación sin infra/commander/clack/exit; reporters/CLI sin lógica de negocio).
  - **Deps**: todas las fases de implementación.
  - **Done**: `npm run lint` (arch-guard) verde con las nuevas rutas; sin violaciones de capas.
  - **Test**: `npm run lint`. (Constitución; arquitectura)
- [ ] T050 **Cierre**: ejecutar `npm run typecheck && npm run lint && npm test && npm run build`; actualizar la matriz de trazabilidad final y marcar tareas completadas.
  - **Deps**: T001–T049.
  - **Done**: typecheck/lint/build verdes; tests 274 (001) + nuevos de 002 verdes; matriz completa.
  - **Test**: pipeline completo verde.

---

## Dependencias críticas

```text
Fase 1 (T001–T002)
  └─▶ Fase 2 dominio (T003–T014)        [P] mayormente; T010←T006/T009; T011←T010; T012/T013/T014 cierran
        └─▶ Fase 3 puertos (T015–T020)  T015(byteSize)→T016→T017/T018; T019/T020
              └─▶ Fase 4 lectura (T021–T025)   T024←T016/T021/T023; T025←T024
                    └─▶ Fase 5 DTCG (T026–T028)   T027←T010/T011/T026; T028←T027
                          └─▶ Fase 6 tubería (T029–T030)   T029←T024/T026/T027
                                └─▶ Fase 7 use cases (T031–T033)
                                      └─▶ Fase 8 CLI (T034–T038)
                                            └─▶ Fase 9 tests/regresión (T039–T050)
```

**Ruta crítica** (secuencial): T001→T002→T010→T011→T027→T029→T031→T032→T036/T037→T048→T050.

## Paralelización real (`[P]`)

- **Fase 2**: T003, T004, T005, T006, T007, T008, T009 en paralelo (archivos distintos). T010 espera T006/T009.
- **Fase 4**: T022, T023 en paralelo con T021.
- **Fase 5**: T028 tras T027.
- **Fase 8**: T035 en paralelo con T034; T036 tras T032.
- **Fase 9**: T039–T047 en paralelo (archivos de test distintos); T048/T049/T050 al cierre.

> No se marcan `[P]` tareas que tocan `src/application/ports.ts` (T015–T020) entre sí: mismo archivo.

## Estrategia de implementación (incremental)

1. **MVP = US1+US2** (validate): Fases 1–7 (camino validate) + T031 + reporter T035 + comando validate.
2. **Incremento 2 = US3** (inspect): T032, T036, comando inspect, cota 200.
3. **Incremento 3 = US4/US5/US6/US7**: portabilidad, headless, pureza, parcial (mayoría ya cubierta por la tubería común).
4. **Cierre**: regresión 001 (T048) + arch-guard (T049) + pipeline (T050).

## Matriz de trazabilidad (US → FR → tarea → prueba)

| US | FR | Tareas | Prueba representativa |
|---|---|---|---|
| US1 validar-correcto | FR-001,010,011,012,016 | T029,T031,T039 | init-fixture.test |
| US2 todos-los-errores | FR-007,008,013,015 | T003,T027,T031,T040 | invalid.test |
| US3 inspeccionar | FR-020,021,022,023,024 | T011,T013,T032,T036 | inspect-usecase / inspect-cap |
| US4 subcarpeta/workspace | FR-001,030 | T029,T037,T042 | portability.test |
| US5 headless | FR-005,035 | T018,T020,T031,T032,T046 | headless.test |
| US6 pureza-observacional | FR-002,003,004 | T024,T025,T044 | observational-purity.test |
| US7 estructura-parcial | FR-011,016,023 | T005,T028,T033 | states.test |
| (común `$type`) | FR-017,018,019 | T009,T010,T026,T041 | effective-type / type-policy |
| (común CLI/exit) | FR-030,031,032,033,034,035 | T034–T038,T047 | exit-codes / child-process |

**Cobertura FR**: 001–008, 010–019, 020–024, 030–035 = **29/29**. **Cobertura SC**: SC-001(T029/T039),
SC-002(T044), SC-003(T045), SC-004(T027), SC-005(T042), SC-006(T046), SC-007(T011/T036), SC-008(T035/T045/T047),
SC-009(T026/T041), SC-010(T034/T048) = **10/10**.
