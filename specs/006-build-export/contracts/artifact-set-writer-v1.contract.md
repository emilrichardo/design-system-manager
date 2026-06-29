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
  manifest
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
- Preserves unknown files.
- Replaces only paths managed by the previous supported manifest plus current required paths.
- Blocks required paths occupied by unknown files/directories.
- Re-checks source/output/manifest/parents/symlinks before publish.
- Writes manifest last.
- Keeps backup on post-publish verification failure.

## Examples

```json
{
  "outcome": "published",
  "wrote": true,
  "backupRelativePath": null
}
```

## Errors

`unsafe-target` covers path escape, symlink, non-directory parent and traversal. `conflict` covers
ownership/concurrency. `write-error` covers IO failures before verified publication.

## Null Policy

`backupRelativePath` is `null` unless retained. `error` is `null` on success.

## Ordering

Operations follow artifact order for staged bytes, manifest last for publication. Conflicts are sorted
by required path order.

## Compatibility

The strategy string is fixed to `staged-managed-set-v1` in v1.

## Security

No path derived from token content; no symlink following; no deletion of unknown files; public paths are
relative only.

## Evolution Policy

Whole-directory or pointer-based strategies require new ADR and strategy id.
