# Contract: AssetManifestV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: asset-set writer (apply/remove); asset store reader (parse)
- **Consumers**: `listAssets`, `inspectAsset`, `planAssetImport`, ownership/idempotency checks

## Schema Concept

```text
AssetManifestV1 {
  formatVersion: "1.0.0"            # first key
  assets: AssetRecord[]             # deterministic order: by kind, then logicalPath (bytewise)
}

AssetRecord {
  logicalPath: string               # relative under design-system/assets/…, safe
  kind: "font"|"logo"|"svg"|"icon"|"image"
  mimeType: AssetMimeType           # content-derived
  byteLength: number                # ≥ 0
  contentHash: string               # SHA-256 lowercase hex (64)
  dimensions: { width, height, unit } | null
  provenance: { kind: "local-import"; sourceRef: string }
  license: { status: "declared"|"unspecified"; identifier: string|null; notice: string|null }
}
```

## Location

`design-system/assets/assets.json`. Never shares a file with tokens or the host manifest.

## Invariants

- Deterministic bytes for identical content; no timestamps, cwd, hostname or absolute paths.
- `logicalPath` unique; no duplicates; each path safe (no traversal/absolute) and contained in the store.
- `contentHash`/`byteLength` match the stored file exactly.
- Missing manifest ⇒ valid empty asset set (`assets: []`). Corrupt/untrusted manifest ⇒ blocking
  conflict (`untrusted-asset-manifest`), never treated as "no assets".
- Authority: only assets listed here are managed; everything else under the store is unknown content.
- Serialized canonically: `JSON.stringify(manifest, null, 2) + "\n"`, UTF-8, no BOM, single trailing LF.

## Examples

Valid (empty): `{ "formatVersion": "1.0.0", "assets": [] }`.
Invalid: duplicate `logicalPath`; absolute path; `license.status:"declared"` with null identifier and
null notice; unknown root key.
