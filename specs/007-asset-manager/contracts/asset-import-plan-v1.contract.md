# Contract: AssetImportPlanV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: `planAssetImport`
- **Consumers**: `applyAssetImport`, reporters, CLI/MCP/Studio adapters

## Schema Concept

```text
ImportPlan {
  candidates: ImportCandidate[]                  # deterministic: input order, then logicalPath
  summary: { add: number; duplicate: number; blocked: number }
}

ImportCandidate {
  sourceRef: string                              # safe relative reference
  kind: AssetKind | null
  destinationPath: string | null                 # proposed logical path, null when blocked
  mimeType: AssetMimeType | null
  byteLength: number
  contentHash: string                            # SHA-256 of source bytes
  dimensions: AssetDimensions | null
  verdict: "add" | "duplicate" | "blocked"
  duplicateOf: string | null                     # existing logicalPath when duplicate
  license: AssetLicense                          # "declared" only when explicitly supplied
  validation: { ok: boolean; code: string|null; message: string|null }
  sanitization: SvgSanitizationReport | null     # present only for SVG inputs
  issues: AssetIssue[]                           # stable, ordered (esp. for blocked)
}
```

## Invariants

- **Read-only**: computing a plan writes nothing; the store and manifest are byte-identical before/after.
- A candidate whose content hash already exists ⇒ `verdict: "duplicate"`, `duplicateOf` set, not stored.
- A candidate with unsupported MIME, invalid font, unsafe/unsanitizable SVG, unsafe destination path, or
  size over limits ⇒ `verdict: "blocked"` with stable `issues` and `destinationPath: null`.
- `license` is `unspecified` unless explicit metadata is supplied; the plan never marks a license as
  `declared` without an explicit value (a license-less source is surfaced via a `license-required`
  issue, not blocked by default).
- SVG candidates carry a `SvgSanitizationReport`; the bytes that `apply` would write are the **sanitized**
  bytes previewed here.
- Deterministic: identical inputs + identical manifest ⇒ identical plan.

## apply linkage

`applyAssetImport` consumes a previously-equivalent plan, writes only `add` candidates plus the updated
manifest as one transactional set, and is idempotent (`unchanged` when nothing changes). It never writes
`duplicate`/`blocked` candidates.
