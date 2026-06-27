# Audit — 003-json-output

Feature: Machine-readable JSON output for `validate` / `inspect`.
Base declarado en tasks: `75c7689`. Cierre auditado sobre el checkpoint F.

## Estado

- User stories: 8/8 cubiertas.
- Functional requirements: 35/35 cubiertos.
- Success criteria: 10/10 cubiertos.
- Checkpoints A-F: T001-T040 completos al cierre.
- Checkpoint siguiente: no iniciado.
- Resultado `/speckit-analyze` equivalente: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 contradicciones,
  0 requisitos sin cobertura, 0 marcadores `[NEEDS CLARIFICATION]`, 0 violaciones de constitución.

## Matriz US / FR / SC / ADR / contrato / tarea / evidencia

| US | FR | SC | ADR / contrato | Tareas | Evidencia productiva | Evidencia de test |
|---|---|---|---|---|---|---|
| US1 Validate JSON válido | FR-001, FR-003..008, FR-017..025, FR-030..032 | SC-001, SC-002, SC-003, SC-008, SC-009 | ADR-0011, ADR-0012, ADR-0013; `json-envelope-v1`, `json-validate-result-v1`, `json-output-streams` | T001-T010, T014-T016, T019-T022, T025, T030, T036-T040 | `src/application/json/*`, `ValidateJsonReporter`, `src/cli/program.ts` | `tests/unit/json/*`, `tests/unit/cli/validate-json-reporter.test.ts`, `tests/cli/validate-json-binary.test.ts`, `tests/integration/json-output/validate-json.test.ts` |
| US2 Validate JSON estados no exitosos | FR-007..009, FR-014..025, FR-031..032, FR-035 | SC-001, SC-002, SC-003, SC-008, SC-009 | ADR-0011, ADR-0013; `json-issue-v1`, `json-validate-result-v1`, `json-output-streams` | T005-T010, T014-T016, T023-T025, T028, T030 | mappers de validate/issues/common, serializer, política Commander existente | `validate-json.test.ts`, `edge-cases.test.ts`, `validate-json-binary.test.ts`, `json-internal-error.test.ts` |
| US3 Inspect JSON completo | FR-002..006, FR-010..013, FR-017..025, FR-030..032 | SC-001..004, SC-008, SC-009 | ADR-0011, ADR-0012; `json-inspect-result-v1`, `json-inspected-value-v1` | T001-T008, T011-T012, T014, T017-T022, T026-T027, T031, T036-T040 | `toInspectEnvelope`, `InspectJsonReporter`, selección CLI local `--json` | `map-inspect.test.ts`, `inspect-json.test.ts`, `inspect-json-paths.test.ts`, `inspect-json-binary.test.ts` |
| US4 Inspect JSON recuperable | FR-010..014, FR-017..018, FR-025, FR-031..032 | SC-001, SC-003, SC-008, SC-009 | ADR-0011; `json-inspect-result-v1`, `json-issue-v1` | T005-T012, T017-T018, T026, T028, T031 | DTOs con `trust`, `null` policy y validación embebida | `inspect-json.test.ts`, `edge-cases.test.ts`, `map-inspected-value.test.ts` |
| US5 stdout limpio | FR-019..024, FR-030..032 | SC-002, SC-005, SC-006, SC-008, SC-009 | ADR-0012, ADR-0013; `json-output-streams`, `json-envelope-v1` | T014-T018, T023-T024, T030-T033, T039-T040 | `serializeJsonV1`, reporters que escriben una vez en `completed` | `json-serializer.test.ts`, reporter tests, binary tests, `single-analysis.test.ts`, `determinism.test.ts`, packaging smoke |
| US6 Compatibilidad humana | FR-025, FR-028..031, FR-035 | SC-003, SC-007, SC-010 | ADR-0006, ADR-0012, ADR-0013; `json-output-streams` | T019-T022, T025-T035, T037-T040 | reporters textuales intactos, `init` sin `--json`, ayuda local por subcomando | suite 001/002, `human-vs-json.test.ts`, `regression-001.test.ts`, `regression-flow.test.ts`, `validate-inspect-binary.test.ts` |
| US7 DTO/mappers headless | FR-004..018, FR-022..024, FR-026..027, FR-032 | SC-005, SC-006, SC-009 | ADR-0011; contratos DTO v1 | T001-T014, T032-T033 | `src/application/json/*` sin Node/CLI/infra; serializer separado en infraestructura | `dto-invariants.test.ts`, `exports.test.ts`, mapper tests, arch guard via lint |
| US8 Error interno seguro | FR-021, FR-033..035 | SC-002, SC-003, SC-008, SC-009 | ADR-0013; `json-internal-error-v1`, `json-output-streams` | T013, T023-T024, T031, T036-T040 | `internalErrorEnvelope`, handler JSON en `program.ts`, `INTERNAL_ERROR_EXIT` 70 | `map-internal-error.test.ts`, `json-internal-error.test.ts`, binary Commander policy |

