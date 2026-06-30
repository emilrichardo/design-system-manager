# Tasks: 007-asset-manager

**Input**: `specs/007-asset-manager/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Scope**: Manual local Asset Manager (fonts, logos, SVG, icons, images) under `design-system/assets/`,
strictly separate from DTCG tokens. Headless use cases + `1.0.0` contracts; transactional writes; reuse
of the shared outcome/exit vocabulary. Reuses `005`/`006` transactional/ownership PATTERNS, not their code.
**Generated**: 2026-06-30
**Status**: Backlog; ninguna tarea completada. No implementa código aquí.

## Execution Rules

- Orden por checkpoint: A → B → C → D → E → F. Cada checkpoint termina con un gate y un commit sugerido.
- Checkpoints amplios: cada tarea es una unidad significativa y verificable; evitar microtareas e
  informes intermedios. Marcar tareas solo dentro del rango del checkpoint en curso.
- Reglas contractuales no negociables (spec, research, data-model, contracts):
  - **Separación tokens/assets**: ninguna operación lee/parsea/escribe `design-system/tokens/**`,
    `design-system/design-system.json` ni `design-system/build/**`; `001`–`006` quedan byte-estables.
  - **Plan read-only**: `import plan` nunca escribe; el store y el manifest quedan byte-idénticos.
  - **Escrituras transaccionales**: `apply`/`remove` publican como conjunto (todo o nada) con
    verificación, backup y recuperación explícita; sin publicación parcial.
  - **SVG sanitizado siempre** antes de escribir; **licencia nunca asumida**; **symlinks nunca seguidos**;
    **contenido desconocido preservado o bloqueante**.
  - **Paths públicos lógicos y relativos**; sin rutas absolutas/stack/secretos.
- No crear `specs/007-asset-manager/audit.md` hasta el cierre del checkpoint F.
- No modificar `src/**`, `tests/**` ni `package.json` durante la fase de especificación (esta fase).

## Checkpoint A — Domain models, ordering and contracts surface

**Objective**: Modelos de dominio inmutables y la superficie pública del Asset Manager, alineados con los
contratos `1.0.0`, sin filesystem ni adaptadores.
**Preconditions**: spec/plan/research/data-model/contracts vigentes; `001`–`006` cerradas.

### Tasks

- [X] T001 [US1] Crear `src/domain/assets/asset-kind.ts` y `asset-mime.ts`: `AssetKind`
  (`font|logo|svg|icon|image`), familias MIME cerradas v1 y la compatibilidad kind↔MIME.
- [X] T002 [US2] Crear `src/domain/assets/asset-record.ts`: `AssetRecord`, `AssetDimensions`,
  `AssetProvenance`, `AssetLicense` (con `status: declared|unspecified`, nunca asumida).
- [X] T003 [US11] Crear `src/domain/assets/asset-manifest.ts`: `AssetManifestV1`, validación estricta
  (claves conocidas, paths seguros, sin duplicados, hashes válidos) y serialización canónica
  (`JSON.stringify(...,2)+"\n"`).
- [X] T004 [US12] Crear `src/domain/assets/asset-outcome.ts`: `AssetOutcome`, `AssetIssue`,
  `AssetRecoveryState`, `SafeAssetError`; invariantes `wrote`/recovery; prohibir `partial`/`success`.
- [X] T005 [US1] Crear `src/domain/assets/asset-order.ts`: orden canónico determinista (por kind, luego
  logicalPath bytewise; sin locale).
- [X] T006 [US14] Crear `src/domain/assets/index.ts`: superficie pública (solo tipos y funciones puras).
- [X] T007 [P] [US1] Crear `tests/domain/assets/asset-models.test.ts`: enums cerrados, inmutabilidad,
  null policy, invariantes de outcome/recovery, prohibición de `partial`/`success`.
- [X] T008 Gate A: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna (modelos nuevos aislados).
**Suggested commit**: `feat: add asset manager domain models and contracts surface`
**Exclusions**: sin filesystem, sin probes, sin writer, sin CLI.
**First task next checkpoint**: T009.

## Checkpoint B — Store reader, probes, validators and SVG sanitizer

**Objective**: Infraestructura pura/aislada tras puertos: detección de MIME por firma, dimensiones por
cabecera, validación de fuentes, sanitización de SVG, hashing y lectura del store (ownership/unknown).
**Preconditions**: Checkpoint A completo y gate A verde.

### Tasks

- [X] T009 [US1] Crear `src/infrastructure/assets/hash.ts` (SHA-256 lowercase hex sobre bytes exactos) o
  reusar el primitivo equivalente sin acoplar código de build.
- [X] T010 [US2] Crear `src/infrastructure/assets/mime-detector.ts`: MIME por firma (font/raster/svg),
  extensión solo como pista; desconocido → `null`.
- [X] T011 [US13] Crear `src/infrastructure/assets/dimension-reader.ts`: PNG/JPEG/GIF/WebP/AVIF por
  cabecera y SVG por `width`/`height`/`viewBox`; undeterminable → `null` (sin adivinar).
- [X] T012 [US8] Crear `src/infrastructure/assets/font-validator.ts`: firmas `wOF2`/`wOFF`/sfnt y
  estructura mínima; sin conversión.
- [X] T013 [US5] Crear `src/infrastructure/assets/svg-sanitizer.ts`: allowlist; elimina script/handlers/
  refs externas/foreignObject/DOCTYPE/entidades; `safe:false`+`bytes:null` cuando no es saneable.
- [X] T014 [US11] Crear `src/infrastructure/assets/asset-store-reader.ts`: lee `assets.json`, estados de
  paths (lstat, sin seguir symlinks), nodos desconocidos, defensa de contención.
- [X] T015 [P] [US5] Crear `tests/integration/assets/svg-sanitizer.test.ts`: script/onload/href externo
  removidos; SVG no saneable bloqueado; bytes saneados deterministas.
- [X] T016 [P] [US13] Crear `tests/integration/assets/probes.test.ts`: MIME por firma, dimensiones por
  formato, fuente válida vs mislabeled, hashing determinista.
- [X] T017 Gate B: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: confirmar que no se toca tokens/host/build (solo `design-system/assets/**`).
**Suggested commit**: `feat: add asset probes, font validation and svg sanitization`
**Exclusions**: sin use cases de lectura, sin writer transaccional, sin CLI.
**First task next checkpoint**: T018.

## Checkpoint C — Headless read use cases, JSON envelope and reporters

**Objective**: `listAssets` e `inspectAsset` headless, clasificación de ownership, summary, DTO/mapper/
serializer `AssetJsonEnvelopeV1` y reporters humano/JSON reutilizables.
**Preconditions**: Checkpoints A–B completos y gates verdes.

### Tasks

- [X] T018 [US14] Crear `src/application/assets/asset-ports.ts`: puertos (store reader, probes, writer) y
  tipos internos; sin Node/Commander.
- [X] T019 [US1] Crear `src/application/assets/list-assets.ts`: listado determinista desde el manifest;
  manifest ausente → conjunto vacío válido; corrupto → `invalid-asset-store`.
- [X] T020 [US2] Crear `src/application/assets/inspect-asset.ts`: inspección por logicalPath; ausente →
  `not-found`; incluye dimensiones/provenance/license/ownership.
- [X] T021 [US11] Crear `src/application/assets/ownership.ts`: autoridad = manifest; unknown content
  preservado/bloqueante; manifest no confiable → conflicto.
- [X] T022 [US12] Crear `src/application/assets/json/map-assets.ts` + `AssetJsonEnvelopeV1` DTO/mapper
  (paths lógicos; null policy; independiente de `003`).
- [X] T023 [US16] Crear `src/infrastructure/reporter/assets-terminal-reporter.ts` y
  `assets-json-reporter.ts` + serializer determinista (2 espacios, LF final, sin BOM).
- [X] T024 [P] [US1] Crear `tests/application/assets/list-inspect.test.ts`: listado/orden, vacío,
  corrupto, inspección, `not-found`, summary.
- [X] T025 [P] [US12] Crear `tests/integration/assets/json-envelope.test.ts`: parseable, formatVersion,
  paths lógicos, sin rutas absolutas; bytes de `003`/`004`/`006` intactos.
- [X] T026 Gate C: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: JSON de `003`/`004`/`006` byte-estable; sin segundo análisis de tokens.
**Suggested commit**: `feat: add headless asset read use cases and json envelope`
**Exclusions**: sin import plan, sin writes.
**First task next checkpoint**: T027.

## Checkpoint D — Import plan (read-only)

**Objective**: `planAssetImport` puro y read-only: resuelve kind/destino/MIME/size/hash/dimensiones,
dedup por hash, requisito de licencia, validación, sanitización (preview) y límites; plan determinista.
**Preconditions**: Checkpoints A–C completos y gates verdes.

### Tasks

- [X] T027 [US3] Crear `src/application/assets/plan-asset-import.ts`: construye `ImportPlan`/
  `ImportCandidate` desde fuentes locales; NO escribe nada.
- [X] T028 [US7] Añadir deduplicación por content hash: hash existente → `duplicate` + `duplicateOf`.
- [X] T029 [US3] Añadir clasificación de bloqueo: MIME no soportado, fuente inválida, SVG no saneable,
  path inseguro, tamaño/limite excedido → `blocked` con `issues` estables.
- [X] T030 [US9] Añadir requisito de licencia: sin metadata → `license-required` (nunca `declared`
  asumida); con metadata explícita → `declared`.
- [X] T031 [US5] Integrar el preview de sanitización SVG en el candidato; los bytes a escribir serían los
  saneados.
- [X] T032 [P] [US3] Crear `tests/integration/assets/import-plan.test.ts`: add/duplicate/blocked,
  dimensiones, dedup, licencia requerida, límites, determinismo y NO escritura.
- [X] T033 Gate D: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: store/manifest byte-idénticos antes/después de `plan`.
**Suggested commit**: `feat: add asset import plan with dedup, validation and sanitization preview`
**Exclusions**: sin writes (apply/remove llegan en E).
**First task next checkpoint**: T034.

## Checkpoint E — Transactional apply/remove, idempotency and recovery

**Objective**: Writer transaccional de conjunto (`AssetSetWriterV1`) y los casos de uso
`applyAssetImport`/`removeAsset`, con idempotencia, recheck de concurrencia por bytes, ownership y estados
de recuperación; sin rollback automático tras el commit point.
**Preconditions**: Checkpoints A–D completos y gates verdes.

### Tasks

- [X] T034 [US4] Crear `src/infrastructure/assets/asset-set-writer.ts`: staging→verify→backup→swap→
  post-verify; seam de filesystem inyectable; nunca sigue symlinks.
- [X] T035 [US4] Crear `src/application/assets/apply-asset-import.ts`: escribe solo candidatos `add` +
  manifest nuevo como conjunto; SVG saneado; licencia exacta suministrada.
- [X] T036 [US6] Crear `src/application/assets/remove-asset.ts`: elimina archivo + entrada del manifest
  como conjunto; rechaza paths no poseídos por el manifest.
- [X] T037 [US9] Crear `src/application/assets/idempotency.ts`: decide `unchanged` antes de stagear
  (manifest + hashes + bytes + paths + ownership + presencia).
- [X] T038 [US13] Añadir recheck de concurrencia por bytes/hash (no mtime) y semántica de
  `verification-error` (post-commit, backup retenido, recovery requerido).
- [X] T039 [P] [US4] Crear `tests/integration/assets/writer-apply-remove.test.ts`: apply/remove conjunto,
  staging/backup/swap, contenido desconocido preservado, unsafe-target.
- [X] T040 [P] [US4] Crear `tests/integration/assets/writer-recovery.test.ts` (seams): fallo antes de
  mover, restore exitoso/fallido, verificación post-commit, sin rollback automático.
- [X] T041 [P] [US9] Crear `tests/integration/assets/idempotency.test.ts`: segunda aplicación sin cambios
  → `unchanged`/`wrote:false`, sin staging/rename/escritura.
- [X] T042 [P] [US11] Crear `tests/integration/assets/ownership-concurrency.test.ts`: manifest no
  confiable, colisión con unknown, source modificado → conflicto.
- [X] T043 Gate E: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: tokens/host/build intactos; `001`–`006` byte-estables.
**Suggested commit**: `feat: add transactional asset apply/remove with recovery and idempotency`
**Exclusions**: sin CLI todavía.
**First task next checkpoint**: T044.

## Checkpoint F — CLI surface, packaging, regression and close

**Objective**: Superficie CLI fina y opcional `asset` (adapter), empaquetado de recursos, regresión
granular `001`–`006`, documentación y cierre con auditoría. MCP/Studio quedan como reuso futuro.
**Preconditions**: Checkpoints A–E completos y gates verdes.

### Tasks

- [X] T044 [US14] Crear `src/cli/commands/asset.ts` y conectar en `program.ts`/`composition.ts`:
  `asset list|inspect|import plan|import apply|remove`, `--json` en read/plan, reporter humano vs JSON,
  `internal-error`→70 en el adapter. Sin flags fuera de alcance.
- [X] T045 [US14] Añadir mapeo de exit codes de assets reutilizando la tabla común (`exitCodeFor…`), sin
  cambiar los códigos de `001`–`006`.
- [X] T046 [P] [US14] Crear `tests/cli/asset-commands.test.ts` y `asset-help.test.ts`: superficie de
  comandos, selección de reporter, ayuda sin flags fuera de alcance; `plan` no escribe.
- [X] T047 [P] [US15] Crear `tests/cli/asset-binary.test.ts` (proceso hijo): cwd distinto, paths con
  espacios/Unicode, stdin cerrado, sin TTY; apply/`unchanged`, remove; streams y exit codes.
- [X] T048 [P] [US8] Crear `tests/integration/assets/regression-tokens-build.test.ts`: ninguna operación
  de assets modifica tokens/host/build; `validate/inspect/foundations/build/export` byte-estables.
- [X] T049 [US16] Actualizar `README.md` y `docs/product/capability-map.md`: comandos `asset`, layout del
  store, separación tokens/assets, licencias, sanitización; marcar la capacidad como implementada.
- [X] T050 [US14] Actualizar `specs/007-asset-manager/quickstart.md` con el flujo reproducible real y los
  outcomes/exits definitivos.
- [X] T051 Gate F (suite completa): `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  `npm pack --dry-run --json`, `git diff --check`.
- [X] T052 [US14] Crear `specs/007-asset-manager/audit.md` con trazabilidad (14/14 US, 37/37 FR, 12/12 SC,
  17/17 Constitution), hallazgos (0 CRITICAL/HIGH/MEDIUM) y gates finales; cerrar la feature.

**Regression**: T048 prueba que `001`–`006` no cambian comportamiento, bytes, JSON ni exits.
**Suggested commit**: `feat: add asset manager cli, packaging and regression`
**Exclusions**: no iniciar `008`; no implementar MCP ni Studio; sin Figma/scraping/IA/optimización.
**First task next checkpoint**: ninguno; F cierra `007`.

## Dependencies

```text
A → B → C → D → E → F
```

Reglas duras (no violar):
- `import plan` (D) NO depende del writer (E); es read-only.
- El writer (E) no precede al store reader/ownership (B/C).
- La CLI (F) no precede a los casos de uso (C–E).
- `verification-error` (E) no precede al commit-point (E).
- Ninguna tarea lee/escribe tokens/host/build.

## Parallel Opportunities

- En B: sanitizer, probes y font-validator son ramas independientes (`[P]`).
- Las pruebas marcadas `[P]` editan archivos de test separados.
- Las regresiones (F, T048) son independientes de la CLI.

## Traceability — User Stories → Tasks (14/14)

| US | Tasks | US | Tasks |
|---|---|---|---|
| US1 list | T001, T005, T019, T024 | US8 font validation | T012, T048 |
| US2 inspect | T002, T020 | US9 license/idempotency | T030, T037, T041 |
| US3 import plan | T027, T029, T032 | US10 provenance | T002, T027 |
| US4 apply | T034, T035, T039 | US11 ownership | T014, T021, T042 |
| US5 svg sanitize | T013, T015, T031 | US12 JSON | T004, T022, T025 |
| US6 remove | T036 | US13 dimensions/concurrency | T011, T038 |
| US7 dedup | T028 | US14 headless/CLI/MCP/Studio | T006, T018, T044, T046 |
| | | US15 cwd-independent | T047 |
| | | US16 human report | T023, T049 |

## Traceability — Functional Requirements → Checkpoints

| FR | Checkpoint | FR | Checkpoint |
|---|---|---|---|
| FR-001..005 | A, C | FR-020 | B (svg sanitizer) |
| FR-006..008 | D, E | FR-021..022 | E |
| FR-009..013 | B | FR-023..025 | C, A |
| FR-014..017 | A, C, E | FR-026..028 | A, B, E |
| FR-018..019 | D, B | FR-029..037 | A, C, D, E, F |
