# Data Model — ds-validate-inspect (Phase 1)

Modelos de dominio puros (sin Node/fs/zod/ajv/CLI). Tipos TS derivados en `contracts/`. Reutiliza
`Issue`, `ValidationResult`, `PreviousState`, `HostRoot` de `001`.

## Confiabilidad (transversal)

```text
present     — el dato existe en el documento
valid       — el dato existe y cumple su contrato
recovered   — el dato se pudo leer parcialmente de un documento inválido
untrusted   — el dato existe pero no es confiable (p. ej. $type no reconocido)
unavailable — el dato no se pudo obtener
```

`InspectedValue<T> = { value?: T; trust: "valid" | "recovered" | "untrusted" | "unavailable" }`.
La confiabilidad se marca **por sección/valor** (no se envuelve cada primitivo innecesariamente).

## Entidades

### DesignSystemAnalysis (modelo interno común — dominio)
Resultado de la tubería única; del que se derivan validate e inspect.

| Campo | Tipo | Notas |
|---|---|---|
| `host` | `{ root: string; designSystemPath: string \| null }` | de `resolveHostRoot` |
| `presence` | presencia administrada (reusa `001`) | present/missing + tipos |
| `structuralState` | `not-initialized` \| `partial` \| `complete-invalid` \| `complete-valid` | |
| `documents` | `Record<rel, ParsedDocument>` | por documento: raw?, parsed?, trust, issues |
| `nodes` | `readonly TokenNodeSummary[]` | tokens hallados |
| `statistics` | `InspectionStatistics` | conteos |
| `errors` | `readonly AnalysisIssue[]` | acumulados (categoría host/structure/read/validation/limit) |
| `warnings` | `readonly AnalysisIssue[]` | acumulados |
| `limits` | `AnalysisLimitsResult` | qué límites se alcanzaron |
| `valid` | `boolean` | sin errores críticos y análisis completo |

### ParsedDocument
`{ relativePath; exists: boolean; kind: ManagedFileKind; parsed?: unknown; trust: "valid"|"recovered"|"unavailable"; issues: AnalysisIssue[] }`.

### TokenNodeSummary (dominio)
| Campo | Tipo | Notas |
|---|---|---|
| `path` | `string` | ruta canónica `a.b.c` (orden de inserción JSON) |
| `declaredType` | `string \| null` | `$type` propio |
| `effectiveType` | `string \| null` | precedencia C1 (declarado→alias→grupo); `null` si indeterminable (incl. ciclo/alias roto) |
| `typeOrigin` | `own` \| `alias` \| `group` \| `none` | origen del tipo efectivo |
| `typeSourcePath` | `string \| null` | ruta del grupo fuente cuando `typeOrigin = "group"` (C5); si no, `null` |
| `kind` | `concrete` \| `alias` | clase del `$value` |
| `aliasTarget` | `string \| null` | ruta destino si alias |
| `aliasState` | `valid` \| `missing` \| `to-group` \| `cyclic` \| `malformed` \| `n/a` | |
| `description` | `string \| null` | `$description` |
| `depth` | `number` | profundidad (raíz=0; token = nº de segmentos) |
| `trust` | `valid` \| `recovered` \| `untrusted` | `untrusted` si `$type` no reconocido |

### InspectionStatistics (dominio)
`total` (tokens), `groups`, `concreteValues`, `aliases`, `byType: Record<string, number>` (tipo
**efectivo**; categoría explícita `"(untyped)"` para sin tipo y se cuenta cada tipo no reconocido
bajo su literal pero marcado untrusted), `maxDepth`, `aliasIssues` (missing/to-group/cyclic/malformed).

**Reglas de conteo** (ADR-0010):
- **grupo**: nodo objeto sin `$value` propio y distinto de la **raíz** (la raíz del documento NO se
  cuenta como grupo). Grupo vacío → cuenta como grupo + warning `dtcg-empty-group`.
- **token**: nodo objeto con `$value` propio.
- **alias**: token cuyo `$value` es referencia `{...}` (sintáctica). `concreteValues = total − aliases`.
- **profundidad**: raíz = 0; cada nivel +1; `depth` del token = nº de segmentos de su ruta.