## Matriz FR

| Rango | Cobertura |
|---|---|
| FR-001..003 | Flags locales `--json` en `validate`/`inspect`, selección de un solo adapter, sin `init --json`: T019-T022, T031, T034, T037. |
| FR-004..006 | Envelope v1 con cuatro campos base, `formatVersion` independiente: T001-T004, T009-T013, T036. |
| FR-007..009 | DTO `validate`, host, `not-found` con `result:null` y `error:null` v1: T005-T010, T015-T016, T025, T030, T036. |
| FR-010..013 | DTO `inspect`, `InspectedValue`, todos los paths sin cota, `not-found`: T005-T008, T011-T012, T017-T018, T026-T027, T031, T036. |
| FR-014..018 | Issue DTO estable, sin `context`, null policy, sin `undefined`: T002, T004-T008, T010, T012, T025-T028. |
| FR-019..025 | stdout/stderr, newline, 2 espacios, determinismo, orden y exits intactos: T014-T018, T022-T024, T029-T033, T039. |
| FR-026..027 | DTO/mappers explícitos y puros, sin serializar dominio: T001-T014, T032-T033. |
| FR-028..031 | Compatibilidad humana, única prueba 002 actualizada, sin doble análisis, sin escrituras: T022, T025-T035, T037-T040. |
| FR-032 | Sin stacks, objetos crudos ni contenidos: T006, T013, T024, T028, T030-T031, T036. |
| FR-033..035 | Internal-error seguro y política Commander existente: T013, T023-T024, T031, T036. |

## Matriz SC

| SC | Estado | Evidencia |
|---|---|---|
| SC-001 | PASS | Matrices de outcomes en `validate-json`, `inspect-json`, binary tests. |
| SC-002 | PASS | Serializer/reporter/binary tests: exactamente un JSON en stdout; internal-error en stderr. |
| SC-003 | PASS | `exitCodeForOutcome` compartido; `human-vs-json`; binary matrices. |
| SC-004 | PASS | `inspect-json-paths`, `map-inspect`, `inspect-json-binary`, `regression-flow`: 250 paths sin cota. |
| SC-005 | PASS | `determinism.test.ts` y JSON stringify estable. |
| SC-006 | PASS | `single-analysis.test.ts`; reporters/mappers no analizan. |
| SC-007 | PASS | Suite 001/002 verde; solo cambia la prueba histórica de rechazo de `--json`. |
| SC-008 | PASS | Child processes con stdin cerrado, redirección parseable, smoke instalado. |
| SC-009 | PASS | Issue mapper descarta `context`; internal-error usa mensaje fijo; tests de edge/internal. |
| SC-010 | PASS | `typecheck`, `lint`, `npm test`, `build`, `pack --dry-run`, pack real y smoke instalado verdes. |

## Constitución

