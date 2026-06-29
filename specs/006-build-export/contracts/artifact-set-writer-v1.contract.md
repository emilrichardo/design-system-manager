# Contract: ArtifactSetWriterV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: infrastructure filesystem adapter
- **Consumers**: `buildDesignSystem`

## Schema Concept

```text
writeArtifactSet(request) -> ArtifactSetWriteResult

request:
  outputRoot
  expectedSnapshot
  artifacts
  buildManifest
  strategy
  expectedHashes
```

## Result Discriminants

```text
published
unchanged
conflict
unsafe-target
write-error
verification-error
```

## Invariants

- Generic: no tokens, renderers, CLI, presets, Commander or public JSON knowledge.
- Staging contains the complete future `design-system/build/`, not loose files.
- Preserves allowed unknown regular files/directories by byte-for-byte copy into the candidate.
- Blocks symlinks, sockets, FIFOs, devices, special nodes, containment escapes and unknown nodes beyond
  documented limits.
- Uses the previous build manifest as the only generated-artifact ownership authority.
- Blocks required paths occupied by unknown files/directories with `required-path-owned-by-unknown`.
- Re-checks source bytes by hash only, output/build manifest/parents/symlinks before publish.
- Writes the build manifest inside staging after managed artifacts.
- Publishes the candidate directory as a set; no artifact-by-artifact publication into live `build/`.
- Keeps backup on post-publish verification failure or catastrophic restore failure.

## Examples

```json
{
  "outcome": "published",
  "wrote": true,
  "outputAvailable": true,
  "backupRelativePath": null,
  "recoveryRequired": false
}
```

## Errors

`unsafe-target` covers path escape, symlink, non-directory parent and traversal. `conflict` covers
ownership/concurrency, including `source-modified`, `unsupported-unknown-node`,
`required-path-owned-by-unknown`, `untrusted-build-manifest`, `managed-artifact-modified` and
`managed-artifact-missing`. `write-error` covers IO failures before verified publication.

`write-error` fields:

```text
wrote:false
outputAvailable:boolean
backupRelativePath:string|null
recoveryRequired:boolean
```

`verification-error` fields:

```text
wrote:true
outputAvailable:true
backupRelativePath:string
recoveryRequired:true
```

## Null Policy

`backupRelativePath` is `null` unless retained. `error` is `null` on success. `outputAvailable` is
always present in writer results. `recoveryRequired` is always present and false on successful
`published`, `unchanged` and pre-move conflicts.

## Ordering

Operations follow artifact order for staged bytes, build manifest last within staging, then directory
publish. Conflicts are sorted by required path order, then logical unknown-node path order.

## Compatibility

The strategy string is fixed to `candidate-directory-set-v1` in v1.

## Security

No path derived from token content; no symlink following; no deletion of unknown files outside the
candidate/backup protocol; no special-node copying; public paths are relative only.

## Evolution Policy

Whole-directory or pointer-based strategies require new ADR and strategy id.
