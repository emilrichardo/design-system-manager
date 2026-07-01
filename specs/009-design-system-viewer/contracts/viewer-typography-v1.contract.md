# Contract: ViewerTypographyV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectTypography`)
- **Consumers**: Typography view, UI preview panel, HTTP JSON API

## Shape

```text
ViewerTypographyV1 {
  token: ViewerTokenV1               // category === "typography"
  family: string | null
  weight: string | number | null
  style: string | null
  size: SafeJsonValue | null
  lineHeight: SafeJsonValue | null
  letterSpacing: SafeJsonValue | null
  linkedFontAsset: ViewerAssetV1 | null
  licenseState: "declared" | "unspecified" | "no-matching-asset"
}
```

## Provenance (field → source; FR-011)

| Field | Source |
|---|---|
| `token` | `viewer-token-v1.contract.md`, filtered to `category === "typography"` |
| `family`/`weight`/`style`/`size`/`lineHeight`/`letterSpacing` | the resolved DTCG value's own sub-fields (`fontFamily`, `fontWeight`, `typography.*`) from `006`'s `resolvedValue` — read as-is, never defaulted |
| `linkedFontAsset` | `007` `AssetRecord` with `kind === "font"` whose declared family metadata matches `family`; `null` when no match |
| `licenseState` | `declared`/`unspecified` from `linkedFontAsset.license.status`; `no-matching-asset` when `linkedFontAsset === null` |

## Invariants

- Every sub-field is `null` when the underlying DTCG value does not declare it — the Viewer never
  substitutes a default (e.g. a missing `letterSpacing` is `null`, not `"normal"`).
- `licenseState === "no-matching-asset"` ⇒ `linkedFontAsset === null`; the Viewer MUST NOT guess or assume
  a license in this case (mirrors guardrail 14).
- Font-family matching is a display convenience only; it never writes back to `007`'s asset manifest and
  never creates an association record.

## Exclusions

No raw font bytes (`linkedFontAsset` carries only `viewer-asset-v1.contract.md`'s metadata, never the
font's binary payload); no absolute paths; no `Error`/stack; no secrets.
