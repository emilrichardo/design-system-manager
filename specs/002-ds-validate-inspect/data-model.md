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
| `errors` | `readonly Issue[]` | acumulados (categoría host/structure/read/validation/limit) |
| `warnings` | `readonly Issue[]` | acumulados |
| `limits` | `AnalysisLimitsResult` | qué límites se alcanzaron |
| `valid` | `boolean` | sin errores críticos y análisis completo |

### ParsedDocument
`{ relativePath; exists: boolean; kind: ManagedFileKind; parsed?: unknown; trust: "valid"|"recovered"|"unavailable"; issues: Issue[] }`.

### TokenNodeSummary (dominio)
| Campo | Tipo | Notas |
|---|---|---|
| `path` | `string` | ruta canónica `a.b.c` (orden de inserción JSON) |
| `declaredType` | `string \| null` | `$type` propio |
| `effectiveType` | `string \| null` | tras herencia (own→alias→grupo); `null` si indeterminable |
| `typeOrigin` | `own` \| `alias` \| `group:<ruta>` \| `none` | |
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

### Issue (reusado de `001`, mismos campos)
`{ code: string; message: string; path?: string }`. 002 añade severidad y documento vía un envoltorio
de reporte (o extiende `Issue` con `severity`/`document` — decisión menor en implementación, sin romper
001). Códigos estables nuevos (ADR-0008): `dtcg-type-not-deeply-inspected` (warning),
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
