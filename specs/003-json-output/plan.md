# Implementation Plan: 003-json-output

**Branch**: `003-json-output` | **Date**: 2026-06-27 | **Spec**: [spec.md](spec.md)

**Input**: [specs/003-json-output/spec.md](spec.md). Commit base: `62d66ca`.

## Summary

Añadir un flag `--json` a `neuraz-ds validate` y `neuraz-ds inspect` que emita un **envelope JSON
público, versionado y determinista** derivado de los **resultados headless existentes**, sin
reanalizar (sin segundo reader/parseo/traversal/recalculo). La salida humana actual no cambia.
Arquitectura: `caso de uso → resultado público → mapper puro a DTO v1 → serializer determinista →
reporter JSON → stdout`. Error interno (`exit 70`) en JSON: envelope seguro en stderr, stdout vacío.

## Technical Context

**Language/Version**: TypeScript estricto, ESM (NodeNext), Node `>=22`.
**Primary Dependencies**: commander 14, @clack/prompts 0.11, zod 4, ajv 8, semver 7. **Sin nuevas
dependencias en 003** (`JSON.stringify` nativo).
**Storage**: archivos locales (solo lectura).
**Testing**: vitest 4 (unit + integración FS real + CLI/proceso hijo).
**Target Platform**: CLI Node multiplataforma.
**Project Type**: single project (paquete npm con bin).
**Performance Goals**: el mapper de inspect recorre una vez la lista ya existente de nodos para
transformarla a DTO (O(n)); **no** reinterpreta aliases/tipos/estadísticas. Cero análisis adicional.
**Constraints**: solo lectura; determinismo byte-a-byte; sin TTY; stdout solo-JSON en `--json`; exit
codes intactos (ADR-0006); arquitectura por capas con arch-guard.
**Scale/Scope**: dos comandos, un flag; límites de análisis heredados (ADR-0009): hasta 100 000 nodos.

## Constitution Check

*GATE: pasa antes de Phase 0 y se re-evalúa tras Phase 1.*

| # | Principio | Resultado | Nota |
|---|---|---|---|
| I | Un DS por proyecto | PASS | opera sobre el único DS resuelto |
| II | Archivos fuente de verdad | PASS | solo lectura; reutiliza el análisis |
| III | DTCG canónico | PASS | no cambia el modelo DTCG |
| IV | Style Dictionary diferido | PASS (N/A) | fuera de alcance |
| V | Independencia de framework | PASS | DTO/mappers puros, headless |
| VI | Gestor ≠ DS | PASS | salida descriptiva, no altera el DS |
| VII | Edición transparente | PASS (N/A) | no edita |
| VIII | Validación antes de generación | PASS (N/A) | no genera |
| IX | Contratos antes que implementación | PASS | 6 contratos + 3 ADR previos |
| X | Accesibilidad estructural | PASS (N/A) | — |
| XI | Páginas como validación | PASS (N/A) | — |
| XII | Contenido opcional | PASS (N/A) | — |
| XIII | Local-first | PASS | offline, sin red |
| XIV | Seguridad | PASS | sin exponer stacks/paths sensibles/contexto; solo lectura |
| XV | Integraciones desacopladas | PASS | JSON estable para agentes/MCP, headless |
| XVI | Incrementalidad | PASS | solo `--json`; sin nuevos comandos |
| XVII | Portabilidad / no lock-in | PASS | JSON estándar; el DS sigue legible sin el gestor |

**Resultado: PASS (17/17).** Sin violaciones; sin entradas en *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/003-json-output/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── json-envelope-v1.contract.md
    ├── json-validate-result-v1.contract.md
    ├── json-inspect-result-v1.contract.md
    ├── json-issue-v1.contract.md
    ├── json-inspected-value-v1.contract.md
    ├── json-internal-error-v1.contract.md
    └── json-output-streams.contract.md
```

ADR: `docs/adr/0011-public-json-contract.md`, `0012-json-presentation-adapter.md`,
`0013-json-streams-and-internal-errors.md`.

### Source Code (estructura de módulos propuesta; rutas concretas)

```text
src/application/json/                 # CREAR — DTO + mappers puros (headless, sin streams)
├── format-version.ts                 # JSON_FORMAT_VERSION = "1.0.0"
├── dto.ts                            # tipos JsonEnvelope/Validate/Inspect/Issue/InspectedValue v1
├── map-issue.ts                      # AnalysisIssue → JsonIssueV1
├── map-inspected-value.ts            # InspectedValue<T> → JsonInspectedValueV1<T>
├── map-validation.ts                 # ValidationReport → JsonValidationV1
├── map-validate.ts                   # ValidateDesignSystemResult → JsonValidateEnvelopeV1
├── map-inspect.ts                    # InspectDesignSystemResult → JsonInspectEnvelopeV1
└── internal-error.ts                 # internalErrorEnvelope(command) → JsonInternalErrorEnvelopeV1

