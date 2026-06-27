# Data Model — 003-json-output

DTO públicos JSON v1, enums, cardinalidades, null-policy, invariantes y mapeo desde los resultados
públicos existentes. **Todos los DTO son tipos de transporte** (no de dominio): viven en la capa de
aplicación, son puros y JSON-safe. No se serializa ningún objeto de dominio directamente.

> Convención: `T | null` = campo **estable siempre presente** (puede valer `null`). Un campo se
> **omite** solo si el contrato lo declara específico de un `outcome` (p. ej. `error` en `not-found`/
> `internal-error`). Nunca se emite `undefined`.

## 1. Constante de versión

```ts
export const JSON_FORMAT_VERSION = "1.0.0"; // inmutable; independiente de package.version
```

## 2. Enums

```ts
type JsonCommand = "validate" | "inspect";
type JsonExpectedOutcome = "valid" | "complete-invalid" | "partial" | "not-found" | "read-error";
type JsonInternalOutcome = "internal-error";           // solo capa CLI; NO es outcome de dominio
type Trust = "valid" | "recovered" | "untrusted" | "unavailable"; // reutiliza dominio
type Severity = "error" | "warning";
type StructuralState = "not-initialized" | "partial" | "complete-invalid" | "complete-valid";
type TypeOrigin = "own" | "alias" | "group" | "none";
type NodeKind = "concrete" | "alias";
type NodeTrust = "valid" | "recovered" | "untrusted";
type AliasState = "valid" | "missing" | "to-group" | "cyclic" | "malformed" | "n/a";
```

## 3. DTO atómicos

```ts
interface JsonInspectedValueV1<T> {
  readonly value: T | null;        // SIEMPRE presente; null cuando trust === "unavailable"
  readonly trust: Trust;           // SIEMPRE presente
}

interface JsonIssueV1 {
  readonly severity: Severity;     // SIEMPRE
  readonly code: string;           // SIEMPRE — código estable (jamás texto AJV/Zod)
  readonly message: string;        // SIEMPRE
  readonly document: string | null;// null si se desconoce
  readonly path: string | null;    // null si se desconoce
  // PROHIBIDO en v1: context, stack, objetos Error, errores crudos de librerías
}

interface JsonHostV1 {
  readonly root: string;                    // ruta absoluta del host (modelo público)
  readonly designSystemPath: string | null; // ruta absoluta del DS, o null
}

interface JsonLimitHitV1 { readonly limit: string; readonly detail: string; }
interface JsonLimitsV1 {
  readonly reached: boolean;
  readonly partial: boolean;
  readonly hits: readonly JsonLimitHitV1[]; // orden preservado del modelo
}

interface JsonSummaryV1 {
  readonly errors: number;
  readonly warnings: number;
  readonly tokens: number | null;  // null cuando el modelo no aporta conteo de tokens
}

interface JsonErrorV1 { readonly code: string; readonly message: string; } // sin path/stack
```

## 4. Proyección de validación (compartida)

`JsonValidationV1` proyecta `ValidationReport` (sin `host`; el host vive en el nivel del result).
La reusa tanto el result de `validate` como el campo `validation` de `inspect`.

```ts
interface JsonValidationV1 {
  readonly valid: boolean;
  readonly structuralState: StructuralState;
  readonly checkedDocuments: readonly string[];
  readonly uncheckedDocuments: readonly string[];
  readonly summary: JsonSummaryV1;
  readonly errors: readonly JsonIssueV1[];
  readonly warnings: readonly JsonIssueV1[];
  readonly limits: JsonLimitsV1;
}
```

## 5. Result de `validate`

```ts
interface JsonValidateResultV1 {
  readonly host: JsonHostV1 | null;
  readonly structuralState: StructuralState;
  readonly valid: boolean;
  readonly checkedDocuments: readonly string[];
  readonly uncheckedDocuments: readonly string[];
  readonly summary: JsonSummaryV1;
  readonly errors: readonly JsonIssueV1[];
  readonly warnings: readonly JsonIssueV1[];
  readonly limits: JsonLimitsV1;
}
// = { host } ⊕ JsonValidationV1  (mismo orden de claves: host primero, luego la proyección)
```

## 6. Result de `inspect`

