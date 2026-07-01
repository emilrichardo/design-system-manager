# Contract: ViewerAssetV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectAsset`)
- **Consumers**: Assets view, Typography view (`linkedFontAsset`), HTTP JSON API

## Shape

```text
ViewerAssetV1 {
  logicalPath: string
  kind: AssetKind                  // font | logo | svg | icon | image
  mimeType: AssetMimeType
  byteLength: number
  contentHash: string
  dimensions: AssetDimensions | null
  provenance: AssetProvenance      // { kind: "local-import"; sourceRef: string }
  license: AssetLicense            // { status: "declared" | "unspecified"; identifier; notice }
  sanitization: SvgSanitizationPreview | null   // svg only; null for every other kind
  ownership: { state: OwnershipState }          // empty | trusted | untrusted-asset-manifest
  issues: ViewerIssueV1[]
}
```

## Provenance (field → source; FR-014) — 1:1 from `007`, no recomputation

| Field | Source |
|---|---|
| `logicalPath`, `kind`, `mimeType`, `byteLength`, `contentHash`, `dimensions`, `provenance`, `license` | `007` `AssetRecord` |
| `sanitization` | `007` `AssetInspection` (svg assets only) |
| `ownership.state` | `007` `AssetOwnership.state` |
| `issues` | `007` `AssetInspection.issues` / `AssetListResult.conflicts`, mapped 1:1 into `ViewerIssueV1` (`source: "assets"`) |

## Invariants

- **No raw bytes**: this contract never carries the asset's binary payload — only the metadata `007`
  already computed (hash/dimensions/MIME), matching FR-006/FR-014.
- `kind !== "svg"` ⇒ `sanitization === null` (sanitization is an SVG-only concept in `007`).
- `license.status === "unspecified"` ⇒ `identifier === null` and `notice === null` (mirrors `007`'s own
  `licenseInvariantHolds`); the Viewer never assumes permission (guardrail 14).
- This contract MUST be produced from `007`'s existing `AssetListResult`/`AssetInspectResult` for the
  session's single asset-store observation — never a second `AssetStorePort.observe()` call per view.

## Exclusions

No raw bytes, absolute paths, `Error`/stack, secrets.
