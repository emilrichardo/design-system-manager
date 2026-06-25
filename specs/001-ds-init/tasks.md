---
description: "Task list for feature 001-ds-init — Inicialización de un Design System local"
---

# Tasks: Inicialización de un Design System local (ds-init)

**Input**: Design documents from `specs/001-ds-init/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, ADRs
(`docs/adr/0001`–`0005`), constitution.md
**Tests**: INCLUIDOS — el usuario solicitó cobertura unitaria, de integración y de CLI explícita.

## Format & conventions

`- [ ] [TaskID] [P?] [Story?] Descripción con ruta`

- **[P]**: paralelizable (archivos distintos, sin dependencias pendientes).
- **[US#]**: historia asociada (US1 init · US2 no-overwrite · US3 idempotencia · US4 portabilidad ·
  US5 atomicidad). Tareas de Setup/Foundational/Polish no llevan etiqueta de historia.
- Cada tarea incluye sub-bullets: **Deps** (dependencias), **Done** (criterio objetivo) y
  **Test** (prueba que la demuestra).
- Estructura del paquete (plan.md): `src/{domain,application,infrastructure,schemas,cli}`,
  `tests/{unit,integration,cli}`. DS creado (ADR-0004): `neuraz-ds.config.json` +
  `design-system/design-system.json` + `design-system/tokens/base.tokens.json`.

> **Organización**: por la naturaleza del comando único `init`, las historias US1–US5 se entregan
> por las **mismas** fases por capas (Fase 1–9, según pedido). Cada tarea se etiqueta con la(s)
> historia(s) que sirve; la matriz de trazabilidad al final mapea US → FR → tarea → prueba.

---

## Phase 1 — Bootstrap técnico (Setup)

**Purpose**: Estructura del paquete npm, TypeScript estricto + ESM, herramientas de prueba/calidad.

- [ ] T001 Crear `package.json` del paquete (`name: @neuraz/design-system-manager`, `type: module`, `bin: { "neuraz-ds": "dist/cli/index.js" }`, `engines.node: ">=22"`, scripts `build/test/typecheck/lint`) según ADR-0005 y plan.md
  - Deps: —
  - Done: `package.json` válido; `npm run` lista los scripts; sin dependencias instaladas aún.
  - Test: `tests/unit/package-manifest.test.ts` valida campos clave (`bin`, `type`, `engines`).
- [ ] T002 [P] Configurar `tsconfig.json` estricto (`strict: true`, `module/moduleResolution: NodeNext`, `target` acorde a Node 22, `outDir: dist`)
  - Deps: T001
  - Done: `npm run typecheck` pasa en un proyecto vacío.
  - Test: typecheck en CI local sin errores.
- [ ] T003 [P] Configurar Vitest (`vitest.config.ts`) con entornos node y rutas `tests/**`
  - Deps: T001
  - Done: `npm test` ejecuta una prueba trivial verde.
  - Test: `tests/unit/smoke.test.ts`.
- [ ] T004 [P] Configurar linter/formatter y regla que prohíbe `console.*` en `src/domain/**` y `src/application/**`
  - Deps: T001
  - Done: el lint falla si se añade `console.log` en domain/application.
  - Test: `tests/unit/lint-no-console.test.ts` (o regla lint verificada en T070).
- [ ] T005 Crear el árbol de directorios `src/{domain,application,infrastructure,schemas,cli}` y `tests/{unit,integration,cli}` con `index.ts` barrel mínimos
  - Deps: T002
  - Done: imports entre capas resuelven; `typecheck` pasa.
  - Test: compilación.
- [ ] T006 [P] Crear helper de pruebas para directorios temporales aislados en `tests/helpers/tmp-project.ts` (crea `package.json`, opcional `.git`, limpia al final)
  - Deps: T003, T005
  - Done: helper crea/borra un proyecto npm temporal; reutilizable por integración.
  - Test: `tests/unit/tmp-project.test.ts`.
- [ ] T007 [P] Declarar (sin instalar) las dependencias previstas en `package.json`: prod `commander`, `@clack/prompts`, `zod`, `ajv`, `semver`; dev `typescript`, `vitest`, `@types/node` (ADR-0005)
  - Deps: T001
  - Done: `dependencies`/`devDependencies` reflejan ADR-0005; sin `node_modules` en el repo.
  - Test: `tests/unit/package-manifest.test.ts` verifica presencia de cada dep declarada.

**Checkpoint**: andamiaje listo; capas vacías compilan; pruebas ejecutan.

---

## Phase 2 — Dominio (Foundational, puro y sin I/O)

**Purpose**: Reglas puras testeables. ⚠️ Sin dependencias de CLI/Clack/fs/console/process.

- [ ] T008 [P] [US1] Crear value object de **nombre** (no vacío tras trim) en `src/domain/identity/name.ts`
  - Deps: T005
  - Done: rechaza nombre vacío/solo-espacios; acepta texto libre.
  - Test: `tests/unit/name.test.ts`.
- [ ] T009 [P] [US1] Crear validador puro de **slug** con la regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` en `src/domain/identity/slug.ts`
  - Deps: T005
  - Done: acepta `mpf-design-system`,`neuraz`,`municipal-ui-2026`; rechaza `MPF Design System`,`mpf_design_system`,`-mpf`,`mpf-`,`mpf--design`,`../design-system` (ADR-0003).
  - Test: `tests/unit/slug-validate.test.ts` (todos los ejemplos válidos/inválidos de ADR-0003).
- [ ] T010 [P] [US1] Implementar **derivación de slug** desde el nombre (minúsculas → quitar diacríticos → separadores/espacios a `-` → eliminar no permitidos → recortar `-`; vacío ⇒ requiere edición) en `src/domain/identity/slugify.ts`
  - Deps: T005
  - Done: `"Município Público"` → `municipio-publico`; resultado vacío señala "requiere edición".
  - Test: `tests/unit/slugify.test.ts` (incluye diacríticos y caso vacío).
- [ ] T011 [P] [US1] Implementar validación **SemVer** (envoltura pura sobre `semver`) en `src/domain/identity/version.ts` con default `0.1.0`
  - Deps: T005
  - Done: acepta `0.1.0`,`1.0.0`,`1.2.3`,`1.0.0-beta.1`; rechaza no-SemVer; default `0.1.0`.
  - Test: `tests/unit/version.test.ts`.
- [ ] T012 [P] [US1] Definir `DesignSystemIdentity` (name, slug, description?, version) en `src/domain/identity/design-system-identity.ts`
  - Deps: T008–T011
  - Done: construye identidad válida; rechaza inválida agregando errores de dominio.
  - Test: `tests/unit/identity.test.ts`.
- [ ] T013 [P] [US3][US2][US5] Definir el enum/clasificación de **estado previo** (`none`/`complete-valid`/`partial`/`complete-invalid`) en `src/domain/state/previous-state.ts`
  - Deps: T005
  - Done: tipo exhaustivo de 4 estados con metadatos (archivos presentes/ausentes).
  - Test: `tests/unit/previous-state.test.ts`.
- [ ] T014 [P] [US2][US5] Definir `InitializationPlan` y `Conflict` (filesToCreate, conflicts, previousState, hostRoot) en `src/domain/plan/initialization-plan.ts`
  - Deps: T013
  - Done: modela el plan y la lista de conflictos sin tocar el FS.
  - Test: `tests/unit/initialization-plan.test.ts`.
- [ ] T015 [P] Definir `InitializationResult` (created/unchanged/cancelled/conflict/failed) + `Issue` en `src/domain/result/initialization-result.ts` (contracts/initialization-result.contract.md)
  - Deps: T005
  - Done: unión discriminada exacta del contrato; `failed.errors[].code` ∈ {host,validation,filesystem,post-verify}.
  - Test: `tests/unit/initialization-result.test.ts`.
- [ ] T016 [P] Definir errores de dominio y `ValidationResult` (ok/errors/warnings) en `src/domain/validation/validation-result.ts`
  - Deps: T005
  - Done: distingue errores críticos (bloquean) de warnings (no bloquean).
  - Test: `tests/unit/validation-result.test.ts`.

**Checkpoint**: dominio completo, puro y verde; ninguna importación de capas externas.

---

## Phase 3 — Resolución e inspección (Infrastructure + puerto)

**Purpose**: Resolver la **raíz anfitriona** y clasificar el estado previo. Seguridad de rutas
(ADR-0002).

- [ ] T017 [US1] Definir el puerto `HostRootResolver` en `src/application/ports.ts` (entrada: cwd; salida: `HostRoot` o error `host`)
  - Deps: T015
  - Done: interfaz sin dependencia de Node; testeable con fakes.
  - Test: cubierto por T019/T060.
- [ ] T018 [US1] Implementar **resolución de raíz anfitriona** en `src/infrastructure/host-root/resolve-host-root.ts`: realpath de cwd, ascenso al `package.json` más cercano, tope en raíz Git, monorepo = más cercano, sin Git = dir del package.json (ADR-0002, FR-001c–001g)
  - Deps: T017
  - Done: devuelve `rootDir/packageJsonPath/gitRootDir/isMonorepoChild`; nunca asciende sobre la raíz Git.
  - Test: `tests/unit/resolve-host-root.test.ts` (raíz, subcarpeta, monorepo, sin Git).
- [ ] T019 [P][US2][US5] Implementar utilidad de **seguridad de rutas** en `src/infrastructure/host-root/path-guard.ts`: normalización por `realpath`, contención (`startsWith(rootDir+sep)`), rechazo de `..`/escapes/symlinks externos/otros workspaces (FR-001h, FR-025)
  - Deps: T018
  - Done: acepta rutas dentro; rechaza escapes, symlink externo y rutas absolutas externas.
  - Test: `tests/unit/path-guard.test.ts` (contención, `..`, symlink externo, otro workspace).
- [ ] T020 [US1] Implementar verificación de **`package.json` obligatorio** dentro del límite en `src/infrastructure/host-root/require-package-json.ts` (FR-001a/001b, ADR-0001) → error `host` si ausente
  - Deps: T018
  - Done: ausencia ⇒ resultado/`Issue` `host` sin escribir; nunca crea ni modifica `package.json`.
  - Test: `tests/integration/no-package-json.test.ts` (exit 5; cero escrituras).
- [ ] T021 [US3][US2][US5] Implementar **inspección de estado previo** en `src/infrastructure/host-root/inspect-state.ts`: clasifica `none`/`complete-valid`/`partial`/`complete-invalid` leyendo config/manifest/tokens (data-model §estados)
  - Deps: T013, T019, T032 (validadores), T020
  - Done: clasifica correctamente cada estado; `partial` lista presentes y obligatorios ausentes; no escribe.
  - Test: `tests/unit/inspect-state.test.ts` + integración T061–T064.

**Checkpoint**: raíz resuelta y estado clasificado de forma aislada y segura.

---

## Phase 4 — Generación y validación (schemas + builders)

**Purpose**: Construir en memoria config/manifiesto/tokens y validarlos en 3 capas (research §7).

- [ ] T022 [P][US1] Crear JSON Schema 2020-12 de **config** en `src/schemas/neuraz-ds.config.schema.json` (contracts/neuraz-ds.config.schema.md)
  - Deps: T005
  - Done: valida `configSchemaVersion`, `designSystemDir`, `formatVersion`.
  - Test: `tests/unit/config-schema.test.ts`.
- [ ] T023 [P][US1] Crear JSON Schema 2020-12 de **manifiesto** en `src/schemas/design-system.manifest.schema.json` (contracts/design-system.manifest.schema.md)
  - Deps: T005
  - Done: valida identidad + `manifestSchemaVersion` + `version` SemVer.
  - Test: `tests/unit/manifest-schema.test.ts`.
- [ ] T024 [P][US1] Crear JSON Schema 2020-12 del **documento DTCG** mínimo en `src/schemas/dtcg-tokens.schema.json` (subconjunto soportado: grupos, `$type`,`$value`,`$description`, aliases)
  - Deps: T005
  - Done: acepta el documento de ADR-0004; rechaza `$type` no soportado o estructura inválida.
  - Test: `tests/unit/dtcg-schema.test.ts`.
- [ ] T025 [P][US1] Implementar **builder de config** en `src/domain/builders/build-config.ts` (`designSystemDir: "design-system"`, `formatVersion: "2025.10"`)
  - Deps: T012
  - Done: produce objeto que valida contra T022; sin duplicar identidad del manifiesto.
  - Test: `tests/unit/build-config.test.ts`.
- [ ] T026 [P][US1] Implementar **builder de manifiesto** en `src/domain/builders/build-manifest.ts` (identidad + `tokensDir: "tokens"`, sin valores visuales)
  - Deps: T012
  - Done: produce objeto que valida contra T023.
  - Test: `tests/unit/build-manifest.test.ts`.
- [ ] T027 [P][US1] Implementar **builder de tokens DTCG mínimos** en `src/domain/builders/build-tokens.ts` con grupo `color`, `$type`, base `blue-500`, alias `brand.primary = {color.base.blue-500}` (contracts/dtcg-tokens.contract.md)
  - Deps: T005
  - Done: produce el documento exacto de ADR-0004 con un alias válido.
  - Test: `tests/unit/build-tokens.test.ts`.
- [ ] T028 [US1] Implementar **validador DTCG (ajv 2020-12)** en `src/infrastructure/validation/dtcg-validator.ts` incluyendo comprobación de **referencias** (alias existente, sin ciclos) acotada al archivo generado
  - Deps: T024
  - Done: valida el documento mínimo; detecta referencia inexistente y ciclo como error crítico.
  - Test: `tests/unit/dtcg-validator.test.ts` (válido, ref inexistente, ciclo).
- [ ] T029 [US1] Implementar **validadores zod** de entrada/dominio (identidad, config, manifiesto) en `src/infrastructure/validation/schema-validators.ts`
  - Deps: T012, T022, T023
  - Done: tipos derivados; errores mapeados a `Issue` categoría `validation`.
  - Test: `tests/unit/schema-validators.test.ts`.
- [ ] T030 [US1][US5] Implementar **orquestador de validación previa** (3 capas: entrada → dominio → documentos a escribir) en `src/application/validate-plan.ts`
  - Deps: T028, T029, T014
  - Done: devuelve `ValidationResult`; errores críticos impiden continuar (antes de escribir).
  - Test: `tests/unit/validate-plan.test.ts`.

**Checkpoint**: documentos construibles en memoria y validables sin tocar disco.

---

## Phase 5 — Escritura transaccional (Infrastructure)

**Purpose**: stage → commit → verify con rollback. Nunca estado parcial (US5, FR-022).

- [ ] T031 [US1] Definir el puerto `FileSystem` en `src/application/ports.ts` (read, exists, mkdtemp dentro de root, write, rename, rm, realpath)
  - Deps: T015
  - Done: interfaz mínima; implementable con `node:fs` y con fake en memoria.
  - Test: cubierto por T033/T060.
- [ ] T032 [P][US2] Implementar **detección de conflictos** en `src/infrastructure/fs/detect-conflicts.ts` comparando rutas objetivo con el FS real (sin sobrescribir)
  - Deps: T031, T019
  - Done: enumera rutas ocupadas; nunca escribe.
  - Test: `tests/unit/detect-conflicts.test.ts`.
- [ ] T033 [US1][US5] Implementar **escritura transaccional** en `src/infrastructure/fs/transactional-writer.ts`: `stage` (mkdtemp dentro de la raíz) → escribir temporales → `commit` (rename atómico) → `cleanup` → `rollback` ante fallo
  - Deps: T031, T019
  - Done: éxito promueve atómicamente; fallo en cualquier punto deja el FS sin cambios.
  - Test: `tests/integration/transactional-writer.test.ts` (éxito, fallo en stage, fallo en commit).
- [ ] T034 [US5] Implementar **verificación posterior** en `src/infrastructure/fs/verify-persisted.ts` releyendo y validando config/manifest/tokens; fallo ⇒ `Issue` `post-verify` + limpieza
  - Deps: T033, T028, T029
  - Done: detecta corrupción/escritura incompleta tras commit; dispara limpieza.
  - Test: `tests/integration/verify-persisted.test.ts` (error en verify ⇒ exit 7).
- [ ] T035 [P][US1] Implementar **serialización JSON determinista** en `src/infrastructure/serialization/json.ts` (orden estable, newline final, 2 espacios)
  - Deps: T005
  - Done: salida estable y legible (Constitución VII/XVII).
  - Test: `tests/unit/json-serialization.test.ts`.

**Checkpoint**: escritura segura y reversible verificada con simulación de fallos.

---

## Phase 6 — Caso de uso (Application)

**Purpose**: Orquestar `resolve→inspect→plan→validate→confirm→stage→commit→verify→report` sin
acoplar terminal. ⚠️ Sin `console.log`, sin `@clack`, sin `process.exit`, sin escribir directo.

- [ ] T036 [US1] Definir puertos restantes `Prompter` y `Reporter` en `src/application/ports.ts` (datos semánticos, no texto preformateado)
  - Deps: T015
  - Done: `Prompter` pide identidad/confirmación; `Reporter` recibe eventos semánticos (info/warn/conflict/error/success).
  - Test: cubierto por T060.
- [ ] T037 [US1][US2][US3][US5] Implementar el caso de uso `initializeDesignSystem` en `src/application/initialize-design-system.ts` orquestando las 9 fases mediante puertos; **sin escritura persistente antes de `confirm`**
  - Deps: T017, T021, T030, T031, T033, T034, T036
  - Done: cada fase identificable; devuelve `InitializationResult`; sin I/O directo ni terminal.
  - Test: `tests/unit/initialize-design-system.test.ts` (con adapters en memoria).
- [ ] T038 [US1] Implementar el **mapeo estado→resultado** dentro del caso de uso: `none`→flujo creación; `complete-valid`→`unchanged`; `partial`→`conflict`; `complete-invalid`→`failed/validation` (data-model)
  - Deps: T037
  - Done: cada estado produce el `status` correcto; `partial` lista presentes/ausentes; no escribe.
  - Test: `tests/unit/state-to-result.test.ts` (4 estados).
- [ ] T039 [US3] Garantizar **idempotencia**: segunda ejecución sobre `complete-valid` no modifica nada
  - Deps: T038
  - Done: 2ª corrida → `unchanged`, cero escrituras.
  - Test: `tests/integration/idempotent-second-run.test.ts`.
- [ ] T040 [P][US1][US4] Crear **adapters en memoria** (`InMemoryFileSystem`, `ScriptedPrompter`, `RecordingReporter`, `FakeHostRootResolver`) en `tests/helpers/in-memory-adapters.ts`
  - Deps: T031, T036
  - Done: permiten ejecutar el caso de uso **sin terminal ni FS real**.
  - Test: usados por T037/T038; `tests/unit/use-case-headless.test.ts` prueba ejecución sin terminal.

**Checkpoint**: `init` ejecutable headless con resultado estructurado; listo para múltiples interfaces.

---

## Phase 7 — CLI (Infrastructure de presentación + binario)

**Purpose**: Commander + Clack + reporter + exit codes. Sin reglas de negocio en el comando.

- [ ] T041 [US1] Implementar el adapter **Prompter con `@clack/prompts`** en `src/infrastructure/prompts/clack-prompter.ts` (identidad + confirmación; cancelación → `cancelled`)
  - Deps: T036
  - Done: implementa el puerto `Prompter`; la cancelación se propaga como estado, no como excepción no controlada.
  - Test: `tests/unit/clack-prompter.test.ts` (mock de clack) + CLI T056.
- [ ] T042 [US1] Implementar el adapter **Reporter de terminal** en `src/infrastructure/reporter/terminal-reporter.ts` con categorías info/advertencia/conflicto/error/éxito (FR-019)
  - Deps: T036
  - Done: traduce eventos semánticos a salida; separado del caso de uso.
  - Test: `tests/unit/terminal-reporter.test.ts`.
- [ ] T043 [US1] Configurar **Commander** y registrar el comando `init` en `src/cli/index.ts` y `src/cli/commands/init.ts`; delega todo al caso de uso
  - Deps: T037, T041, T042
  - Done: `neuraz-ds init` arranca el flujo; el comando no contiene reglas de negocio.
  - Test: `tests/cli/help.test.ts`, `tests/cli/unknown-command.test.ts`.
- [ ] T044 [US1][US5] Implementar el **mapeo resultado→exit code** en `src/cli/exit-codes.ts` (0/1/2/3/4/5/6/7 según contracts/exit-codes.md) y la traducción `Issue.code`→exit
  - Deps: T015, T043
  - Done: cada `status`/`Issue.code` produce el exit contractual exacto.
  - Test: `tests/unit/exit-codes.test.ts` (los 8 códigos).
- [ ] T045 [US5] Manejar **señales/interrupciones** (SIGINT/SIGTERM) en `src/cli/index.ts`: cancelar limpio (`cancelled`, exit 1) sin dejar archivos parciales
  - Deps: T044, T033
  - Done: Ctrl-C antes de commit ⇒ sin escritura; durante stage ⇒ rollback.
  - Test: `tests/cli/sigint.test.ts`.
- [ ] T046 [US1] Mostrar la **raíz anfitriona resuelta** y el plan antes de confirmar (FR-001f, FR-010)
  - Deps: T043, T018
  - Done: la salida previa a `confirm` incluye la raíz y los archivos a crear.
  - Test: `tests/cli/plan-preview.test.ts`.

**Checkpoint**: CLI funcional de extremo a extremo; lógica solo en application/domain.

---

## Phase 8 — Pruebas de integración (directorios temporales)

**Purpose**: Validar escenarios reales de spec/quickstart con FS real en temp dirs (SC-007).

- [ ] T047 [P][US1] Integración: **proyecto npm válido, ejecución desde la raíz** → `created` (exit 0); crea la estructura ADR-0004 en `tests/integration/happy-root.test.ts`
  - Deps: T043; Done: archivos creados y válidos; Test: este archivo.
- [ ] T048 [P][US1] Integración: **ejecución desde subcarpeta** resuelve a la raíz del package.json más cercano en `tests/integration/from-subfolder.test.ts`
  - Deps: T018; Done: escribe en la raíz correcta; Test: este archivo.
- [ ] T049 [P][US1] Integración: **monorepo** usa el package.json más cercano (no la raíz global) en `tests/integration/monorepo-nearest.test.ts`
  - Deps: T018; Done: raíz = workspace cercano; Test: este archivo.
- [ ] T050 [P][US1] Integración: **sin `package.json`** → `failed/host` (exit 5), cero escrituras en `tests/integration/no-package-json.test.ts`
  - Deps: T020; Done: nada escrito; Test: este archivo.
- [ ] T051 [P][US1] Integración: estado **`none`** → `created` (exit 0) tras confirmar en `tests/integration/state-none.test.ts`
  - Deps: T038; Done: crea DS; Test: este archivo.
- [ ] T052 [P][US3] Integración: estado **`complete-valid`** → `unchanged` (exit 2) en `tests/integration/state-complete-valid.test.ts`
  - Deps: T038; Done: sin cambios; Test: este archivo.
- [ ] T053 [P][US2] Integración: estado **`partial`** → `conflict` (exit 4); enumera presentes y ausentes; no escribe en `tests/integration/state-partial.test.ts`
  - Deps: T038; Done: lista de presentes/ausentes correcta; cero escrituras; Test: este archivo.
- [ ] T054 [P][US2] Integración: estado **`complete-invalid`** → `failed/validation` (exit 3); no modifica en `tests/integration/state-complete-invalid.test.ts`
  - Deps: T038; Done: informa errores; sin cambios; Test: este archivo.
- [ ] T055 [P][US2][US5] Integración: **symlink externo / ruta que escapa** → `failed/host` (exit 5) antes de escribir en `tests/integration/external-symlink.test.ts`
  - Deps: T019; Done: rechazo previo a escritura; Test: este archivo.
- [ ] T056 [P][US5] Integración: **sin permisos de escritura** → `failed/filesystem` (exit 6), sin parciales en `tests/integration/no-write-permission.test.ts`
  - Deps: T033; Done: rollback; Test: este archivo.
- [ ] T057 [P][US1] Integración: **cancelación** en confirmación → `cancelled` (exit 1), cero escrituras en `tests/integration/cancel.test.ts`
  - Deps: T037; Done: nada escrito; Test: este archivo.
- [ ] T058 [P][US5] Integración: **error en stage**, **error en commit**, **error en verify** (inyectados) → exit 6/6/7 con rollback/limpieza en `tests/integration/transaction-failures.test.ts`
  - Deps: T033, T034; Done: cada punto de fallo no deja estado parcial; Test: este archivo.
- [ ] T059 [P][US3] Integración: **segunda ejecución** idempotente en `tests/integration/second-run.test.ts`
  - Deps: T039; Done: 2ª corrida `unchanged`; Test: este archivo.
- [ ] T060 [P][US4] Integración de **portabilidad**: tras `init`, los archivos validan con un validador externo y permanecen legibles sin el gestor en `tests/integration/portability.test.ts`
  - Deps: T047; Done: archivos válidos e independientes del paquete; Test: este archivo.
- [ ] T061 [P][US1] CLI: **éxito, unchanged, conflicto, host inválido, filesystem, post-verify, entrada inválida** por subproceso, verificando exit codes y archivos en `tests/cli/exit-matrix.test.ts`
  - Deps: T044; Done: matriz de exit codes verde (verificación semántica, no solo snapshots); Test: este archivo.

**Checkpoint**: todos los escenarios de spec/quickstart cubiertos con FS real.

---

## Phase 9 — Documentación y validación final (Polish)

**Purpose**: Documentación mínima de `001-ds-init` y verificación de empaquetado/constitución.

- [ ] T062 [P] Actualizar `specs/001-ds-init/quickstart.md` con los comandos reales una vez estabilizada la CLI
  - Deps: T061; Done: quickstart ejecutable coincide con la CLI; Test: revisión manual + T064.
- [ ] T063 [P] Escribir `README.md` del paquete con uso de `neuraz-ds init` (sin ampliar alcance)
  - Deps: T061; Done: README describe instalación y `init`; Test: lint de enlaces.
- [ ] T064 Prueba de **empaquetado** (`npm pack`) y de ejecución vía **`npx`** en un proyecto temporal en `tests/integration/packaging-npx.test.ts`
  - Deps: T043; Done: el tarball expone `bin` y `npx neuraz-ds init` funciona; Test: este archivo.
- [ ] T065 **Auditoría constitucional**: test que verifica ausencia de `console.*` e imports de `@clack`/`commander` en `src/domain/**` y `src/application/**` en `tests/unit/architecture-guard.test.ts`
  - Deps: T037; Done: el test falla si una capa importa lo prohibido (Constitución V/XV); Test: este archivo.
- [ ] T066 Verificar que `initializeDesignSystem` corre **headless** y que `Prompter`/`Reporter` son puertos independientes (preparación TUI/Studio/MCP) en `tests/unit/headless-and-ports.test.ts`
  - Deps: T040; Done: caso de uso ejecutable sin terminal; resultado semántico; Test: este archivo.

**Checkpoint**: feature documentada, empaquetable y conforme a la constitución.

---

## Dependencies & Execution Order

- **Fase 1 (Setup)**: sin dependencias → primero.
- **Fase 2 (Dominio)**: depende de Fase 1; bloquea a las demás.
- **Fase 3 (Resolución/inspección)**: depende de Dominio + validadores (T028/T029 para `inspect`).
- **Fase 4 (Generación/validación)**: depende de Dominio.
- **Fase 5 (Transaccional)**: depende de puerto FS (T031) y path-guard (T019).
- **Fase 6 (Caso de uso)**: depende de Fases 3–5.
- **Fase 7 (CLI)**: depende de Fase 6.
- **Fase 8 (Integración)**: depende de Fase 7.
- **Fase 9 (Docs/validación)**: depende de Fase 8.

**Dependencias críticas**: T018 (resolución de raíz) y T019 (path-guard) → habilitan T020/T021/T032/T033;
T037 (caso de uso) → habilita toda la Fase 7–8; T044 (exit codes) → matriz de CLI.

### Paralelizables (`[P]`)
Setup T002/T003/T004/T006/T007; dominio T008–T016; schemas/builders T022–T027; T035; adapters T040;
y prácticamente toda la Fase 8 (T047–T061) por usar archivos de prueba distintos.

---

## Trazabilidad — Historia → FR → Tareas → Pruebas

| Historia | FR principales | Tareas | Pruebas clave |
|---|---|---|---|
| **US1** Inicializar | FR-001,001a–001g,003,006–018,033–035; SC-001,002,007 | T008–T012, T017–T018, T020, T022–T030, T031,T033,T035, T036–T038, T041–T046, T047–T051, T061, T064 | happy-root, state-none, exit-matrix, packaging-npx |
| **US2** No sobrescribir | FR-005,010,011,026; SC-004 | T014, T019, T032, T038, T053, T054, T055 | detect-conflicts, state-partial, external-symlink |
| **US3** Idempotencia | FR-004,020,021 | T013, T021, T038, T039, T052, T059 | state-complete-valid, second-run |
| **US4** Portabilidad | FR-023,024; SC-005 | T035, T040, T060 | portability |
| **US5** Atomicidad | FR-008,017,022; SC-006 | T014, T030, T033, T034, T045, T056, T058 | transactional-writer, transaction-failures, verify-persisted, no-write-permission |

| Seguridad (FR-025–032, 001a/001b/001h) | T004, T019, T020, T028, T033, T045, T055, T065 |
|---|---|

**Cobertura FR/SC**: los 44 FR y 7 SC tienen ≥1 tarea responsable (FR-027/030/031/032 — no ejecutar
código de datos, no publicar/commitear, sin cloud/admin, sin secretos — se cubren por diseño en
T037/T043 y se verifican en T065/T064). Ningún FR/SC queda huérfano.

---

## Implementation Strategy

1. **Fase 1 → 2** primero (base + dominio puro): mayor valor de verificación temprana.
2. **Fase 3 → 5** habilitan el flujo seguro (resolución, validación, transacción).
3. **Fase 6** integra el caso de uso headless — **MVP testeable sin CLI** (US1 + estados).
4. **Fase 7** añade la CLI real; **Fase 8** valida escenarios end-to-end; **Fase 9** documenta/audita.
5. Commit por tarea o grupo lógico; detener en cada checkpoint para validar.

## Notas

- Tests incluidos por pedido explícito (TDD recomendado: escribir la prueba de cada tarea antes de
  implementarla).
- Sin librerías TUI (Ink/Blessed/React); sin Style Dictionary; sin reparación/migración; un solo DS.
- Total de tareas: **66** (T001–T066).
