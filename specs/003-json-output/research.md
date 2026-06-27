# Research — 003-json-output

Investigación técnica para una salida JSON pública, estable y versionada de `validate` e `inspect`.
Todo se contrastó **contra el código real** (no solo documentación). Sin nuevas dependencias.

## 1. Arquitectura actual observada (verificada en código)

### Casos de uso headless y resultados públicos

- [`validateDesignSystem(input, deps)`](../../src/application/validate-design-system.ts) →
  `ValidateDesignSystemResult` (unión discriminada por `outcome`).
- [`inspectDesignSystem(input, deps)`](../../src/application/inspect-design-system.ts) →
  `InspectDesignSystemResult` (unión discriminada por `outcome`).
- Ambos llaman **exactamente una vez** a `deps.analyze(input)` (la tubería
  [`analyzeExistingDesignSystem`](../../src/application/analyze-existing-design-system.ts) ya
  enlazada por la composición), y proyectan el `DesignSystemAnalysis` común a su vista
  ([`ValidationReport`](../../src/domain/analysis/validation-report.ts) /
  [`DesignSystemInspection`](../../src/domain/analysis/design-system-inspection.ts)).
- `AnalysisOutcome = "valid" | "complete-invalid" | "partial" | "not-found" | "read-error"`
  (en [`analysis-ports.ts`](../../src/application/analysis-ports.ts)).

**Consecuencia clave**: todo lo que la salida JSON necesita ya está en el resultado público que
devuelve cada caso de uso y que recibe el reporter en `completed(result)`. **No hay que reanalizar.**

### Puertos de presentación (reporters)

Los puertos [`ValidationReporter` / `InspectionReporter`](../../src/application/analysis-ports.ts)
reciben **datos estructurados** (no `report(string)`):
`hostResolved → structuralStateDetected → validated|inspected → completed(result)`.

Verificado en los reporters textuales
([validate](../../src/infrastructure/reporter/validate-terminal-reporter.ts),
[inspect](../../src/infrastructure/reporter/inspect-terminal-reporter.ts)): **solo `completed()`
escribe**; los eventos previos solo acumulan estado. `completed(result)` recibe el resultado público
completo (host, report/inspection, outcome) — exactamente el insumo de un envelope JSON.

El reporter textual de inspect aplica `MAX_INSPECT_TERMINAL_TOKEN_ROWS = 200` **dentro del propio
reporter** (presentación), no en el dominio: `DesignSystemInspection.tokens.paths` conserva **todos**
los nodos.

### CLI / composición / streams / exit codes

- [`composition.ts`](../../src/cli/composition.ts): `createBoundAnalyze()` crea un único reader y un
  único analyzer; `createValidateDependencies(io, analyze)` / `createInspectDependencies(io, analyze)`
  inyectan el **reporter textual**. La tubería se comparte (sin doble lectura/recorrido).
- [`program.ts`](../../src/cli/program.ts): Commander con `exitOverride()`; cada subcomando
  (`init`/`validate`/`inspect`) registra su `action`. `runCli` traduce el resultado a código con
  `exitCodeForOutcome(r.outcome)`; ayuda/version → 0; errores de uso del parser → 3
  (`USAGE_ERROR_EXIT`); **excepción inesperada se relanza** al entrypoint.
- [`io.ts`](../../src/cli/io.ts): `CliIO { out(text), err(text) }` — abstracción de streams
  inyectable (capturable en pruebas).
- [`exit-codes.ts`](../../src/cli/exit-codes.ts): `exitCodeForOutcome` (valid→0, complete-invalid→3,
  partial→4, not-found→5, read-error→6); `INTERNAL_ERROR_EXIT = 70`. **Única** tabla del binario
  (ADR-0006). No se crea otra.
- [`index.ts`](../../src/cli/index.ts) (entrypoint): compone deps reales, ejecuta `runCli`, fija
  `process.exitCode`; el `catch` final escribe `Error interno: …` a `err` y fija `70`.

