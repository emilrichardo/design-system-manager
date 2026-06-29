# Contract: BuildManifestV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: build manifest builder
- **Consumers**: artifact-set writer, future builds, downstream audit tools

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

- `manifest.json` does not list itself.
- `sourceHash` hashes exact source bytes.
- `contentHash` hashes exact artifact bytes.
- `artifacts` order is `css`, `json`, `typescript`.
- No timestamp, cwd, hostname, username, Node version, package manager, UUID or absolute path.

## Errors

Previous manifest states:

- absent: no trusted managed ownership;
- corrupt: no trusted ownership, safe conflict if required paths exist;
- unsupported version: no trusted ownership;
- supported but inconsistent artifact bytes: conflict.

## Null Policy

No nullable fields inside a valid manifest. Optional future fields are not allowed in v1.

## Ordering

Root keys and artifact keys follow the example order. Serializer is 2-space JSON + final LF.

## Compatibility

Unsupported versions must be treated as untrusted rather than repaired. Consumers must not infer
ownership from file names without a supported manifest.

## Security

Paths are logical and relative to `design-system/build/`; no traversal, absolute paths or user token
content.

## Evolution Policy

Changing ownership semantics or artifact list requires an ADR and version bump.
