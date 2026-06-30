# Audit — 007-asset-manager

Feature: Asset Manager local y manual (fonts, logos, SVG, icons, images) bajo `design-system/assets/`,
estrictamente separado de los tokens DTCG.
Cierre auditado sobre el Checkpoint F (T044–T052), creado en el commit
`feat: add asset manager cli, packaging and regression`.

## Estado

- User stories: 14/14 cubiertas.
- Functional requirements: 37/37 cubiertos.
- Success criteria: 12/12 cubiertos.
- Constitución: 17/17 principios PASS/N/A, 0 FAIL.
- Checkpoints A–F: T001–T052 completos al cierre.
- Resultado `/speckit-analyze` equivalente: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 contradicciones,
  0 requisitos sin cobertura, 0 marcadores `[NEEDS CLARIFICATION]`, 0 violaciones de constitución.
- Tests: suite completa en verde, incluyendo el binario `asset` real, el tarball instalado y la
  regresión `001`–`006`.

## Matriz US → tareas → evidencia

| US | Descripción | Tareas | Evidencia productiva | Evidencia de test |
|---|---|---|---|---|
| US1 | listar assets | T001, T005, T019, T024 | `domain/assets/*`, `application/assets/list-assets.ts` | `asset-models.test.ts`, `list-inspect.test.ts` |
| US2 | inspeccionar un asset | T002, T020 | `inspect-asset.ts`, `asset-record.ts` | `list-inspect.test.ts` |
| US3 | import plan (read-only) | T027, T029, T032 | `plan-asset-import.ts` | `import-plan.test.ts` |
| US4 | apply transaccional | T034, T035, T039 | `asset-set-writer.ts`, `apply-asset-import.ts` | `writer-apply-remove.test.ts` |
| US5 | sanitización de SVG | T013, T015, T031 | `svg-sanitizer.ts` | `svg-sanitizer.test.ts`, `import-plan.test.ts` |
| US6 | remove seguro | T036 | `remove-asset.ts` | `writer-apply-remove.test.ts` |
| US7 | deduplicación por hash | T028 | `plan-asset-import.ts` (dedup) | `import-plan.test.ts` |
| US8 | validación de fuentes | T012, T048 | `font-validator.ts` | `probes.test.ts`, `regression-007-assets.test.ts` |
| US9 | licencia nunca asumida + idempotencia | T030, T037, T041 | `asset-record.ts` (`declaredLicense`), `idempotency.ts` | `import-plan.test.ts`, `idempotency.test.ts` |
| US10 | provenance | T002, T027 | `apply-asset-import.ts` (local-import) | `writer-apply-remove.test.ts` |
| US11 | ownership / unknown preservado | T014, T021, T042 | `asset-store-reader.ts`, `ownership.ts` | `ownership-concurrency.test.ts` |
| US12 | salida JSON machine-readable | T004, T022, T025 | `json/map-assets.ts`, `assets-json-*` | `json-envelope.test.ts` |
| US13 | dimensiones / concurrencia | T011, T038 | `dimension-reader.ts`, writer concurrency recheck | `probes.test.ts`, `ownership-concurrency.test.ts` |
| US14 | headless / CLI / MCP / Studio | T006, T018, T044, T046 | `domain/assets/index.ts`, `asset-ports.ts`, `cli/commands/asset.ts` | `asset-commands.test.ts`, `asset-help.test.ts` |
| US15 | independiente del cwd | T047 | bin + host resuelto | `asset-binary.test.ts` (espacios/Unicode), tarball instalado |
| US16 | reporte humano | T023, T049 | `assets-terminal-reporter.ts`, README | `asset-commands.test.ts` |

## Cobertura FR (37/37)

- FR-001..005 (kinds, separación, manifest, list/inspect): A (modelos), C (use cases de lectura).
- FR-006..008 (plan/apply): D (`plan-asset-import.ts`), E (`apply-asset-import.ts`).
- FR-009..013 (hash, dedup, MIME por firma, tamaño, dimensiones): B (probes), D (dedup/limits).
- FR-014..017 (metadata, provenance, ownership, unknown preservado): A, C, E.
- FR-018..019 (licencia nunca asumida, validación de fuentes): D, B.
- FR-020 (sanitización SVG): B (`svg-sanitizer.ts`), D (preview).
- FR-021..022 (remove, transaccional): E.
- FR-023..025 (headless, contratos, JSON envelope): A, C.
- FR-026..028 (paths lógicos, no symlinks, contención): A, B, E.
- FR-029..037 (outcomes/exits, límites, idempotencia, determinismo, separación, verificación, conflictos,
  alcance excluido): A, D, E, F.

## Auditoría constitucional (17/17)

- I–III (un DS por proyecto, archivos locales, DTCG): assets son una superficie separada; nunca leen ni
  escriben tokens/host/build (FR-002/033; `regression-007-assets.test.ts`).
- IV (pipeline): N/A — assets no son generación de tokens.
- V (independencia de framework): núcleo headless; CLI/MCP/Studio son adapters (FR-023).
- VI–IX (herramienta, edición sin ocultar fuente, validación antes de escribir, contratos antes que
  implementación): `plan` valida/sanitiza antes de `apply`; contratos `1.0.0`.
- X–XIII (UI N/A, local-first): operación 100% local, sin red.
- XIV (seguridad): writer transaccional, backup, recuperación explícita, sin seguir symlinks,
  sanitización SVG, ownership.
- XV (agentes): `AssetJsonEnvelopeV1` estable; MCP/Studio reúsan los mismos casos de uso.
- XVI–XVII (incremental/portable): exit codes compartidos; assets como archivos planos + manifest,
  portables sin el Studio.

Sin violaciones; principios de UI/contenido (X, XI) N/A para esta feature de CLI headless.

## Hallazgos

- CRITICAL: 0
- HIGH: 0
- MEDIUM: 0
- LOW: 0

## Packaging e instalación (verificados)

- `npm pack --dry-run --json`: incluye `dist/cli/commands/asset.js`,
  `dist/infrastructure/assets/asset-set-writer.js`, `dist/domain/assets/index.js`; excluye `src/`,
  `tests/`, `specs/`, `.agents/`.
- `npm pack` + `npm install <tgz>` real (sin `npm link`, sin symlink al repo): el binario instalado
  ejecuta `asset import apply`/`asset list --json` desde un cwd ajeno con espacios y Unicode; el paquete
  instalado no referencia la raíz del repositorio.

## Gates finales registrados

```text
npm run typecheck         → OK
npm run lint              → arch-guard: OK
npm test                  → suite completa en verde (incluye binario, tarball y regresión 001–006)
npm run build             → OK
npm pack --dry-run --json → incluye dist asset; excluye src/tests/specs/.agents
git diff --check          → limpio
```

Decisión: **007-asset-manager CERRADA**. No se inicia `008`; no se implementan MCP ni Studio; sin
Figma/scraping/IA/optimización/conversión/edición de SVG.
