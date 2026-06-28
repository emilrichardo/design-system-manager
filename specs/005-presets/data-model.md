# Data Model: Design System Presets

All entities are immutable value objects unless explicitly marked as an adapter result. Public DTOs
must not expose `undefined`; use `null` for stable absent scalar fields, `[]` for empty arrays, `{}` for
empty records.

## PresetId

- **Type**: branded string.
- **Rule**: lowercase ASCII kebab-case, regex `[a-z][a-z0-9]*(?:-[a-z0-9]+)*`.
- **Invariant**: exact, case-sensitive uniqueness across the bundled catalog.

## PresetVersion

- **Type**: SemVer string.
- **Rule**: parsed with existing SemVer dependency/pattern.
- **Meaning**: version of the preset envelope/content within the package, independent of package
  version and JSON `formatVersion`.

## PresetMetadata

| Field | Type | Null policy | Rule |
|---|---|---|---|
| `id` | PresetId | never null | unique catalog id |
| `name` | string | never null | non-empty, display only |
| `description` | string | never null | non-empty, safe human text |
| `version` | PresetVersion | never null | SemVer |
| `includedCategories` | FoundationCategoryId[] | never null | non-empty, unique, canonical order |

## PresetEnvelope

| Field | Type | Rule |
|---|---|---|
| metadata fields | PresetMetadata | required |
| `tokens` | DTCG object | required; no component/theme paths |

Unknown top-level fields are invalid in v1. `tokens` must contribute at least one token under the
declared categories. Aliases must resolve inside the preset token block.

## PresetCatalogEntry

- `id`, `name`, `description`, `version`, `includedCategories`.
- `assetPath`: package-relative path from `presets/catalog.json`, never exposed as absolute path.
- Sorted by canonical catalog order.

## PresetInspection

- `metadata`: PresetMetadata.
- `tokens`: token summaries with path, category, level, `$type`, alias target, description presence.
- `validation`: PresetValidation.
- Contains no raw arbitrary token values in human error text; JSON result may expose sanitized token
  summaries but not full documents.

## PresetValidation

- `valid`: boolean.
- `errors`: PresetConflict-like validation issues.
- `warnings`: optional non-blocking warnings.
- `limits`: existing analysis limit result shape.
- Invalid preset blocks planning and apply.

## TokenChange

Generic, source-agnostic change candidate:

| Field | Type | Rule |
|---|---|---|
| `path` | logical token path | no absolute paths |
| `category` | FoundationCategoryId | derived from top-level path |
| `level` | `primitive \| semantic` | from preset metadata |
| `operation` | PresetOperationKind | create/update/unchanged/conflict/skip |
| `reason` | stable string | safe, deterministic |
| `blocksWrite` | boolean | true only for conflict/blocking limit |
| `proposedToken` | DTCG token/group fragment or null | available to application, not human output |

## TokenChangeSet

- Ordered array of TokenChange.
- No preset metadata.
- Invariant: paths sorted by canonical category order then preset insertion order.

## PresetOperationKind

```text
create
update
unchanged
conflict
skip
```

`delete` is absent. `update` is limited to adding missing `$description` to an otherwise equivalent
token.

## PresetConflict

| Field | Type | Rule |
|---|---|---|
| `code` | stable enum | e.g. `preset-value-differs` |
| `path` | string \| null | logical path only |
| `severity` | `error \| warning` | blocking conflicts are errors |
| `message` | string | sanitized |
| `blocksWrite` | boolean | true blocks apply |
| `proposedAction` | string | deterministic, safe |

## ApplicationPlan

Generic plan:

- `changeSet`: TokenChangeSet.
- `conflicts`: PresetConflict[].
- `summary`: ApplicationSummary.
- `writable`: boolean.

No preset id/name.

## PresetApplicationPlan

Preset wrapper:

- `preset`: PresetMetadata.
- `targetFile`: `"design-system/tokens/base.tokens.json"`.
- `plan`: ApplicationPlan.
- `hostState`: minimal structural state from analysis.

## ApplicationSummary / PresetApplicationSummary

Counts:

- `create`
- `update`
- `unchanged`
- `conflict`
- `skip`
- `total`
- `blockingConflicts`
- `wouldWrite`

## PresetApplyResult

Discriminated by `outcome`:

```text
applied
unchanged
conflict
invalid-preset
not-found
read-error
write-error
verification-error
internal-error (CLI only)
```

Fields:

- `preset`: metadata or null.
- `plan`: PresetApplicationPlan or null.
- `summary`: PresetApplicationSummary.
- `wrote`: boolean.
- `targetFile`: relative path or null.
- `verification`: post-write verification summary or null.
- `error`: sanitized error or null.

## PresetCommandOutcome

Command-level outcomes:

- list/inspect/plan: `success`, `unchanged`, `conflict`, `invalid-preset`, `not-found`, `read-error`.
- apply: `applied`, `unchanged`, `conflict`, `invalid-preset`, `not-found`, `read-error`,
  `write-error`, `verification-error`.
- CLI-only: `internal-error`.

## State Transitions

```text
catalog asset → parsed envelope → validated preset
validated preset + host analysis → application plan
application plan (writable=false) → conflict result (no write)
application plan (unchanged) → unchanged result (no write)
application plan (writable=true) → in-memory document → atomic write → post-write verification
post-write verification ok → applied
post-write verification failed → verification-error (wrote=true)
```
