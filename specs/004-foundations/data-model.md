# Data Model — 004-foundations

Entities for the read-only foundations view. All are **derived** from the single
`DesignSystemAnalysis` (no second read/parse/traversal). Domain types are pure; the public/JSON DTOs
are JSON-safe (string | finite number | boolean | null | array | plain object); no `undefined`.

> Layers: `domain` = pure foundation model + resolution rules; `application` = use case + public
> result/DTO + pure mappers; `infrastructure` = human reporter + JSON serializer; `cli` = command.

## 1. Enums

```ts
type FoundationLevel = "primitive" | "semantic" | "unclassified"; // unclassified = derived only
type FoundationLevelSource = "token" | "group" | "none" | "invalid";
type FoundationCategoryId =
  | "color" | "spacing" | "typography" | "radius"
  | "border" | "shadow" | "opacity" | "sizing" | "motion";
type FoundationCategoryRef = FoundationCategoryId | "unresolved"; // token-level attribution
type FoundationCategoryState = "absent" | "partial" | "complete" | "invalid";
type FoundationOutcome = "valid" | "complete-invalid" | "partial" | "not-found" | "read-error";
```

`FoundationLevel` persisted values are ONLY `primitive`/`semantic`; `unclassified` is a derived
inspection state and is invalid as persisted metadata (see contracts/foundation-extension-v1).

## 2. Level resolution (domain)

```ts
interface FoundationLevelResolution {
  readonly level: FoundationLevel;          // effective level (own → nearest group → unclassified)
  readonly source: FoundationLevelSource;   // where it came from
  readonly sourcePath: string | null;       // group path when source==="group"/"invalid"; else null
  readonly valid: boolean;                   // false when the resolving declaration was malformed
}
```

Invariants: `source==="token"|"group"` ⇒ `level∈{primitive,semantic}` and `valid===true`;
`source==="none"` ⇒ `level==="unclassified"`, `sourcePath===null`; `source==="invalid"` ⇒
`level==="unclassified"`, `valid===false`, `sourcePath` = declaring node path. Pure, deterministic.

## 3. Category registry (domain)

```ts
interface FoundationCategoryDefinition {
  readonly id: FoundationCategoryId;
  readonly displayOrder: number;            // canonical order, see below
  readonly supportedTypes: readonly string[]; // related DTCG $type(s) (research §7)
  readonly validationDepth: "deep" | "shallow"; // only color === "deep"
  readonly allowsPrimitive: boolean;        // true for all in v1
  readonly allowsSemantic: boolean;         // true for all in v1
}
```

Canonical order (immutable, `displayOrder` 0..8): `color, spacing, typography, radius, border,
shadow, opacity, sizing, motion`. The registry holds **no** concrete values/scales/colors/sizes/
presets/CSS/component names. It is a fixed constant.

## 4. Token-level foundation view (application result)

```ts
interface FoundationTokenInspection {
  readonly path: string;                    // canonical path (reused from TokenNodeSummary)
  readonly category: FoundationCategoryRef;  // §research 4 (first segment match | "unresolved")
  readonly level: FoundationLevel;
  readonly levelSource: FoundationLevelSource;
  readonly levelSourcePath: string | null;
  readonly effectiveType: string | null;    // reused from analysis (not recomputed)
  readonly kind: "concrete" | "alias";       // reused
  readonly aliasTarget: string | null;       // reused
  readonly aliasState: "valid" | "missing" | "to-group" | "cyclic" | "malformed" | "n/a"; // reused
  readonly trust: "valid" | "recovered" | "untrusted"; // reused
}
```

No `$value`, no raw `$extensions`, no Maps/buffers/Error objects, no internal traversal objects.

## 5. Category inspection (application result)

```ts
interface FoundationCategoryInspection {
  readonly id: FoundationCategoryId;
  readonly state: FoundationCategoryState;
  readonly validationDepth: "deep" | "shallow";
  readonly counts: {
    readonly total: number;
    readonly primitive: number;
    readonly semantic: number;
    readonly unclassified: number;
  };
  readonly tokens: readonly FoundationTokenInspection[]; // ALL tokens of this category, stable order
  readonly issues: readonly FoundationIssue[];           // category-scoped foundation issues
}
```

Tokens whose `category==="unresolved"` are NOT placed in any category; they are surfaced in
`FoundationsInspection.unresolved` (preserved, never dropped).

## 6. Foundation issue (application; reuses AnalysisIssue shape)

```ts
interface FoundationIssue {
  readonly severity: "error" | "warning";
  readonly code: string;                     // stable; see contracts/foundations-issues-v1
  readonly message: string;
  readonly document: "tokens" | "structure"; // foundation issues originate in tokens/structure
  readonly path: string | null;              // logical token/group path
}
```

