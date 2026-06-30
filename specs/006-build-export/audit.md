# Audit — 006-build-export

Feature: `build` (publica todos los formatos como un conjunto a `design-system/build/`) y
`export <format>` (read-only, un formato a stdout).
Último commit válido previo al cierre (checkpoint K): `44f01c0`. Cierre auditado sobre el checkpoint L
(T140–T158), creado en el commit `feat: add build and export cli with packaging and regression`.

## Estado

- User stories: 20/20 cubiertas.
- Functional requirements: 68/68 cubiertos.
- Success criteria: 14/14 cubiertos.
- Constitución: 17/17 principios PASS/N/A, 0 FAIL.
- Checkpoints A–L: T001–T158 completos al cierre.
- Resultado `/speckit-analyze` equivalente: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 contradicciones,
  0 requisitos sin cobertura, 0 marcadores `[NEEDS CLARIFICATION]`, 0 violaciones de constitución.
- Tests: 1576/1576 (291 archivos) en verde, incluyendo binario real, tarball instalado y regresión 001–005.

## Matriz US → tareas → evidencia

| US | Descripción | Tareas | Evidencia productiva | Evidencia de test |
|---|---|---|---|---|
| US1 | build de todos los artifacts | T091, T140, T145 | `build-design-system.ts`, `cli/commands/build.ts`, `program.ts` | `build-binary.test.ts`, `build-export-commands.test.ts` |
| US2 | export CSS a stdout | T092, T141, T146 | `export-design-system-artifact.ts`, `cli/commands/export.ts`, `io.processExportOutput` | `export-binary.test.ts` |
| US3 | export JSON a stdout | T092, T141, T146 | renderer JSON + export reporter | `export-binary.test.ts` |
| US4 | export TypeScript a stdout | T092, T141, T146 | renderer TS + export reporter | `export-binary.test.ts` |
| US5 | CSS preserva aliases | T035, T052 | `css-renderer.ts` (`var(--…)`) | `css-aliases.test.ts`, `export-binary.test.ts` |
| US6 | JSON/TS resuelven aliases + metadata | T055, T061 | `json-renderer.ts`, `ts-renderer.ts` | renderer tests |
| US7 | detectar tipo no soportado por CSS | T034, T096 | proyección + renderer CSS | `build-error-matrix.test.ts` |
| US8 | bloquear builds parciales | T053, T091, T132 | fail-fast en `build-design-system.ts`, `verification.verifyInput` | `build-error-matrix.test.ts` |
| US9 | build idempotente | T136, T137 | `idempotency.decideUnchanged` cableado pre-staging | `idempotency.test.ts`, `build-binary.test.ts` |
| US10 | proteger archivos desconocidos | T083, T120 | `classify-unknown-nodes.ts`, `artifact-set-writer.ts` (copia byte a byte) | `unknown-nodes-*.test.ts`, `writer-posix.test.ts` |
| US11 | detectar colisiones de nombres CSS | T028, T029 | `css-name.ts` | css name tests |
| US12 | detectar concurrencia | T115, T116 | `concurrency.ts` | `concurrency*.test.ts` |
| US13 | recuperación ante verification-error | T126, T129, T135 | writer transaccional + `verificationErrorSemanticsHold` | `writer-recovery.test.ts`, `build-error-matrix.test.ts` |
| US14 | ejecutar desde paquete instalado | T145, T149 | bin `dist/cli/index.js`, `files: [dist, presets]` | `tarball-smoke.test.ts`, `npm-pack.test.ts` |
| US15 | independiente del cwd | T145, T149 | host resuelto vía `resolveHostRoot` | `build-binary.test.ts` (espacios/Unicode), `tarball-smoke.test.ts` |
| US16 | reporte legible | T101, T155 | `BuildTerminalReporter`, README | `build-binary.test.ts`, streams tests |
| US17 | salida machine-readable | T098, T106, T133 | `BuildJsonReporter`, `BuildJsonEnvelopeV1` | `build-error-matrix.test.ts`, `verification-levels.test.ts` |
| US18 | consumo headless | T090, T091, T092 | casos de uso sin Commander/FS | `build-export-commands.test.ts` |
| US19 | preservar compatibilidad 001–005 | T150–T154 | analyzer/serializers/exits intactos | `regression-00{1..5}-*.test.ts` |
| US20 | salidas deterministas | T036, T058, T066, T137 | orden canónico, sin timestamps | `export-binary.test.ts` (estabilidad), determinism tests |

## Cobertura FR (68/68)

- FR-001..010 (lectura única, render por formato, resolución): casos de uso `build`/`export`, snapshot
  reader de una sola lectura/parse/análisis; T010, T012, T016, T091, T092.
- FR-011..034 (CSS/JSON/TS, orden, colisiones, manifest, hashes): renderers + manifest builder; T026–T067.
- FR-035..052 (snapshot de output, ownership, nodos desconocidos, writer transaccional): T069–T126.
- FR-053..056 (concurrencia, post-verificación, recuperación): T115, T134, T125, T126, T129.
- FR-036..046, FR-041..046 (CLI build/export, reporters, exits, streams): T140–T147.
- FR-047..051 (determinismo, idempotencia, verificación de candidato): T136, T137, T133.
- Empaquetado e instalación (FR de distribución): T148, T149.

## Auditoría constitucional (17/17)

- I–III (un DS por proyecto, archivos locales, DTCG): `build`/`export` derivan de la única fuente
  `design-system/tokens/base.tokens.json`; no crean segunda fuente.
- IV–V (pipeline determinista, independencia de framework): artifacts deterministas; TS sin imports en
  runtime; CSS estándar.
- VI–IX (herramienta no-DS, edición sin ocultar fuente, validación antes de generar, contratos antes
  que implementación): `verifyInput` bloquea render inválido; contratos `BuildJsonEnvelopeV1`,
  `build-manifest`, streams.
- X–XIII (accesibilidad N/A, páginas N/A, contenido N/A, local-first): build/export 100% local, sin red.
- XIV (seguridad en modificaciones): writer transaccional, backup, recuperación explícita, sin seguir
  symlinks, contención de paths.
- XV (agentes controlados): `--json` estable, sin MCP en Core.
- XVI–XVII (incremental/verificable, portabilidad): exit codes estables, sin lock-in; artifacts
  reproducibles desde la fuente.

Sin violaciones; principios de UI/contenido (X, XI, XII) N/A para esta feature de CLI headless.

## Hallazgos

- CRITICAL: 0
- HIGH: 0
- MEDIUM: 0
- LOW: 0

## Gates finales registrados

```text
npm run typecheck        → OK
npm run lint             → arch-guard: OK
npm test                 → 1576/1576 (291 archivos)
npm run build            → OK
npm pack --dry-run --json→ 426 archivos; incluye dist/, bin, presets/; excluye src/tests/specs/.agents
git diff --check         → limpio
```

Decisión: **006-build-export CERRADA**. No se inicia `007`; no se publica en npm.
