# Auditoría de cierre — 002-ds-validate-inspect (T048–T050)

Cierre formal de la feature. Solo lectura/verificación; sin nuevas capacidades. Estado de la suite al
cierre: **589/589** (95 archivos de prueba). Históricas de `001`: **274**; nuevas de `002`: **315**.

## T048 — Regresión formal de `001-ds-init`

Prueba: [`tests/integration/regression-001.test.ts`](../../tests/integration/regression-001.test.ts)
(+ suite histórica completa de `001`, intacta).

### Matriz de no regresión

| Área de `001` | Invariante | Evidencia |
|---|---|---|
| Archivos generados | Exactamente tres | `samplePrepared()` = config/manifest/tokens |
| Config | Forma/contenido canónicos | `buildConfig()` ≡ `{configSchemaVersion,designSystemDir,formatVersion}` |
| Manifest | Forma/contenido canónicos | builders/manifest tests de 001 verdes |
| Tokens | Schema estricto + valor inicial | `validateDtcg(buildTokens())` = [] |
| Color | Objeto DTCG sRGB | `$value` = `{colorSpace:"srgb",components:[…],alpha,hex:"#3b82f6"}` |
| Alias | `{color.base.blue-500}` | aserción exacta en regression-001 |
| Idempotencia | 2.ª ejecución `unchanged` | init→validate→inspect→init = `unchanged`/2 |
| Exit 0/1/2/3/4/5/6/7/70 | `exitCodeForResult` sin cambios | `exit-codes-common.test` + exit-matrix de 001 |
| Rollback | Sin estructura parcial | transaction-failures de 001 verdes |
| Symlinks | Política previa | path-guard de 001 reutilizado sin cambios |
| Monorepo | Workspace más cercano | `resolveHostRoot` reusado; portabilidad e2e |
| Sin Git | Soportado | states-e2e + 001 |
| package.json | No se modifica | sin diff en package.json |

### init → validate → inspect (cruzado)

`init` → `created`/0 · `validate` → `valid`/0 · `inspect` → `valid`/0 (identidad "Acme Design System",
3 documentos, 2 tokens, 1 alias, `byType={color:2}`, 0 errores) · `init` de nuevo → `unchanged`/2.
`validate`/`inspect` dejan los tres documentos **byte-idénticos**.

### Separación de schemas (verificada)

- `dtcg.schema` (generación de `001`, color-only) **NO** se relajó: rechaza `$type: dimension`.
- El read-validator de `002` acepta los 13 tipos: `dimension` → válido con warning
  `dtcg-type-not-deeply-inspected`.
- El documento de `init` pasa **ambos** contratos. `buildTokens`/serialización sin cambios.

### Puertos compartidos (aditivos)

`FileSystem.byteSize` implementado en `nodeFileSystem`, `InMemoryFileSystem` y `faultyFs`; `Issue` de
`001` intacto; `AnalysisIssue extends Issue` (especializado); `TerminalReporter` de `001` sin cambios.

## T049 — Guard, documentación, empaquetado

- **arch-guard**: `npm run lint` PASS. Dominio sin Node/fs/zod/ajv/app/CLI; aplicación sin
  infra/Commander/Clack/console/exit; infraestructura sin Commander/process.exit; CLI compone/presenta.
- **Cota 200**: `MAX_INSPECT_TERMINAL_TOKEN_ROWS` solo en `inspect-terminal-reporter.ts` (presentación).
- **Documentación**: README actualizado (init/validate/inspect, tabla común de exit codes, arquitectura
  headless, límites); `quickstart.md` con la secuencia install→init→validate→inspect y estados.
- **Tarball** (`npm pack`): `dist/` (168), `package.json`, `README.md` — **sin** src/tests/specs/
  .specify/fixtures/coverage/node_modules. Smoke del paquete instalado: bin presente; `--help` lista
  init/validate/inspect; `--version`→0; helps de subcomandos→0; `validate` en vacío→5.

## T050 — Trazabilidad, auditorías y cierre

### Trazabilidad US → FR → SC → ADR/contrato → prueba