### Modelos de dominio relevantes (formas exactas)

- [`InspectedValue<T>`](../../src/domain/analysis/inspected-value.ts): `{ value?: T; trust: Trust }`
  con `Trust = "valid"|"recovered"|"untrusted"|"unavailable"`. **`value` es opcional y se OMITE
  cuando `trust === "unavailable"`** → el mapper JSON debe normalizar a `value: null`.
- [`AnalysisIssue`](../../src/domain/analysis/analysis-issue.ts): `{ code, message, path?, severity,
  document?, context? }`. `document`/`path` opcionales; `context` **no debe exponerse** en v1.
- [`TokenNodeSummary`](../../src/domain/analysis/token-node-summary.ts),
  [`InspectionStatistics`](../../src/domain/analysis/inspection-statistics.ts),
  [`AnalysisLimitsResult`](../../src/domain/traversal/limits.ts),
  [`FileInspection`](../../src/domain/analysis/design-system-inspection.ts) (`sizeBytes?` opcional —
  deuda técnica conocida: no se propaga; el mapper la normaliza a `null`).
- [`HostError`](../../src/application/ports.ts): `{ code: HostErrorCode; message: string; path? }`.

## 2. Estrategia de emisión JSON — alternativas

| Opción | Descripción | Veredicto |
|---|---|---|
| **A — Reporter JSON** | Un `JsonValidationReporter`/`JsonInspectionReporter` que implementa el puerto existente, ignora eventos intermedios y, en `completed(result)`, mapea→serializa→escribe **una vez** en `io.out`. | **ELEGIDA** |
| B — Reporter silencioso + serializar el retorno en el comando | El caso de uso usa un reporter mudo; el comando serializa el resultado retornado. | Rechazada |
| C — Otra | — | No aplica |

**Por qué A**: (1) `completed(result)` ya recibe el resultado público completo — insumo exacto del
envelope; (2) **una sola escritura**, idéntica disciplina que el reporter textual; (3) **cero
cambios** en los casos de uso (ya invocan `completed(result)`); (4) la composición solo intercambia
el reporter (sin instanciar dos que escriban); (5) simetría total con el reporter textual → pruebas
deterministas con el mismo estilo de *recording reporters*; (6) el dominio/aplicación no aprenden
nada de streams. La Opción B duplicaría el punto de escritura (comando + reporter) y obligaría al
comando a conocer la serialización; A lo evita. Decisión en **ADR-0012**.

## 3. Error interno y coherencia del envelope (decisión)

El error interno (`exit 70`) **no es un outcome de dominio**: ocurre cuando el analyzer lanza una
excepción inesperada que se propaga más allá del caso de uso. En ese flujo, `completed()` **nunca se
alcanza** → el reporter JSON no escribe nada → **stdout queda vacío**, como exige la spec.

Por tanto el envelope de error interno lo produce la **capa CLI** (no el reporter, no el dominio): el
handler del comando, en modo JSON, envuelve la ejecución; ante excepción inesperada escribe el
envelope de error interno en `io.err` y devuelve `70`. El `catch` genérico del entrypoint permanece
como red de seguridad **no-JSON** de último recurso. Decisión en **ADR-0013**.

### Resolución de la forma del envelope (tensión spec ↔ recomendación del prompt)

El prompt de plan **recomienda** anidar el error en `result.error` para preservar siempre cuatro
campos. Sin embargo, la **especificación** (autoridad) muestra `error` de **nivel superior**:

- US8 (acceptance): `{ formatVersion, command, outcome: "internal-error", error: { code, message } }`.
- FR-009: para `not-found` con `hostError`, el envelope **incluye un campo `error`** con `code`/`message`.

No se modifica la spec en silencio. **Decisión adoptada (documentada como excepción explícita
sancionada por el propio prompt)**: el envelope tiene los **cuatro campos base siempre presentes**
(`formatVersion`, `command`, `outcome`, `result`) y, **solo** en los outcomes donde el contrato lo
declara (`not-found` e `internal-error`), un campo adicional `error`:

