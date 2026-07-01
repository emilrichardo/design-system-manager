# Contract: ViewerColorV1 and the contrast policy

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectColorSwatch`, `computeContrast` — computation deferred
  to Checkpoint D of `tasks.md`; the shape and policy are defined now)
- **Consumers**: Colors view, UI contrast picker, HTTP JSON API

## Shape

```text
ViewerColorV1 {
  token: ViewerTokenV1                 // category === "color"
  swatch: {
    resolvedValue: SafeJsonValue
    sRgb: { r: number; g: number; b: number } | null   // null when not reducible to sRGB
  }
  contrast: ViewerContrastResult | null   // present only once a text/background pair is chosen
}

ViewerContrastResult {
  textPath: string
  backgroundPath: string
  ratio: number | null      // null iff state === "not-computable"
  level: "AA-normal" | "AA-large"
  state: "pass" | "fail" | "not-computable"
}
```

## Contrast policy (spec decision — binding; see `spec.md` "Colors & contrast policy")

- **Standard**: WCAG 2.1, SC 1.4.3 (Contrast — Minimum) and 1.4.11 (Non-text Contrast), level **AA**.
- **Formula**: WCAG 2.1 §1.4.3/Appendix relative luminance and contrast ratio, over sRGB components.
- **Thresholds**: normal text ≥ 4.5:1 → `pass`; large text (≥24px regular or ≥19px/≈14pt bold) and
  non-text UI components/graphics ≥ 3:1 → `pass`; below the applicable threshold → `fail`.
- **Not computable**: any color not reducible to sRGB (broken alias, unsupported color space with no sRGB
  fallback in the analysis) → `state: "not-computable"`, `ratio: null` — never a fabricated ratio.

## Provenance

| Field | Source |
|---|---|
| `token` | `viewer-token-v1.contract.md`, filtered to `category === "color"` |
| `swatch.resolvedValue` | `006` `ResolvedTokenRecord.resolvedValue` |
| `swatch.sRgb` | derived once from `resolvedValue` (pure function; `null` when not reducible) |
| `contrast` | the contrast policy above, applied to two chosen `ViewerColorV1.swatch.sRgb` values |

## Invariants

- `contrast` is `null` until the user selects a text/background pair — it is never eagerly computed for
  every possible pair (would be O(n²) and is not required by any user story).
- `state === "not-computable"` ⇒ `ratio === null`; every other state ⇒ `ratio` is a finite number.
- The formula/thresholds above are the **only** ones this contract implements; WCAG AAA and
  colorblindness simulation are out of scope for v1 (spec.md).

## Exclusions

No raw bytes, absolute paths, `Error`/stack, secrets.
