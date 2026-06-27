# Tasks: 003-json-output

**Feature**: Machine-readable JSON output for `validate` / `inspect`. **Base**: `75c7689`.
**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Data model**: [data-model.md](data-model.md)
· **Contratos**: [contracts/](contracts/) · **ADR**: 0011/0012/0013.

> **Reglas**: solo lectura del DS; reutiliza los casos de uso headless (sin reanalizar); DTO+mappers
> **puros** en aplicación; serializer+reporters JSON en infraestructura; flag `--json` y selección de
> modo en CLI. La cota `MAX_INSPECT_TERMINAL_TOKEN_ROWS` **no** entra en DTO/mapper/serializer.
> Cada tarea: `Done:` + `Test:`. `[P]` = paralelizable (archivos distintos, sin dependencia mutua).

---

## Checkpoint A — DTO y mappers comunes (Fases 1–2)

### Fase 1 — Contrato JSON v1 y modelos

- [X] T001 [P] [US7] Crear `src/application/json/format-version.ts` con `export const JSON_FORMAT_VERSION = "1.0.0"`.
  - Done: constante inmutable, independiente de `package.version`; sin imports de Node/CLI/infra.
  - Test: `tests/unit/json/format-version.test.ts` afirma el valor exacto `"1.0.0"`.
- [X] T002 [US7] Definir todos los tipos DTO v1 en `src/application/json/dto.ts` (solo tipos): enums (`JsonCommand`, `JsonExpectedOutcome`, `JsonInternalOutcome`), `JsonHostV1`, `JsonInspectedValueV1<T>`, `JsonIssueV1`, `JsonLimitHitV1`/`JsonLimitsV1`, `JsonSummaryV1`, `JsonValidationV1`, `JsonValidateResultV1`, `JsonFileInspectionV1`, `JsonTokenNodeV1`, `JsonIdentityV1`, `JsonSchemaVersionsV1`, `JsonFilesV1`, `JsonTokensV1`, `JsonInspectResultV1`, `JsonErrorV1`, los envelopes `JsonValidateEnvelopeV1`/`JsonInspectEnvelopeV1` (unión por `outcome`) y `JsonInternalErrorEnvelopeV1`.
  - Done: coincide con [data-model.md](data-model.md) §2–§7; 4 campos base siempre; `error` solo en `not-found`/`internal-error`; sin tipos de dominio reexpuestos; sin Node/CLI/exit-codes.
  - Test: cubierto por los tests de mappers (T006/T008/T010/T012/T014/T016/T018) que tipan contra estos DTO.
- [X] T003 [P] [US7] Crear barrel `src/application/json/index.ts` y reexportar lo mínimo en `src/application/index.ts` (DTO + `JSON_FORMAT_VERSION` + mappers a medida que existan).
  - Done: API pública headless disponible (`import { JSON_FORMAT_VERSION } from "@neuraz/design-system-manager"`); arch-guard OK.
  - Test: `tests/unit/json/exports.test.ts` importa version + un DTO type-only y un mapper desde el índice público.
- [X] T004 [P] [US7] `tests/unit/json/dto-invariants.test.ts`: invariantes que TS no garantiza en runtime.
  - Done: n/a (test).
  - Test: sobre literales de muestra, valida 4 campos base presentes y ausencia de `undefined` (recorrido recursivo) para validate/inspect/internal-error.

### Fase 2 — Mappers comunes puros

- [X] T005 [P] [US7] Implementar `toJsonInspectedValue` en `src/application/json/map-inspected-value.ts`.
  - Done: `{ value: iv?.value ?? null, trust: iv?.trust ?? "unavailable" }`; `value` siempre presente; nunca `undefined`; preserva `valid|recovered|untrusted|unavailable`.
  - Test: `tests/unit/json/map-inspected-value.test.ts` — presente, recovered/untrusted preservados, `undefined`→`{value:null,trust:"unavailable"}`, input congelado.
- [X] T006 [P] [US7] Implementar `toJsonIssue` en `src/application/json/map-issue.ts`.
  - Done: produce `{severity,code,message,document,path}`; `document`/`path` → `null` si ausentes; **nunca** incluye `context`/stack/objetos Error.
  - Test: `tests/unit/json/map-issue.test.ts` — error/warning, ausencias→null, `context` descartado, input congelado, orden estable de arrays.