- `valid`/`complete-invalid`/`partial`/`read-error` → `result: <DTO>` (sin `error`).
- `not-found` → `result: null`, `error: { code, message } | null` (mapea `hostError`).
- `internal-error` (solo CLI) → `result: null`, `error: { code: "internal-cli-error", message }`.

Esto satisface FR-004 (cuatro campos base), FR-009 (error en not-found), US8 (error superior en
internal-error) y la null-policy (FR-017: omitir solo campos que el contrato declara específicos del
outcome). **No hay contradicción real** que bloquee `/speckit-tasks`.

## 4. Serialización determinista

`serializeJsonV1(envelope) = JSON.stringify(envelope, null, 2) + "\n"`. Función **pura**.

- Dos espacios de indentación + newline final (FR-022).
- Un único documento; sin BOM, sin ANSI, sin texto humano (FR-019).
- Orden de propiedades = orden de **construcción** del objeto DTO (los mappers construyen las claves
  en orden canónico fijo → bytes deterministas).
- Orden de arrays = el que ya trae el modelo (documentos, issues, paths, `limits.hits`); **no** se
  reordena (FR-024). `byType` preserva el orden de inserción del recorrido (no se ordena por clave).
- Sin `--compact`/`--pretty`, sin librería de claves ordenadas, sin JSONL.

**JSON-safe**: los DTO solo contienen `string | number | boolean | null | arrays | objetos planos`.
Prohibidos `undefined`, `NaN`, `Infinity`, `BigInt`, funciones, símbolos. Garantía estructural: los
mappers normalizan todo opcional de dominio a `null` (o a `[]`/`{}`), de modo que `JSON.stringify`
**nunca** depende de la omisión accidental de `undefined`. No se añade dependencia para esto.

## 5. Commander — flag local por subcomando

`--json` se añade como **opción booleana local** (`default false`) a `validate` e `inspect`, leída en
la acción vía `cmd.opts().json`. **No** se crea un flag global (evitaría `neuraz-ds --json init` y
otros acoplamientos). `init` **no** recibe `--json`. Un `--json` desconocido en otros contextos sigue
la política de error de uso existente (exit 3). El flag solo surte efecto **después** de que Commander
acepte los argumentos (FR-035).

## 6. Selección de modo (texto vs JSON)

Exactamente **un** adapter por ejecución: sin `--json` → reporter textual existente; con `--json` →
reporter JSON nuevo. La acción del subcomando lee `opts.json` y construye/usa el conjunto de
dependencias correspondiente (la composición ofrece una variante JSON análoga a las actuales). El
caso de uso se invoca **igual** en ambos modos (mismo `runValidate`/`runInspect`, mismo
`createBoundAnalyze`). No se instancian dos reporters que puedan escribir.

## 7. Streams

- Outcomes esperados (`valid|complete-invalid|partial|not-found|read-error`) → **stdout** un JSON,
  **stderr** vacío, incluso con exit ≠ 0.
- Error interno → **stdout vacío**, **stderr** un JSON seguro, exit 70.
- Error de uso de Commander → política existente (sin cambios; no se convierte a JSON en v1).

## 8. Compatibilidad y versión de formato

`JSON_FORMAT_VERSION = "1.0.0"`, constante inmutable en la capa de aplicación, **independiente** de
`package.version`. Semver del **contrato**: patch = fix de serialización; minor = campos opcionales
nuevos; major = quitar/renombrar/retipar/cambiar enum o cardinalidad. Documentado, no enforced en v1.

## 9. Sin nuevas dependencias

`JSON.stringify` nativo cubre todo. No se añaden librerías (ni de orden de claves, ni de validación de
esquema JSON). No se investiga foundations, DTCG adicional, MCP ni Style Dictionary (fuera de alcance).
