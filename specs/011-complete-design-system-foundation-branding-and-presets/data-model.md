# Data Model: Complete Design System Foundation, Branding and Presets

**Feature**: `011-complete-design-system-foundation-branding-and-presets` | **Date**: 2026-07-01

Todas las entidades son DTOs inmutables (`readonly`), JSON-safe, sin `Error`/stack, sin rutas absolutas —
mismo estilo que `TokenMutationDiffV1`/`DesignSystemAnalysis` de `008`/`002`. `V1` en el nombre versiona
el contrato público, independiente de `package.version` (mismo patrón que los envelopes JSON de `003`).

## Storage layout (decisión, ver `research.md`)

```text
design-system/
├── design-system.json
├── tokens/
│   └── base.tokens.json          # única fuente DTCG; capa brand = rol de metadata, no archivo nuevo
├── assets/
│   ├── assets.json
│   └── ...                       # sin cambios de 007
├── brand/                        # NUEVO — headless, transaccional, separado de tokens y assets
│   ├── brand.json                # BrandProfileV1
│   ├── voice-and-tone.json       # BrandVoiceV1
│   ├── visual-language.json      # BrandVisualLanguageV1 (+ BrandAssetReferenceV1[])
│   └── usage-guidelines.json     # BrandUsageRuleV1[]
└── build/
    └── ...                       # sin cambios de forma; se añaden artefactos de brand (FR-018)
```

`components/`, `patterns/`, `templates/` y `candidates/` (mencionadas conceptualmente en el brief) **no**
se crean como directorios en `011` — quedan reservadas para `012`/`013`/`014` con su propio contrato; no
se introduce una carpeta sin contrato claro (mandato explícito del brief §4).

## Token layer metadata (extiende `$extensions`, no reemplaza DTCG)

```json
{
  "$extensions": {
    "ar.neuraz.design-system": {
      "schemaVersion": 1,
      "layer": "component",
      "brandRole": null,
      "component": "button",
      "part": "container",
      "variant": "primary",
      "state": "hover",
      "size": "medium",
      "provenance": { "status": "observed", "confidence": 0.92 }
    }
  }
}
```

### `TokenLayerV1`

| Field | Type | Notes |
|---|---|---|
| `layer` | `"primitive" \| "semantic" \| "component"` | Obligatorio cuando el token participa del modelo de capas; ausente = comportamiento `001`–`010` sin cambios (compatibilidad). |
| `brandRole` | `"brand" \| null` | Rol adicional sobre `primitive`; nunca coexiste con `layer: "semantic"` o `"component"`. |
| `component`, `part`, `variant`, `state`, `size` | `string \| null` | Solo aplican cuando `layer: "component"`; el path NUNCA es la fuente de verdad (brief §12: "No dependas exclusivamente del path"). |
| `provenance` | `TokenProvenanceV1 \| null` | Reutiliza el mismo vocabulario de estado que `BrandEvidenceV1` (ver abajo) para tokens importados/inferidos a futuro. |

### `TokenProvenanceV1`

| Field | Type | Notes |
|---|---|---|
| `status` | `"official" \| "observed" \| "inferred" \| "generated" \| "placeholder" \| "user-confirmed"` | Nunca se asume `official`/`user-confirmed` por defecto. |
| `confidence` | `number \| null` | `0..1`; `null` cuando `status` es `official`/`user-confirmed` (no aplica confianza a un hecho confirmado). |

## Brand System entities

### `BrandProfileV1` (`brand/brand.json`)

| Field | Type | Notes |
|---|---|---|
| `formatVersion` | `"1.0.0"` | Igual patrón que envelopes JSON de `003`. |
| `name`, `shortName` | `string \| null` | — |
| `description` | `string \| null` | Narrativo corto. |
| `purpose`, `mission`, `vision` | `string \| null` | Narrativo, puede ser Markdown. |
| `values` | `readonly string[]` | — |
| `positioning` | `string \| null` | Narrativo largo (Markdown permitido). |
| `audiences` | `readonly BrandAudienceV1[]` | — |
| `personality` | `BrandPersonalityV1 \| null` | — |
| `principles` | `readonly BrandPrincipleV1[]` | — |
| `promise`, `differentiators` | `string \| null`, `readonly string[]` | — |
| `status` | `"complete" \| "partial" \| "placeholder" \| "needs-user-input"` | Derivado, no editable directamente (ver `BrandQualitySummaryV1`). |

