# Contract: BuildManifestV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: build manifest builder
- **Consumers**: artifact-set writer, future builds, downstream audit tools

This contract is for the build manifest at `design-system/build/manifest.json`. It is distinct from the
Design System host manifest at `design-system/design-system.json`.

## Schema Concept

```json
{
  "formatVersion": "1.0.0",
  "source": "design-system/tokens/base.tokens.json",
  "sourceHash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "artifacts": [
    {
      "format": "css",
      "relativePath": "tokens.css",
      "contentHash": "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "byteLength": 42
    }
  ]
}
```

## Invariants

- The build manifest does not list itself.
- `source` is the logical token source path, not the Design System host manifest.
- `sourceHash` hashes exact initial source raw bytes from the semantic source snapshot.
- `contentHash` hashes exact artifact bytes.
- `artifacts` order is `css`, `json`, `typescript`.
- No timestamp, cwd, hostname, username, Node version, package manager, UUID or absolute path.

## Errors

Previous build manifest states:

- absent + required paths absent: ownership `empty`, first build allowed;
- absent + required paths occupied: `conflict` / `required-path-owned-by-unknown`;
- corrupt: `conflict` / `untrusted-build-manifest`;
- unsupported version: `conflict` / `untrusted-build-manifest`;
- supported but inconsistent artifact bytes: `conflict` / `managed-artifact-modified`;
- supported but declared artifact missing: `conflict` / `managed-artifact-missing`.

## Null Policy

No nullable fields inside a valid build manifest. Optional future fields are not allowed in v1.

## Ordering

Root keys and artifact keys follow the example order. Serializer is 2-space JSON + final LF.

## Compatibility

Unsupported versions must be treated as untrusted rather than repaired. Consumers must not infer
ownership from file names without a supported build manifest.

## Security

Paths are logical and relative to `design-system/build/`; no traversal, absolute paths or user token
content.

## Evolution Policy

Changing ownership semantics or artifact list requires an ADR and version bump.