| US | FR | SC | ADR/contrato | Prueba representativa |
|---|---|---|---|---|
| US1 validar-correcto | FR-001,010-016 | SC-001,003 | analysis-pipeline | states-e2e, regression-001 |
| US2 todos-los-errores | FR-007,008,013,015 | SC-004 | validation-report | states-e2e, limits-e2e |
| US3 inspeccionar | FR-020-024 | SC-007 | design-system-inspection, ADR-0007 | type-policy-e2e, inspect-reporter |
| US4 subcarpeta/workspace | FR-001,030 | SC-005 | exit-codes-common | states-e2e (portabilidad) |
| US5 headless | FR-005,035 | SC-006 | analysis-pipeline | headless, use-case tests |
| US6 pureza-observacional | FR-002,003,004 | SC-002 | managed-document-reader | reader-purity, states-e2e, binary purity |
| US7 estructura-parcial | FR-011,016,023 | — | data-model | states-e2e, outcome-matrix |
| ($type) | FR-017,018,019 | SC-009 | ADR-0008/0010 | type-policy-e2e, effective-type |
| (CLI/exit) | FR-030-034 | SC-008,010 | ADR-0006 | validate-inspect-binary, exit-codes-common |
| (--json futuro) | FR-035 | — | — | datos estructurados (no `--json`) |

**Cobertura**: 7/7 historias · 29/29 FR · 10/10 SC · 50/50 tareas.

### Auditoría funcional

- **validate**: válido OK; acumula errores; warnings no invalidan; parcial; not-found; read-error;
  exit 0/3/4/5/6; no modifica archivos. ✓
- **inspect**: identidad/archivos/estadísticas/rutas/aliases/tipos/confianza; recuperación parcial;
  cota textual 200 con modelo headless completo; exit 0/3/4/5/6; no modifica archivos. ✓

### Auditoría técnica

1 resolución de host · 1 presencia · ≤1 lectura/documento · 1 parseo/documento · 1 recorrido · índice
`tokenPath→token` · resolución de alias memoizada O(n+aliases) · tope global de issues · determinismo ·
pureza observacional · portabilidad · sin TTY · CLI opcional · `001` intacto. ✓ (spies en
analyze-pipeline; once-call en use-case tests).

### Auditoría constitucional (17/17)

| # | Principio | Resultado |
|---|---|---|
| I | Un DS por proyecto | PASS — opera sobre el único DS resuelto |
| II | Archivos fuente de verdad | PASS — solo lectura |
| III | DTCG canónico | PASS — DTCG 2025.10 |
| IV | Style Dictionary diferido | PASS (N/A) |
| V | Independencia de framework | PASS |
| VI | Gestor ≠ DS | PASS |
| VII | Edición transparente | PASS (N/A) |
| VIII | Validación antes de generación | PASS — la feature ES validación/inspección |
| IX | Contratos antes que implementación | PASS — contratos/ADR previos |
| X | Accesibilidad estructural | PASS (N/A) |
| XI | Páginas como validación | PASS (N/A) |
| XII | Contenido opcional | PASS (N/A) |
| XIII | Local-first | PASS — offline, sin red |
| XIV | Seguridad | PASS — solo lectura, path-guard, sin ejecutar contenido, límites |
| XV | Integraciones desacopladas | PASS — casos de uso headless |
| XVI | Incrementalidad | PASS — solo validate/inspect |
| XVII | Portabilidad / no lock-in | PASS — modelos no obligatorios; DS legible sin el gestor |

Sin `FAIL`.

### Auditoría de consistencia final (`/speckit-analyze`, solo lectura)

Revisados spec, plan, research, data-model, contratos, ADR-0006–0010, tasks, implementación y pruebas:
**0 CRITICAL · 0 HIGH · 0 MEDIUM abiertos · 0 contradicciones · 0 requisitos sin cobertura · 0
decisiones sin respaldo · 0 violaciones constitucionales**. Los hallazgos C1–C6 previos quedaron
resueltos y verificados por pruebas.

### Correcciones productivas durante el cierre

Ninguna en T048–T050 (solo pruebas de regresión + documentación + auditoría). La única corrección de la
Fase 9 fue previa (T039–T047): `alias-too-long` registra hit `alias-len` (fidelidad a ADR-0009),
cubierta por `limits-e2e`.

### Deuda técnica restante

- `FileInspection.sizeBytes` no se propaga (el pipeline no almacena el tamaño leído); el reporter usa
  `readable = kind === "file"`. No afecta contratos.

## Estado final

- **001-ds-init**: permanece **CERRADA**, sin regresiones (274/274).
- **002-ds-validate-inspect**: **CERRADA** — 50/50 tareas, 589/589 pruebas, build/pack/smoke OK,
  auditoría limpia, constitución 17/17.