- [X] T007 [P] [US7] Implementar `map-common.ts` (`toJsonHost`, `toJsonLimits`, `toJsonSummary`) en `src/application/json/map-common.ts`.
  - Done: `host:null` cuando no hay; `limits` copia `{reached,partial,hits[]}`; `summary.tokens` → `?? null`; copias defensivas; sin mutar entrada.
  - Test: `tests/unit/json/map-common.test.ts` — host null/presente, hits copiados y en orden, tokens null, input congelado.
- [X] T008 [US7] Implementar `toJsonValidation(report)` en `src/application/json/map-validation.ts` (usa T006/T007).
  - Done: `JsonValidationV1` sin `host`; arrays `errors`/`warnings` mapeados en orden; `limits`/`summary` vía map-common.
  - Test: `tests/unit/json/map-validation.test.ts` — válido/ inválido, orden de issues preservado, determinismo, sin reconstrucción.

**Checkpoint A** termina en **T008**. Debe quedar: typecheck/lint/tests verdes; aplicación sin Node/CLI.

---

## Checkpoint B — Mappers validate / inspect / internal-error (Fases 3–5)

### Fase 3 — Mapper de validate

- [ ] T009 [US1] [US2] Implementar `toValidateEnvelope(result)` en `src/application/json/map-validate.ts` → `JsonValidateEnvelopeV1`.
  - Done: cubre `valid|complete-invalid|partial|read-error` (result = `{host}` ⊕ `toJsonValidation`) y `not-found` (`result:null`, `error:null` — `hostError` no se puebla en v1, contrato remediado); recibe el resultado público ya clasificado; **no** reconstruye `ValidationReport`; sin campos de inspect.
  - Test: incluido en T010.
- [ ] T010 [P] [US1] [US2] `tests/unit/json/map-validate.test.ts`.
  - Done: n/a (test).
  - Test: host presente/`null`; los 5 outcomes; `not-found`→`result:null`+`error:null`; checked/unchecked/summary/errors/warnings/limits; envelope determinista; input congelado; sin claves de inspect.

### Fase 4 — Mapper de inspect

- [ ] T011 [US3] [US4] Implementar `toInspectEnvelope(result)` en `src/application/json/map-inspect.ts` → `JsonInspectEnvelopeV1` (helpers puros internos para `JsonTokenNodeV1` y `JsonFileInspectionV1`).
  - Done: mapea host, structuralState, identity/schemaVersions (cada campo vía `toJsonInspectedValue`→`null` si ausente), files (expected/present/missing, `sizeBytes ?? null`), tokens (estadísticas + `byType` sin reordenar + **todos** los paths) y `validation` (vía `toJsonValidation`); `not-found`→`result:null`,`error:null`; **no** importa `MAX_INSPECT_TERMINAL_TOKEN_ROWS`; no recalcula aliases/tipos/confianza/estadísticas/profundidad.
  - Test: incluido en T012.
- [ ] T012 [P] [US3] [US4] `tests/unit/json/map-inspect.test.ts`.
  - Done: n/a (test).
  - Test: 0/199/200/201/250 paths (todos presentes; sin uso de la cota); identity unavailable→`{value:null,trust:"unavailable"}`; estados recuperables (complete-invalid/partial); not-found result null; determinista; input congelado.

### Fase 5 — Envelope de error interno

- [ ] T013 [P] [US8] Implementar `internalErrorEnvelope(command)` en `src/application/json/map-internal-error.ts` → `JsonInternalErrorEnvelopeV1`.
  - Done: `{formatVersion, command, outcome:"internal-error", result:null, error:{code:"internal-cli-error", message}}` con `message` fijo y seguro; **no** agrega `internal-error` a los outcomes headless; sin error original/stack/path/env.
  - Test: `tests/unit/json/map-internal-error.test.ts` — 4 campos base + `error`, `validate`/`inspect`, mensaje fijo, sin datos sensibles, determinista.

**Checkpoint B** termina en **T013**. Debe quedar: typecheck/lint/tests verdes; mappers puros y completos.

---

## Checkpoint C — Serializer y reporters JSON (Fases 6–7)

### Fase 6 — Serializer determinista

- [ ] T014 [US5] Crear `serializeJsonV1(envelope)` en `src/infrastructure/reporter/json-serializer.ts`.
  - Done: única responsabilidad `JSON.stringify(envelope, null, 2) + "\n"`; función pura; sin sorted-key/compact/pretty/JSONL; sin mutar la entrada.
  - Test: `tests/unit/json/json-serializer.test.ts` — parseable; 2 espacios; exactamente un `\n` final; sin BOM/ANSI; Unicode; mismo DTO→mismos bytes; input congelado.