```ts
interface JsonFileInspectionV1 {
  readonly relativePath: string;
  readonly kind: string;            // FileKind ("file"|"directory"|"symlink"|"absent"|…)
  readonly sizeBytes: number | null;// null (deuda técnica conocida: no se propaga)
  readonly readable: boolean;
}

interface JsonTokenNodeV1 {
  readonly path: string;
  readonly declaredType: string | null;
  readonly effectiveType: string | null;
  readonly typeOrigin: TypeOrigin;
  readonly typeSourcePath: string | null;
  readonly kind: NodeKind;
  readonly aliasTarget: string | null;
  readonly aliasState: AliasState;
  readonly description: string | null;
  readonly depth: number;
  readonly trust: NodeTrust;
}

interface JsonIdentityV1 {
  readonly name: JsonInspectedValueV1<string>;
  readonly slug: JsonInspectedValueV1<string>;
  readonly version: JsonInspectedValueV1<string>;
  readonly description: JsonInspectedValueV1<string>;
}

interface JsonSchemaVersionsV1 {
  readonly config: JsonInspectedValueV1<string>;
  readonly manifest: JsonInspectedValueV1<string>;
  readonly formatVersion: JsonInspectedValueV1<string>;
}

interface JsonFilesV1 {
  readonly expected: readonly string[];
  readonly present: readonly JsonFileInspectionV1[];
  readonly missing: readonly string[];
}

interface JsonTokensV1 {
  readonly total: number;
  readonly groups: number;
  readonly concreteValues: number;
  readonly aliases: number;
  readonly byType: Readonly<Record<string, number>>; // orden de inserción del recorrido (no se ordena)
  readonly maxDepth: number;
  readonly aliasIssues: number;
  readonly paths: readonly JsonTokenNodeV1[];          // TODOS los nodos — SIN cota de 200
}

interface JsonInspectResultV1 {
  readonly host: JsonHostV1 | null;
  readonly structuralState: StructuralState;
  readonly identity: JsonIdentityV1 | null;        // null si el modelo no trae identity
  readonly schemaVersions: JsonSchemaVersionsV1 | null;
  readonly files: JsonFilesV1;
  readonly tokens: JsonTokensV1 | null;            // null si el modelo no trae tokens
  readonly validation: JsonValidationV1;
  readonly limits: JsonLimitsV1;
}
```

## 7. Envelopes (unión discriminada por `outcome`)

```ts
type JsonValidateEnvelopeV1 =
  | { readonly formatVersion: "1.0.0"; readonly command: "validate";
      readonly outcome: "valid" | "complete-invalid" | "partial" | "read-error";
      readonly result: JsonValidateResultV1 }
  | { readonly formatVersion: "1.0.0"; readonly command: "validate";
      readonly outcome: "not-found";
      readonly result: null; readonly error: JsonErrorV1 | null };

type JsonInspectEnvelopeV1 =
  | { readonly formatVersion: "1.0.0"; readonly command: "inspect";
      readonly outcome: "valid" | "complete-invalid" | "partial" | "read-error";
      readonly result: JsonInspectResultV1 }
  | { readonly formatVersion: "1.0.0"; readonly command: "inspect";
      readonly outcome: "not-found";
      readonly result: null; readonly error: JsonErrorV1 | null };

// CLI-only. NUNCA aparece en tipos de casos de uso headless.
type JsonInternalErrorEnvelopeV1 = {
  readonly formatVersion: "1.0.0";
  readonly command: JsonCommand;
  readonly outcome: "internal-error";
  readonly result: null;
  readonly error: JsonErrorV1; // { code: "internal-cli-error", message }
};
```

Orden de claves del envelope (determinismo): `formatVersion`, `command`, `outcome`, `result`,
`error` (cuando aplica).

## 8. Tabla de mapeo: campo interno → DTO → transformación → ausencia