### ValidationReport (vista de validez — dominio)
| Campo | Tipo |
|---|---|
| `valid` | `boolean` |
| `structuralState` | igual que análisis |
| `checkedDocuments` | `string[]` |
| `uncheckedDocuments` | `string[]` |
| `errors` | `readonly Issue[]` |
| `warnings` | `readonly Issue[]` |
| `limits` | `AnalysisLimitsResult` |
| `summary` | `{ errors: number; warnings: number; tokens?: number }` |

### DesignSystemInspection (vista descriptiva — dominio; ADR-0007)
```text
{ host:{root, designSystemPath|null};
  structuralState;
  identity?: { name?:InspectedValue<string>; slug?:…; version?:…; description?:… };
  schemaVersions?: { config?:InspectedValue<string>; manifest?:InspectedValue<string>; formatVersion?:InspectedValue<string> };
  files: { expected:string[]; present:FileInspection[]; missing:string[] };
  tokens?: { total; groups; concreteValues; aliases; byType; paths:TokenNodeSummary[]; maxDepth };
  validation: ValidationReport;     // inspect INCLUYE la validación
  limits: AnalysisLimitsResult }
```
`FileInspection = { relativePath; kind: ManagedFileKind; sizeBytes?: number; readable: boolean }`.

### AnalysisLimitsResult (dominio)
`{ reached: boolean; hits: Array<{ limit: "file-size"|"total-size"|"depth"|"nodes"|"path-len"|"alias-len"|"issues"; detail: string }>; partial: boolean }`.

### Issue (001) y AnalysisIssue (002 — forma canónica, C4)
`Issue` de `001` es `{ code: string; message: string; path?: string }` y **no se modifica**. 002 define
un **tipo aditivo retrocompatible** (decisión registrada: tipo especializado, no mutación de `Issue`):

```ts
type Severity = "error" | "warning";
type ManagedDocument = "config" | "manifest" | "tokens" | "host" | "structure";
interface AnalysisIssue extends Issue {        // estructuralmente compatible con Issue de 001
  readonly severity: Severity;                 // error invalida; warning no
  readonly document?: ManagedDocument;         // documento afectado cuando se conoce
  readonly context?: Record<string, unknown>;  // contexto seguro opcional (sin secretos)
}
```

- `AnalysisIssue` **es un** `Issue` (extiende): cualquier consumidor de `001` lo acepta sin migrar.
- `code` permanece estable; **nunca** se usa el texto de AJV/Zod como código.
- `path` se hereda de `Issue` (ruta dentro del documento). `document`/`context` son opcionales.
- `ValidationReport`/`DesignSystemAnalysis` usan `AnalysisIssue` en `errors`/`warnings`.
- **No** se introduce un segundo tipo llamado `Issue`; el nombre especializado es `AnalysisIssue`.

Códigos estables nuevos (ADR-0008): `dtcg-type-not-deeply-inspected` (warning),
`dtcg-type-unrecognized` (error), `dtcg-type-undeterminable` (error), `dtcg-empty-group` (warning),
`dtcg-description-missing` (warning), `config-path-escape` (error), `limit-*-exceeded` (error),
`read-failed` (error), `coherence-*` (error). **No** se usan textos de AJV/Zod como códigos.

## Relaciones

```text
analyzeExistingDesignSystem ──▶ DesignSystemAnalysis
DesignSystemAnalysis ──(proyección)──▶ ValidationReport         (validateDesignSystem)
DesignSystemAnalysis ──(proyección)──▶ DesignSystemInspection   (inspectDesignSystem, incluye ValidationReport)
TokenNodeSummary[] + reglas ──▶ InspectionStatistics
```

## Estados → resultado (validate / inspect) y exit code

| structuralState | validate | inspect | exit |
|---|---|---|---|
| not-initialized | inválido / no localizable | informe "no existe DS administrado" | 5 |
| partial | inválido (errores estructurales) | informe recuperable (present/missing/incompat) | 4 |
| complete-invalid | inválido (errores) | informe con datos recuperados + no confiables | 3 |
| complete-valid | válido | inspección completa | 0 |
| (error de lectura/fs) | — | — | 6 |

> `not-initialized` → exit **5** (config administrada no localizable), coherente con la tabla común
> (host/config no localizable). Falta de `package.json`/raíz no resoluble también → 5.
