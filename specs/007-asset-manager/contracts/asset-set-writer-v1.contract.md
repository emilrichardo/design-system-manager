# Contract: AssetSetWriterV1 (transactional apply/remove)

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: infrastructure asset-set writer (behind a port)
- **Consumers**: `applyAssetImport`, `removeAsset`

## Schema Concept

```text
AssetSetWriteRequest {
  storeRoot: string                       # logical: design-system/assets
  strategy: "candidate-directory-set-v1"
  writes:  { logicalPath, bytes, contentHash, byteLength }[]   # add/replace
  deletes: string[]                       # logicalPaths to remove (remove op)
  manifest: { logicalPath, bytes, contentHash, byteLength }     # new assets.json
  expectedHashes: { manifest: string; assets: Record<logicalPath, string> }
}

AssetSetWriteResult {
  outcome: "applied"|"removed"|"unchanged"|"conflict"|"unsafe-target"|"write-error"|"verification-error"
  wrote: boolean
  storeAvailable: boolean
  backupRelativePath: string | null
  recoveryRequired: boolean
  conflicts: AssetIssue[]
  error: { code: string; message: string } | null
}
```

## Invariants

- **All-or-nothing**: stage the full next store state in a sibling staging area → verify candidate →
  move prior store to backup → swap staging in (commit point) → post-verify. No file-by-file live writes.
- Commit point = swap; from there `wrote:true`. No automatic destructive rollback after the commit point.
- Recovery states (mirroring `006`):
  - write-error before move ⇒ `storeAvailable:true`, `backupRelativePath:null`, `recoveryRequired:false`;
  - catastrophic restore failure ⇒ `storeAvailable:false`, backup retained, `recoveryRequired:true`;
  - post-publication verification failure ⇒ `verification-error`, `wrote:true`, store available, backup
    retained, `recoveryRequired:true`.
- **Ownership/safety**: never follows symlinks; preserves unknown content; blocks (`conflict`/
  `unsafe-target`) when a destination is occupied by unknown content or the store is a symlink/non-dir.
- **Concurrency**: re-checks source/manifest/asset hashes (bytes, not mtime) before the commit point;
  a mismatch blocks with `conflict` (`source-modified`/`untrusted-asset-manifest`).
- **Idempotency**: identical desired state ⇒ `unchanged`, `wrote:false`, no rewrite.
- Filesystem access is confined behind the port; paths in results are logical/relative only.