### `BrandAudienceV1`

`{ name: string; description: string | null; needs: readonly string[] }`

### `BrandPersonalityV1`

`{ attributes: readonly string[]; narrative: string | null }`

### `BrandPrincipleV1`

`{ id: string; statement: string; rationale: string | null; evidence: BrandEvidenceV1 | null }`

### `BrandVoiceV1` (`brand/voice-and-tone.json`)

| Field | Type | Notes |
|---|---|---|
| `voicePrinciples` | `readonly string[]` | — |
| `toneDimensions` | `readonly BrandToneDimensionV1[]` | — |
| `terminology` | `{ preferred: readonly string[]; forbidden: readonly string[] }` | — |
| `microcopyGuidance`, `errorMessageGuidance`, `ctaGuidance` | `string \| null` | Narrativo. |

### `BrandToneDimensionV1`

| Field | Type | Notes |
|---|---|---|
| `axis` | `string` | p. ej. `"formal-informal"`, `"technical-simple"`, `"serious-playful"`, `"direct-editorial"`. |
| `position` | `string \| null` | Descripción de dónde cae la marca en el eje. |
| `examples` | `{ do: readonly string[]; dont: readonly string[] }` | Nunca vacío si el eje está `complete`. |

### `BrandVisualLanguageV1` (`brand/visual-language.json`)

| Field | Type | Notes |
|---|---|---|
| `logoVariants` | `readonly BrandAssetReferenceV1[]` | Cada uno con `variantRole: "primary" \| "monochrome" \| "horizontal" \| "vertical" \| "dark-background"`. |
| `clearSpace`, `minimumSize` | `string \| null` | Narrativo/medida. |
| `backgroundCompatibility`, `incorrectUsage` | `readonly BrandUsageRuleV1[]` | — |
| `brandColors`, `supportingColors` | `readonly string[]` (paths de token `color.brand.*`) | Referencian tokens reales, nunca hex embebido. |
| `typographicRoles` | `readonly { role: string; tokenPath: string }[]` | p. ej. `{role:"heading", tokenPath:"typography.font-family.heading"}`. |
| `iconStyle`, `illustrationStyle`, `photographyStyle`, `imageTreatment`, `compositionGuidance` | `string \| null` | Narrativo. |
| `shapeLanguage`, `borderLanguage`, `shadowLanguage`, `motionLanguage` | `string \| null` | Narrativo; referencian tokens `radius.*`/`border.*`/`shadow.*`/`motion.*` por texto libre, no por FK estricta (son guías, no reglas mecánicas). |

### `BrandAssetReferenceV1`

| Field | Type | Notes |
|---|---|---|
| `logicalPath` | `string` | DEBE existir en `assets.json` de `007`; se valida, nunca se copia. |
| `variantRole` | `string \| null` | p. ej. `primary`, `monochrome`, `heading`, `body`. |
| `required` | `boolean` | Si `true` y no hay `logicalPath` resuelto → aparece en `BrandQualitySummaryV1.missingAssets`. |
| `resolution` | `"resolved" \| "missing" \| "placeholder"` | Derivado contra el inventario de `007`. |

### `BrandUsageRuleV1` (`brand/usage-guidelines.json`)

`{ id: string; kind: "do" | "dont"; description: string; relatedAsset: string | null }`

### `BrandEvidenceV1`

| Field | Type | Notes |
|---|---|---|
| `source` | `string \| null` | URL, archivo, o descripción de origen. |
| `evidence` | `string \| null` | Extracto/observación puntual. |
| `confidence` | `number \| null` | `0..1`. |
| `author` | `string \| null` | — |
| `license` | `string \| null` | Nunca asumido; `null` explícito si no se declaró. |
| `origin` | `string \| null` | — |
| `date` | `string \| null` | ISO 8601. |
| `status` | `TokenProvenanceV1["status"]` | Mismo vocabulario que la provenance de tokens. |
| `reviewState` | `"pending" \| "approved" \| "rejected"` | Nunca implícito `approved`. |