New stable codes (style consistent with 002): `foundation-level-invalid` (error),
`foundation-forbidden-dependency` (error, primitive→semantic), `foundation-token-unclassified`
(warning), `foundation-category-unresolved` (warning), `foundation-type-mismatch` (warning).
Reused (NOT duplicated) from 002 by reference: missing reference, cycle, alias-to-group, and the
`dtcg-type-not-deeply-inspected` warning — foundations surfaces these existing issues rather than
re-emitting new codes.

## 7. Result aggregates (application)

```ts
interface FoundationsSummary {
  readonly categories: { readonly absent: number; readonly partial: number;
                         readonly complete: number; readonly invalid: number };
  readonly tokens: { readonly total: number; readonly primitive: number;
                     readonly semantic: number; readonly unclassified: number; readonly unresolved: number };
  readonly errors: number;
  readonly warnings: number;
}

interface FoundationsValidation {
  readonly valid: boolean;                   // false if any error or limits.partial
  readonly errors: readonly FoundationIssue[];
  readonly warnings: readonly FoundationIssue[];
  readonly limits: AnalysisLimitsResult;     // reused from 002 (reached/partial/hits)
}

interface FoundationsInspection {
  readonly host: { readonly root: string; readonly designSystemPath: string | null } | null;
  readonly structuralState: StructuralState; // reused from 002
  readonly categories: readonly FoundationCategoryInspection[]; // all 9, canonical order
  readonly unresolved: readonly FoundationTokenInspection[];     // category "unresolved" tokens
  readonly summary: FoundationsSummary;
  readonly validation: FoundationsValidation;
  readonly limits: AnalysisLimitsResult;
}

// Discriminated public result of the headless use case (mirrors 002's result unions).
type FoundationsResult =
  | { readonly outcome: "valid";            readonly host: AnalysisHost; readonly inspection: FoundationsInspection }
  | { readonly outcome: "complete-invalid"; readonly host: AnalysisHost; readonly inspection: FoundationsInspection }
  | { readonly outcome: "partial";          readonly host: AnalysisHost; readonly inspection: FoundationsInspection }
  | { readonly outcome: "read-error";       readonly host: AnalysisHost; readonly inspection: FoundationsInspection }
  | { readonly outcome: "not-found"; readonly host: AnalysisHost | null; readonly inspection: null;
      readonly hostError: HostError | null };
```

All categories (9) always appear in `inspection.categories` in canonical order, even when `absent`.
`not-found` carries no inspection (no invention). `read-error`/`partial` carry the recoverable
inspection.

## 8. JSON DTOs (application; only if `--json`)

Separate from 003's `JsonEnvelopeV1`. JSON-safe projection of the result; same null policy as 003
(stable fields → `null` when absent; no `undefined`).

```ts
const FOUNDATIONS_JSON_FORMAT_VERSION = "1.0.0"; // independent of 003's JSON_FORMAT_VERSION

interface FoundationsJsonEnvelopeV1 {
  readonly formatVersion: "1.0.0";
  readonly command: "foundations";
  readonly outcome: FoundationOutcome | "internal-error";
  readonly result: JsonFoundationsResultV1 | null;
  // `error` present only for not-found (hostError → null in v1) and internal-error
}
```

`JsonFoundationsResultV1` mirrors `FoundationsInspection` with JSON-safe fields (categories, tokens,
summary, validation/limits, unresolved). Full field tables in
[contracts/foundations-json-result-v1](contracts/foundations-json-result-v1.contract.md).

## 9. Mapping table: source → model → transformation → absence

| Source (analysis) | Foundation field | Transformation | Absence |
|---|---|---|---|
| `documents[<tokens>].parsed` `$extensions…foundation.level` | `level/levelSource/levelSourcePath/valid` | own→group→none resolution (§2) | `unclassified`/`none` |
| `node.path` first segment | `category` | exact match vs 9 ids | `"unresolved"` |
| `node.effectiveType` | `effectiveType` | copy | `null` |
| `node.kind/aliasTarget/aliasState/trust` | same | copy (no re-resolution) | per node |
| `analysis.limits` | `validation.limits` | copy `{reached,partial,hits}` | hits `[]` |
| `analysis.host` | `inspection.host` | copy | `null` (not-found) |
| `analysis.structuralState` | `structuralState` | copy | — |
| invalid `$extensions` shape | `FoundationIssue(foundation-level-invalid)` | one per declaration, logical path | n/a |
| 002 alias issues (missing/cycle/to-group) | surfaced `FoundationIssue` | reference existing issue | n/a |

## 10. Invariants

1. `inspection.categories.length === 9`, canonical order, every id present exactly once.
2. `category.tokens.length === counts.total`; `total === primitive+semantic+unclassified`.
3. `summary.tokens.total === Σ category.counts.total + unresolved.length`.
4. No `$value`/`$extensions`/Error/Map in any public field; no `undefined`; JSON-safe.
5. Deterministic: identical analysis → deeply-equal result; no timestamps/UUID/env.
6. Read-only: producing the result never mutates the parsed document or the source file.