| Principio | Estado | Evidencia |
|---|---|---|
| I. Un Design System por proyecto | PASS | `--json` opera sobre el mismo host root y un DS local; no introduce multi-tenant. |
| II. Archivos locales como fuente de verdad | PASS | Read-only; no base de datos ni fuente secundaria. |
| III. DTCG como formato canónico | PASS | JSON expone la inspección/validación DTCG existente sin cambiar formato fuente. |
| IV. Style Dictionary como pipeline | N/A | 003 no toca generación ni pipeline Style Dictionary. |
| V. Independencia del framework | PASS | DTO/mappers headless sin React/Next/Astro/etc. |
| VI. El gestor es una herramienta | PASS | Package CLI emite reporte; no reemplaza archivos del DS. |
| VII. Edición visual transparente | N/A | 003 no implementa editor visual. |
| VIII. Validación antes de generación | PASS | Refuerza validación automatizable antes de cualquier consumo. |
| IX. Contratos antes que implementaciones | PASS | Contratos markdown + ADR 0011-0013 preceden/cubren implementación. |
| X. Accesibilidad estructural | N/A | Sin UI nueva; no reduce requisitos futuros. |
| XI. Páginas/secciones como validación | N/A | Fuera de alcance. |
| XII. Contenido como contexto opcional | N/A | Fuera de alcance. |
| XIII. Local-first | PASS | Funciona localmente, sin red ni servicios cloud. |
| XIV. Seguridad en modificaciones | PASS | `validate`/`inspect --json` son solo lectura; errores internos no filtran stacks. |
| XV. Integración con agentes controlada | PASS | JSON versionado para agentes sobre la misma fuente canónica. |
| XVI. Cambios incrementales/verificables | PASS | Checkpoints A-F, tests por capas, sin avanzar a foundations/004. |
| XVII. Portabilidad y ausencia de bloqueo | PASS | Contrato JSON público; archivos DTCG siguen utilizables sin gestor. |

Resultado: 17/17 principios PASS/N/A, 0 FAIL.

## Evidencia de cierre

- Flags: `validate --help` e `inspect --help` muestran `--json`; `init --help` no lo muestra.
- Scope: sin `init --json`, sin flag global, sin `--compact`, sin `--pretty`, sin `--output`.
- Envelope: `formatVersion:"1.0.0"`, cuatro campos base, `error` solo en `not-found`/`internal-error`.
- Streams: outcomes esperados en stdout y stderr vacío; internal-error en stderr y stdout vacío.
- Exit codes: `valid→0`, `complete-invalid→3`, `partial→4`, `not-found→5`, `read-error→6`, `internal-error→70`.
- Inspect JSON: no aplica cota de 200; la salida humana mantiene el mensaje de truncado.
- Pureza: DTO/mappers en aplicación; serializer/reporters en infraestructura; sin Node/CLI en mappers.
- Compatibilidad: salida humana y 001/002 siguen verdes, excepto la única aserción 002 actualizada.
- Empaquetado: `npm pack --dry-run --json` verde; pack real verificado y eliminado. Tarball:
  198 entradas, 68.6 kB empaquetado, 235.3 kB desempaquetado; contiene `dist/`, `package.json`,
  `README.md`; no contiene `src/`, `tests/`, `specs/`, `.specify/`, `.agents/`, fixtures,
  coverage, `node_modules`, temporales ni Design Systems de prueba.
- Smoke instalado: paquete instalado en proyecto temporal limpio; `neuraz-ds --help`,
  `--version`, `init --help`, `validate --help`, `inspect --help` verdes; `init` interactivo real
  creó los tres documentos; luego `validate --json` e `inspect --json` devolvieron JSON v1
  parseable, `formatVersion:"1.0.0"`, exit 0, sin depender del repositorio fuente.
- Pipeline final: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
  `npm pack --dry-run --json`, pack real y smoke instalado verdes con Node 24.14.0.

## Conteo de pruebas

- Suite total: 766/766 tests, 121 archivos de prueba.
- 001-ds-init histórico: 274 tests conservados.
- 002-ds-validate-inspect histórico: 315 tests conservados; solo la aserción autorizada de
  rechazo de `--json` cambió a aceptación JSON.
- 003-json-output: 177 tests acumulados.
- Proceso hijo/binario/pack: 29 tests (`validate-inspect-binary`, `validate-json-binary`,
  `inspect-json-binary`, `packaging-npx`).
- Omitidas por plataforma en esta ejecución: 0 reportadas por Vitest.

## Deuda documentada

- `FileInspection.sizeBytes` no se propaga desde la inspección actual y JSON v1 lo emite como `null`.
  Está documentado en el contrato y cubierto por tests; no bloquea 003 porque el campo se conserva
  estable para una futura mejora del modelo.

## Hooks Spec Kit

`.specify/extensions.yml` no define hooks `before_implement`, `after_implement`,
`before_analyze` ni `after_analyze`; no hubo acciones automáticas adicionales que ejecutar.