### Fase 7 — Reporters JSON

- [ ] T015 [US1] [US5] Implementar `ValidateJsonReporter` (implements `ValidationReporter`) en `src/infrastructure/reporter/validate-json-reporter.ts`.
  - Done: `hostResolved`/`structuralStateDetected`/`validated` no-op; **solo** `completed(result)` escribe — `io.out(serializeJsonV1(toValidateEnvelope(result)))`, una sola escritura; **stdout** para todos los outcomes esperados (incl. exit≠0); no analiza, no toca fs, no recalcula exit codes, no cota 200.
  - Test: incluido en T016.
- [ ] T016 [P] [US1] [US5] `tests/unit/cli/validate-json-reporter.test.ts` (IO falso).
  - Done: n/a (test).
  - Test: ninguna escritura antes de `completed`; exactamente una escritura; payload parseable; outcome no-válido también va a stdout; reporter textual no ejecutado; input congelado.
- [ ] T017 [US3] [US5] Implementar `InspectJsonReporter` (implements `InspectionReporter`) en `src/infrastructure/reporter/inspect-json-reporter.ts`.
  - Done: misma disciplina; `completed` → `io.out(serializeJsonV1(toInspectEnvelope(result)))`; **sin** cota 200 (todos los paths).
  - Test: incluido en T018.
- [ ] T018 [P] [US3] [US5] `tests/unit/cli/inspect-json-reporter.test.ts` (IO falso).
  - Done: n/a (test).
  - Test: escritura única en `completed`; payload parseable; >200 paths conservados; sin mensaje de truncado; outcome no-válido en stdout.

**Checkpoint C** termina en **T018**. Debe quedar: typecheck/lint/tests verdes; una sola emisión por reporter.

---

## Checkpoint D — CLI, composición y error interno (Fases 8–9)

### Fase 8 — Flag CLI y selección de presentación

- [ ] T019 [US1] [US3] Registrar la opción local booleana `--json` (`default false`) en los subcomandos `validate` e `inspect` en `src/cli/program.ts`; **no** en `init`; **no** global.
  - Done: `validate`/`inspect` aceptan `--json`; `init --json` y `--json validate` (global) siguen siendo error de uso (exit 3); el valor llega vía `cmd.opts().json`.
  - Test: incluido en T022 (+ child en T031).
- [ ] T020 [US6] Añadir `createValidateJsonDependencies(io, analyze)` y `createInspectJsonDependencies(io, analyze)` en `src/cli/composition.ts`, reutilizando `createBoundAnalyze` y los reporters JSON.
  - Done: devuelven las deps con el reporter JSON; mismo analyzer enlazado (sin segundo análisis); sin instanciar el reporter textual.
  - Test: `tests/unit/cli/composition-json.test.ts` — construye deps JSON con IO falso; el reporter es el JSON.
- [ ] T021 [US1] [US3] Cablear la selección de modo en `src/cli/program.ts` (acción lee `opts.json` → deps textual o JSON) y pasar las deps JSON desde `src/cli/index.ts`; conservar `exitCodeForOutcome` y **una** ejecución del caso de uso.
  - Done: sin flag → reporter textual (idéntico a hoy); con `--json` → reporter JSON; exit code sin cambios; un solo adapter por ejecución.
  - Test: incluido en T022.
- [ ] T022 [P] [US6] `tests/cli/validate-inspect-json-commands.test.ts` (vía `runCli`, IO falso, sin TTY).
  - Done: n/a (test).
  - Test: `validate`/`inspect` sin flag → texto; con `--json` → JSON parseable en stdout, stderr vacío; exit codes intactos por outcome; `init --json`→3; `--json validate`→3.

### Fase 9 — Error interno CLI en modo JSON

- [ ] T023 [US8] En `src/cli/program.ts`, en modo JSON, envolver la ejecución del caso de uso: ante excepción inesperada (tras aceptar argumentos) escribir **una** vez `serializeJsonV1(internalErrorEnvelope(command))` en `io.err`, devolver `INTERNAL_ERROR_EXIT` (70) y dejar **stdout vacío**. El handler conoce `command` + `jsonMode` (sin husmear `process.argv`).
  - Done: stdout vacío, stderr un JSON seguro, exit 70; modo humano conserva el error interno actual; errores de uso de Commander **no** se convierten en internal-error JSON.
  - Test: incluido en T024.