### `BrandQualitySummaryV1` (derivado, no persistido — proyección de `neuraz-ds foundations`/`quality`)

| Field | Type | Notes |
|---|---|---|
| `overallStatus` | `"complete" \| "partial" \| "absent" \| "placeholder" \| "needs-user-input"` | — |
| `missingAssets` | `readonly { variantRole: string; reason: string }[]` | Nunca se autogenera; solo se reporta. |
| `fieldsCompleted`, `fieldsTotal` | `number` | Para render de progreso. |
| `provenanceBreakdown` | `Record<TokenProvenanceV1["status"], number>` | — |

## Token layer catalog (extiende foundations de `004`, no lo reemplaza)

### `ComponentTokenGroupV1` (proyección de Viewer, no un documento nuevo)

| Field | Type | Notes |
|---|---|---|
| `component` | `string` | p. ej. `"button"`. |
| `parts` | `readonly string[]` | p. ej. `["container", "label", "icon"]`. |
| `variants` | `readonly string[]` | Solo las declaradas, nunca cartesiano completo. |
| `states` | `readonly string[]` | — |
| `sizes` | `readonly string[]` | — |
| `tokens` | `readonly { path: string; part: string; variant: string \| null; state: string \| null; size: string \| null }[]` | — |

## Preset y pack model (extiende `005-presets`, mismo motor add-only)

### `PresetPackV1`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | p. ej. `"commerce"`, `"dashboard"`, `"institutional"`. |
| `name`, `version` | `string` | Mismo versionado inmutable que presets (`005`). |
| `basePresetId` | `"web-complete"` | Los packs solo se aplican **sobre** `web-complete` (nunca sobre `neutral-base`; ver `contracts/preset-web-complete.md`). |
| `categories` | `readonly string[]` | — |
| `tokens` | *(interno del catálogo empaquetado)* | Mismo formato DTCG + `TokenLayerV1` que `neutral-base`. |

## Candidate model (solo contrato — sin productor real en `011`)

### `CandidateV1`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | — |
| `targetLevel` | `"brand" \| "foundations" \| "tokens" \| "assets" \| "components" \| "patterns" \| "templates"` | A qué nivel del modelo de 5 niveles aplica. |
| `proposedValue` | `unknown` | JSON-safe; forma depende de `targetLevel`. |
| `evidence` | `readonly BrandEvidenceV1[]` | Reutiliza el mismo contrato de evidencia que Brand System (vocabulario único de provenance en todo el producto). |
| `confidence` | `number` | `0..1`. |
| `issues` | `readonly { code: string; severity: "warning" \| "error"; message: string }[]` | — |
| `reviewState` | `"pending" \| "approved" \| "rejected"` | Ningún caso de uso de `011` transiciona esto fuera de `pending` por sí mismo. |

**Invariante obligatoria**: ningún caso de uso puede pasar un `CandidateV1` a la fuente final sin que
`reviewState` sea `approved` **por una acción explícita separada** (mismo boundary de aprobación que
`TokenMutationResultV1` de `008` y el Editor de `010`).

## Relaciones y autoridad (resumen)

```text
BrandProfileV1 ──(principles/personality informan)──> BrandVoiceV1
BrandVisualLanguageV1 ──(logoVariants/typographicRoles)──> BrandAssetReferenceV1 ──(logicalPath)──> 007 assets.json [solo lectura/validación]
BrandVisualLanguageV1.brandColors ──(paths)──> tokens con brandRole:"brand" [solo lectura/validación]

TokenLayerV1(layer="primitive", brandRole="brand") ──(alias)──> TokenLayerV1(layer="semantic")
TokenLayerV1(layer="semantic") ──(alias)──> TokenLayerV1(layer="component")
ComponentTokenGroupV1 ──(agrupa)──> tokens con layer="component"

PresetPackV1 ──(basePresetId)──> "web-complete" [add-only, atómico — motor de 005]

CandidateV1 ──(reviewState:approved, acción separada)──> cualquier entidad de arriba
```
