# Contract — Foundations result & category states v1 (004)

Headless result of the foundations use case. Discriminated by `outcome` (002 vocabulary). Derived
from the single analysis; read-only.

## Category state algorithm

Per category, precedence **`invalid > partial > complete > absent`**:

- `absent` — no token resolves to the category.
- `invalid` — any of: `foundation-level-invalid`, `foundation-forbidden-dependency`, missing
  reference, cycle, alias-to-group, or applicable type incompatibility within the category.
- `partial` — has tokens and (no errors) but at least one `unclassified` token, or `limits.partial`,
  or the tokens document is incomplete, or a `foundation-type-mismatch`/not-deeply-inspected warning.
- `complete` — has tokens, all classified (`primitive`/`semantic`), no foundation errors, within the
  supported validation depth. **Never** defined by a concrete token roster (values belong to presets).

## Global outcome (reuses 002; no second table)

Precedence `not-found > read-error > structural-partial > foundations-invalid >
foundations-partial(incl. unclassified) > valid`:

| Condition | outcome | exit | result |
|---|---|---|---|
| host/DS not located | not-found | 5 | null |
| tokens unreadable / invalid UTF-8 / json-parse / budget | read-error | 6 | recoverable |
| missing managed docs / `limits.partial` | partial | 4 | recoverable |
| any category `invalid` (DS structurally complete) | complete-invalid | 3 | full |
| classified OK but some `unclassified`/`unresolved` | partial | 4 | full |
| all attributable tokens classified, no foundation errors | valid | 0 | full |

`unclassified`/type warnings are warnings (never `complete-invalid`); their presence yields `partial`
(exit 4), preserving the historical meaning of `partial` and `complete-invalid`.

## Result type

```ts
type FoundationsResult =
  | { outcome: "valid";            host: AnalysisHost; inspection: FoundationsInspection }
  | { outcome: "complete-invalid"; host: AnalysisHost; inspection: FoundationsInspection }
  | { outcome: "partial";          host: AnalysisHost; inspection: FoundationsInspection }
  | { outcome: "read-error";       host: AnalysisHost; inspection: FoundationsInspection }
  | { outcome: "not-found"; host: AnalysisHost | null; inspection: null; hostError: HostError | null };
```

`inspection.categories` always lists all 9 categories in canonical order (even `absent`).
Shapes: see [data-model.md](../data-model.md) §5–§7. `not-found` invents nothing.

## Invariants

- `categories.length === 9`; canonical order; each id once.
- `category.tokens.length === counts.total`; `total === primitive + semantic + unclassified`.
- `summary.tokens.total === Σ category.counts.total + unresolved.length`.
- Deterministic; read-only; JSON-safe; no `undefined`.