- [ ] T024 [P] [US8] `tests/cli/json-internal-error.test.ts` (inyectando un `analyze` que lanza).
  - Done: n/a (test).
  - Test: excepción en validate/inspect JSON → stderr parseable (`outcome:"internal-error"`), stdout vacío, exit 70, sin stack/mensaje original; modo humano intacto; error de uso Commander sigue exit 3 sin JSON.

**Checkpoint D** termina en **T024**. Debe quedar: typecheck/lint/tests verdes; binario funcional con `--json`.

---

## Checkpoint E — Integración y procesos hijos (Fases 10–12)

### Fase 10 — Integración con filesystem real

- [ ] T025 [US1] [US2] `tests/integration/json-output/validate-json.test.ts` (helpers `tmp-project`/`ds-fixtures`).
  - Done: n/a (test).
  - Test: `valid/complete-invalid/partial/not-found/read-error` → `JSON.parse(out)` ok, envelope/outcome correctos, exit por outcome, stderr vacío, sin modificación del DS.
- [ ] T026 [US3] [US4] `tests/integration/json-output/inspect-json.test.ts`.
  - Done: n/a (test).
  - Test: mismos 5 outcomes + recuperables; identity/schemaVersions/files/tokens/validation presentes; not-found result null.
- [ ] T027 [P] [US3] `tests/integration/json-output/inspect-json-paths.test.ts` (250 tokens).
  - Done: n/a (test).
  - Test: `tokens.paths.length === tokens.total === 250`; sin mensaje de truncado; exit 0.
- [ ] T028 [P] [US2] `tests/integration/json-output/edge-cases.test.ts`.
  - Done: n/a (test).
  - Test: UTF-8 inválido, tipo desconocido, tipo reconocido superficial, alias roto, ciclo, paths con espacios, Unicode → JSON válido y outcome correcto.
- [ ] T029 [P] [US6] `tests/integration/json-output/human-vs-json.test.ts`.
  - Done: n/a (test).
  - Test: human y JSON difieren en formato pero coinciden en `outcome` y exit code para los mismos estados.

### Fase 11 — Procesos hijos y sin TTY

- [ ] T030 [US1] [US2] [US5] `tests/cli/validate-json-binary.test.ts` (binario real, `run-binary`, stdin cerrado).
  - Done: n/a (test).
  - Test: matriz `valid→0/complete-invalid→3/partial→4/not-found→5/read-error→6`: stdout exactamente un JSON con `\n` final, sin ANSI, `formatVersion:"1.0.0"`, command/outcome correctos, stderr vacío, sin prompts, sin archivos nuevos.
- [ ] T031 [US3] [US5] [US6] `tests/cli/inspect-json-binary.test.ts`.
  - Done: n/a (test).
  - Test: misma matriz + `>200` (todos los paths); además política Commander: `validate/inspect --json --unknown`→3, `init --json`→3, `--json validate`→3.

### Fase 12 — No doble análisis, pureza y determinismo

- [ ] T032 [US5] `tests/integration/json-output/single-analysis.test.ts` (spies reutilizados de 002).
  - Done: n/a (test).
  - Test: `analyze` llamado **una** vez en validate `--json` e inspect `--json`; mappers/reporters/serializer no analizan ni reinterpretan DTCG.
- [ ] T033 [P] [US5] `tests/unit/json/determinism.test.ts`.
  - Done: n/a (test).
  - Test: misma entrada → bytes idénticos (validate e inspect); resultados/issues/identity/statistics/paths congelados no se mutan.

**Checkpoint E** termina en **T033**. Debe quedar: typecheck/lint/tests verdes; integración y binario cubiertos.

---

## Checkpoint F — Regresión, documentación, pack y cierre (Fases 13–14)

### Fase 13 — Regresión de 001 y 002

- [ ] T034 [US6] Actualizar la única prueba histórica de 002 que esperaba `--json` rechazado en `tests/cli/validate-inspect-binary.test.ts` ("--json no aceptado → 3").
  - Done: la aserción pasa a verificar que `validate --json`/`inspect --json` ahora son válidos (exit por outcome, JSON en stdout); ningún otro test histórico se modifica ni se debilita.
  - Test: la propia prueba actualizada + suite 001/002 verde (588 sin tocar + esta).
- [ ] T035 [US6] `tests/integration/json-output/regression-flow.test.ts`: `init → validate --json → inspect --json → init unchanged`.
  - Done: n/a (test).
  - Test: los tres documentos quedan **byte-idénticos**; `init` de nuevo → `unchanged`/2; salida humana y cota 200 intactas; `package.json` sin cambios; no `init --json`.