src/infrastructure/reporter/
├── json-serializer.ts                # CREAR — serializeJsonV1(envelope) = JSON.stringify(…,2)+"\n" (puro)
├── validate-json-reporter.ts         # CREAR — implementa ValidationReporter; escribe 1 vez en completed()
└── inspect-json-reporter.ts          # CREAR — implementa InspectionReporter; escribe 1 vez en completed()

src/cli/
├── program.ts                        # EXTENDER — opción local --json en validate/inspect; selección de modo; internal-error JSON
├── composition.ts                    # EXTENDER — createValidateJsonDependencies / createInspectJsonDependencies
└── index.ts                          # EXTENDER (mínimo) — wiring del modo JSON

tests/
├── unit/json/                        # mappers, serializer, null-policy, determinismo, sin undefined
├── unit/cli/                         # selección de modo, internal-error, single-write
├── integration/json-output/          # FS real: estados, >200 tokens, Unicode, paths con espacios
└── cli/                              # proceso hijo: exit codes + JSON.parse(stdout) + stderr vacío
```

**Structure Decision**: single project existente; capas `domain → application → infrastructure →
cli`. Los **DTO + mappers** viven en **aplicación** (puros, sin streams; soportan US7 headless) y
respetan el arch-guard (sin `node:*`/commander/clack). El **serializer** y los **reporters JSON** en
**infraestructura/presentación**. El flag, la selección de modo y el manejo de error interno JSON en
**CLI**. La cota `MAX_INSPECT_TERMINAL_TOKEN_ROWS` permanece **solo** en el reporter textual.

## Arquitectura y flujos

### Flujo `validate --json`

```text
CLI: validate.action lee opts.json === true
  → runValidate(cwd, createValidateJsonDependencies(io, analyze))
      → validateDesignSystem(input, { analyze, reporter: JsonValidationReporter })
          → analyze(input)  (UNA vez)  → ValidationReport (proyección)
          → reporter.hostResolved/structuralStateDetected/validated  (no-op en JSON)
          → reporter.completed(result):
                env = mapValidate(result)           # application (puro)
                io.out(serializeJsonV1(env))         # infra: 1 sola escritura
  → exitCodeForOutcome(result.outcome)               # 0/3/4/5/6 (sin cambios)
```

### Flujo `inspect --json`

Igual, con `InspectionReporter`/`mapInspect`. `tokens.paths` incluye **todos** los nodos (sin cota).

### Error interno (JSON)

```text
handler JSON envuelve la ejecución:
  try { … } catch (excepción inesperada):
     io.err(serializeJsonV1(internalErrorEnvelope(command)))   # stderr, 1 escritura
     return INTERNAL_ERROR_EXIT (70)                            # stdout queda vacío