| Origen (dominio/aplicación) | Campo DTO | Transformación | Ausencia |
|---|---|---|---|
| `result.host: AnalysisHost \| null` | `host: JsonHostV1 \| null` | copia `{root, designSystemPath}` | `null` |
| `report.valid` | `valid` | identidad | — (siempre) |
| `report.structuralState` | `structuralState` | identidad | — |
| `report.checkedDocuments` | `checkedDocuments` | copia array (orden) | `[]` |
| `report.uncheckedDocuments` | `uncheckedDocuments` | copia array (orden) | `[]` |
| `report.summary.{errors,warnings}` | `summary.{errors,warnings}` | identidad | — |
| `report.summary.tokens?` | `summary.tokens` | `?? null` | `null` |
| `report.errors: AnalysisIssue[]` | `errors: JsonIssueV1[]` | `mapIssue` (orden) | `[]` |
| `report.warnings: AnalysisIssue[]` | `warnings: JsonIssueV1[]` | `mapIssue` (orden) | `[]` |
| `report.limits: AnalysisLimitsResult` | `limits: JsonLimitsV1` | copia `{reached,partial,hits}` | hits `[]` |
| `AnalysisIssue.code/message/severity` | `code/message/severity` | identidad | — |
| `AnalysisIssue.document?` | `document` | `?? null` | `null` |
| `AnalysisIssue.path?` | `path` | `?? null` | `null` |
| `AnalysisIssue.context?` | — | **descartado** (no v1) | n/a |
| `InspectedValue<T>{value?,trust}` | `JsonInspectedValueV1<T>` | `{ value: value ?? null, trust }` | `value:null` |
| `InspectedIdentity` (`undefined`) | `identity` | objeto con 4 campos normalizados | `null` |
| `InspectedIdentity.name?` (ausente) | `identity.name` | `{value:null, trust:"unavailable"}` | `{value:null,trust:"unavailable"}` |
| `InspectedSchemaVersions` | `schemaVersions` | 3 campos normalizados | `null` |
| `InspectedFiles` | `files` | copia `expected/missing`; `present` → `mapFile` | — |
| `FileInspection.sizeBytes?` | `files.present[].sizeBytes` | `?? null` | `null` |
| `TokensInspection` (`undefined`) | `tokens` | estadísticas + `paths` → `mapNode` | `null` |
| `TokensInspection.paths` | `tokens.paths` | `mapNode` por nodo (**todos**) | `[]` |
| `TokenNodeSummary.*` | `JsonTokenNodeV1.*` | identidad (campos ya `string\|null`) | — |
| `inspection.validation: ValidationReport` | `validation: JsonValidationV1` | `mapValidation` (sin host) | — |
| `result.hostError: HostError \| null` (not-found) | `error: JsonErrorV1 \| null` | `{code, message}` (sin `path`) — **`hostError` no se puebla en v1 → siempre `null`** (campo reservado) | `null` |
| excepción inesperada (CLI) | `error: JsonErrorV1` | `{code:"internal-cli-error", message seguro}` | n/a |

## 9. Invariantes

1. Los cuatro campos base (`formatVersion`, `command`, `outcome`, `result`) están **siempre**
   presentes en todo envelope (incluido `not-found` e `internal-error`, con `result: null`).
2. `formatVersion === "1.0.0"` en v1.
3. `command` coincide con el comando ejecutado.
4. `outcome` ∈ enum esperado para outcomes de dominio; `"internal-error"` solo en el envelope CLI.
5. Ningún valor `undefined`/`NaN`/`Infinity`/`BigInt`/función/símbolo en el DTO.
6. `inspect.tokens.paths.length === inspect.tokens.total` (sin cota 200).
7. Orden de arrays e `byType` preservado del modelo; sin reordenamiento.
8. `JsonInspectedValueV1.value` siempre presente (posible `null`); `trust` siempre presente.
9. Salida byte-determinista para la misma entrada.

## 10. Campos prohibidos (seguridad del contrato)

`context` de issues, stack traces, objetos `Error`, errores crudos AJV/Zod, contenido de archivos,
objetos de configuración completos, `cwd`/home adicionales, variables de entorno, timestamps, UUID,
duraciones, hostname, datos del entorno.

## 11. Compatibilidad futura

- **Minor** (`1.x.0`): añadir campos **opcionales** nuevos (los consumidores deben tolerar claves
  desconocidas).
- **Major** (`x.0.0`): quitar/renombrar/retipar un campo, cambiar cardinalidad o un valor de enum.
- **Patch** (`1.0.x`): correcciones de serialización sin cambio de forma.

Sin enrutamiento multi-versión en v1; política documentada, no enforced.