### Fase 14 — Documentación, empaquetado y cierre

- [ ] T036 [P] [US1] [US3] Actualizar `README.md`: `--json` en validate/inspect, envelope versionado, tabla de exit codes (incl. 70), `formatVersion`, diferencia human/JSON, `>200` tokens, límites v1.
  - Done: documenta el contrato sin prometer fuera de alcance; coherente con los contratos.
  - Test: revisión manual; sin afirmaciones contradictorias con spec/contracts.
- [ ] T037 [P] Alinear el texto de ayuda de `validate`/`inspect` (descripción de `--json`) y verificar `quickstart.md`.
  - Done: `--help` de cada subcomando menciona `--json`; quickstart coherente.
  - Test: `--help` de validate/inspect muestra `--json`; child-process help → exit 0.
- [ ] T038 Empaquetado: `npm run build` + `npm pack --dry-run` (y tarball real verificado/eliminado).
  - Done: nuevos módulos `dist/application/json/*` y `dist/infrastructure/reporter/*json*`; tarball solo `dist`+`package.json`+`README.md`; sin specs/tests/fixtures; **sin nuevas dependencias**.
  - Test: `tests/integration/packaging-npx.test.ts` sigue verde; listado del tarball revisado.
- [ ] T039 Smoke del paquete instalado en proyecto temporal: `neuraz-ds validate --json` / `inspect --json`.
  - Done: el binario empaquetado emite JSON v1 válido; **no** se publica.
  - Test: smoke manual/automatizado (parse de stdout, exit esperado).
- [ ] T040 Cierre: crear `specs/003-json-output/audit.md` (matriz US/FR/SC, constitución 17/17, auditoría final) y verificar pipeline completo.
  - Done: trazabilidad 8/8 · 35/35 · 10/10; `typecheck`/`lint`/`test`/`build`/`pack` verdes; working tree limpio.
  - Test: pipeline completo verde; sin desviaciones abiertas.

**Checkpoint F** termina en **T040**. Cierra la feature 003.

---

## Dependencias y orden

```text
T001–T004 (DTO/version)
  → T005–T008 (mappers comunes)
    → T009–T010 (validate mapper) ┐
    → T011–T012 (inspect mapper)  ├ usan mappers comunes
    → T013 (internal-error DTO)   ┘
      → T014 (serializer)
        → T015–T018 (reporters JSON)
          → T019–T022 (flag CLI + composición + selección)
            → T023–T024 (error interno CLI)
              → T025–T029 (integración FS real)
              → T030–T031 (procesos hijos; requieren build)
                → T032–T033 (no doble análisis / determinismo)
                  → T034–T035 (regresión 001/002)
                    → T036–T040 (docs, pack, cierre)
```

Reglas duras: reporter no antes del DTO; CLI no antes de reporters; proceso hijo no antes del build
funcional (Checkpoint D); cierre no antes de la regresión.

## Oportunidades de paralelización

- **Checkpoint A**: T001, T003, T004 ‖; T005, T006, T007 ‖ (T008 depende de T006/T007).
- **Checkpoint B**: T010 ‖ T012 ‖ T013 (archivos distintos; T009/T011 secuenciales por su test).
- **Checkpoint C**: T016 ‖ T018 (tests de reporters distintos).
- **Checkpoint D**: T022 ‖ T024 (tests distintos); T019/T021/T023 tocan `program.ts` → secuenciales.
- **Checkpoint E**: T027 ‖ T028 ‖ T029; T033 ‖ resto.
- **Checkpoint F**: T036 ‖ T037.

## Trazabilidad

### US → tareas (8/8)

| US | Tareas |
|---|---|
| US1 validate JSON válido | T009, T015, T019, T021, T025, T030 |
| US2 validate JSON inválido/parcial | T009, T010, T025, T028, T030 |
| US3 inspect JSON completo | T011, T017, T019, T021, T026, T027, T031 |
| US4 inspect recuperable | T011, T012, T026 |
| US5 stdout limpio para máquinas | T014, T015, T017, T030, T031, T032, T033 |
| US6 compatibilidad humana | T020, T022, T029, T034, T035 |
| US7 DTO/mappers headless | T001, T002, T003, T004, T005, T006, T007, T008 |
| US8 error interno seguro | T013, T023, T024 |

### FR → tareas (35/35)