```

El `catch` del entrypoint queda como red de seguridad **no-JSON** de último recurso.

## Reuse matrix

### Reutilizar sin cambios

`validateDesignSystem`, `inspectDesignSystem`, `ValidateDesignSystemResult`/
`InspectDesignSystemResult`, `AnalysisOutcome`, `exitCodeForOutcome`/`INTERNAL_ERROR_EXIT`, `CliIO`,
`createBoundAnalyze` (analyzer/reader/traversal/DTCG), modelos de dominio fuente
(`ValidationReport`/`DesignSystemInspection`/`AnalysisIssue`/`InspectedValue`/`TokenNodeSummary`/
`AnalysisLimitsResult`/`HostError`), helpers de proceso hijo/fixtures de 002.

### Extender aditivamente

Opciones `--json` en `validate`/`inspect` (Commander, local); `composition.ts`
(`create*JsonDependencies`); selección de modo en `program.ts`; manejo de internal-error JSON; exports
necesarios de `src/index.ts` (DTO/mappers/version) para consumo headless.

### Crear

DTO JSON v1 + mappers (aplicación); `serializeJsonV1` + reporters JSON (infraestructura); contratos;
ADR-0011..0013; pruebas unit/integración/CLI.

### No modificar

Dominio DTCG, schema de `init`, tubería de análisis, salida humana (reporters textuales y su cota
200), `exitCodeForResult` de `init`, foundations/presets (inexistentes), `package.json` (salvo que el
empaquetado revele una omisión objetiva — no se anticipa).

## Estrategia de pruebas

- **Unit (aplicación)**: `map-validate`/`map-inspect` por outcome; `map-issue` (document/path null,
  context descartado); `map-inspected-value` (unavailable → `value:null`); `map-validation`;
  `internal-error`; **null-policy** (sin `undefined`, recursivo); `serializeJsonV1` (2 espacios +
  newline, sin BOM/ANSI, orden de claves, Unicode); input **no mutado**; determinismo (misma entrada →
  mismos bytes).
- **Unit (CLI)**: selección texto/JSON por `opts.json`; reporter JSON escribe **una sola vez**;
  internal-error → stderr + 70 + stdout vacío.
- **Integración (FS real)**: DS de `init`; inválido; parcial; inexistente; UTF-8 inválido; tipo
  desconocido; tipo reconocido superficial; alias roto; ciclo; **199/200/201/250** tokens (JSON
  conserva total completo); paths con espacios; Unicode. Comprobar `human ≠ formato JSON` pero
  `outcome`/exit **iguales** en ambos modos.
- **CLI / proceso hijo (sin TTY)**: validate/inspect `--json` para `valid/complete-invalid/partial/
  not-found/read-error` (+ >200 en inspect): `JSON.parse(stdout)` ok, `formatVersion==="1.0.0"`,
  `command`/`outcome` correctos, **stderr vacío**, exit esperado.
- **No-análisis-adicional**: spies confirman `analyze` llamado **una** vez por comando en modo JSON;
  el mapper de inspect no recalcula estadísticas.
- **Regresión 001/002**: suite histórica **589/589** intacta; + prueba `init → validate --json →
  inspect --json → init unchanged` con documentos **byte-idénticos**.

## Empaquetado

Verificar tarball: nuevos módulos en `dist/`; sin specs/tests/fixtures/fuentes/temporales; binario con
`--json` disponible. Smoke: `neuraz-ds validate --json` / `inspect --json`. **No publicar.**

## Riesgos y mitigaciones

| # | Riesgo | Mitigación | Prueba |
|---|---|---|---|
| 1 | Exponer campos internos | DTO explícito; `context`/stack excluidos | unit map-issue; revisión de DTO |
| 2 | Doble salida (texto + JSON) | un solo adapter por modo (ADR-0012) | unit CLI single-write |
| 3 | JSON inválido por `undefined` | mappers normalizan a `null`/`[]`/`{}` | unit null-policy |
| 4 | Cambios futuros incompatibles | `formatVersion` semver + política | contrato/ADR-0011 |
| 5 | internal-error mezclado con outcomes | `internal-error` solo en CLI, no en dominio | unit; CLI proceso hijo |
| 6 | stderr rompe consumidores | stderr vacío en outcomes esperados | CLI proceso hijo |
| 7 | Cota 200 aplicada por error | constante no importada en DTO/mapper/serializer | integración 201/250 |
| 8 | Doble análisis | reutiliza resultado; `analyze` 1 vez | spies unit |
| 9 | Paths sensibles | solo host público + relativePath + token path lógico | revisión DTO/contrato |
| 10 | Cambio involuntario en salida humana | reporters textuales intactos | regresión 002 |
| 11 | Serializer que muta | función pura sobre copia DTO | unit input-no-mutado |
| 12 | `JSON.stringify` de valores no seguros | DTO solo JSON-safe; sin BigInt/NaN/función | unit serializer |

## Límites de alcance

Solo `validate --json` e `inspect --json`. **No**: `init --json`, `--compact`/`--pretty`, filtros/
selección/paginación, JSONL/NDJSON/streaming, `--output`/archivo, schema publicado, HTTP/MCP/TUI/
viewer, edición/reparación/migración, foundations/presets/themes/múltiples tokens, Style Dictionary,
nuevos tipos DTCG profundos.

## Fases de implementación previstas (NO son tareas; las genera `/speckit-tasks`)

1. **Aplicación — DTO + mappers + versión** (puros, arch-guard OK).
2. **Infraestructura — serializer + reporters JSON** (única escritura).
3. **CLI — flag `--json`, selección de modo, internal-error JSON, composición**.
4. **Pruebas — unit + integración + proceso hijo + regresión + no-análisis-adicional**.
5. **Cierre — exports headless, README/quickstart, empaquetado, auditoría**.

## Cobertura (auditoría interna)

- **Historias**: US1–US8 → flujos validate/inspect + recuperables + stdout limpio + compat humana +
  headless + internal-error. **8/8**.
- **FR**: FR-001..035 mapeados a contratos/ADR/estructura (flag, envelope, DTO, mappers, único JSON,
  newline, stdout limpio, sin ANSI, outcomes, exit codes intactos, sin cota 200, issues, confianza,
  null-policy, determinismo, sin TTY, compat humana, internal-error, no modificación, no segundo
  análisis, no serialización directa, seguridad). **35/35**.
- **SC**: SC-001..010 cubiertos por la estrategia de pruebas. **10/10**.
- Envelope único; versión única (`1.0.0`); null-policy única; un solo mecanismo de emisión;
  stdout/stderr inequívocos; exit codes intactos; internal-error consistente; sin cota 200 en JSON;
  sin doble análisis; sin `init --json`; sin scope creep. **0 `[NEEDS CLARIFICATION]`**. Constitution
  **PASS**.