| FR | Tareas | FR | Tareas |
|---|---|---|---|
| FR-001 | T019 | FR-019 | T014, T015, T017, T030 |
| FR-002 | T019 | FR-020 | T015, T017, T030, T031 |
| FR-003 | T021, T022 | FR-021 | T023, T024 |
| FR-004 | T002, T009, T011 | FR-022 | T014 |
| FR-005 | T001 | FR-023 | T014, T033 |
| FR-006 | T002, T009, T011, T013 | FR-024 | T007, T008, T011, T014 |
| FR-007 | T009 | FR-025 | T021, T030, T031 |
| FR-008 | T007, T009 | FR-026 | T009, T011 |
| FR-009 | T009 | FR-027 | T005–T013 |
| FR-010 | T011 | FR-028 | T029, T034, T035 |
| FR-011 | T005, T011 | FR-029 | T034, T040 |
| FR-012 | T011, T012, T027 | FR-030 | T032 |
| FR-013 | T011 | FR-031 | T025, T026, T030 |
| FR-014 | T006 | FR-032 | T006, T013, T023 |
| FR-015 | T006, T013 | FR-033 | T013, T023 |
| FR-016 | T006 | FR-034 | T002, T013 |
| FR-017 | T005, T007, T009, T011 | FR-035 | T022, T031 |
| FR-018 | T004, T033 | | |

### SC → tareas (10/10)

| SC | Tareas |
|---|---|
| SC-001 | T025, T026, T030, T031 |
| SC-002 | T030, T031 |
| SC-003 | T030, T031 |
| SC-004 | T027, T031 |
| SC-005 | T033 |
| SC-006 | T032 |
| SC-007 | T034, T040 |
| SC-008 | T030, T031 |
| SC-009 | T006, T013, T024 |
| SC-010 | T040 |

## Constitution Check (tareas que protegen cada principio)

- **Arquitectura headless (V, XV)**: DTO/mappers puros en aplicación (T001–T013); reporters como
  adapters (T015–T018); exports headless (T003).
- **Archivos locales fuente de verdad / no escritura (II, XIV)**: solo lectura verificada (T025, T030,
  T035); `package.json`/documentos byte-idénticos (T035).
- **Determinismo (XVI)**: serializer + mappers deterministas (T014, T033); orden preservado (T007,
  T011).
- **CLI como adapter (V, VI)**: flag/selección/error interno solo en CLI (T019–T024).
- **Seguridad (XIV)**: sin stack/context/datos sensibles (T006, T013, T023, T024).
- **Portabilidad / sin TTY (XIII, XVII)**: procesos hijos sin TTY (T030, T031); JSON estándar.
- **Compatibilidad con features cerradas (XVI)**: regresión 001/002 (T034, T035, T038).
- **No lock-in (XVII)**: contrato JSON versionado, DS legible sin el gestor (T002, T036).

## Checkpoints

| Checkpoint | Tareas | Resultado esperado |
|---|---|---|
| A — DTO y mappers comunes | T001–T008 | typecheck/lint/tests verdes |
| B — Mappers validate/inspect/internal-error | T009–T013 | mappers puros completos; verdes |
| C — Serializer y reporters JSON | T014–T018 | una sola emisión por reporter; verdes |
| D — CLI, composición y error interno | T019–T024 | binario con `--json`; exit codes intactos; verdes |
| E — Integración y procesos hijos | T025–T033 | matriz de outcomes + determinismo; verdes |
| F — Regresión, docs, pack y cierre | T034–T040 | 001/002 + 003 verdes; tarball limpio; auditoría |

Commit sugerido por checkpoint (A–B / C / D / E / F): `feat: add JSON output contracts and mappers`
· `feat: add JSON output reporters` · `feat: add JSON CLI mode` · `test: add JSON output integration
coverage` · `docs: close JSON output feature`.

## Fuera de alcance (sin tareas)

`init --json`, `--compact`/`--pretty`, filtros/selección de campos, JSONL/NDJSON/streaming,
`--output`/archivo, schema remoto, HTTP/MCP/TUI/viewer, foundations/presets/themes, Style Dictionary,
repair/edición/migración, nuevos tipos DTCG, múltiples archivos de tokens.

---

**Total: 40 tareas** · 14 fases · 6 checkpoints · 0 marcadas · 0 `[NEEDS CLARIFICATION]`.
Primera tarea: **T001**. Primer checkpoint para `/speckit-implement`: **Checkpoint A (T001–T008)**.
