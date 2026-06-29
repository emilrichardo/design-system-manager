# Contract: BuildJsonEnvelopeV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: `build --json` reporter/mapper
- **Consumers**: CLI users, CI, future agents

## Schema Concept

```json
{
  "formatVersion": "1.0.0",
  "command": "build",
  "outcome": "built",
  "source": {
    "path": "design-system/tokens/base.tokens.json",
    "hash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "outputDirectory": "design-system/build",
  "wrote": true,
  "outputAvailable": true,
  "artifacts": [],
  "manifest": null,
  "verification": null,
  "backupRelativePath": null,
  "recoveryRequired": false,
  "conflict": null,
  "error": null
}
```

## Invariants

- Independent from 003/004/005 JSON envelopes.
- Exactly one JSON document is written to stdout for expected `build --json` outcomes.
- Serializer is 2-space JSON + final LF.
- Contains no artifact bytes; only metadata and summaries.

## Errors

Expected errors are represented in `outcome`, `conflict`, `verification`, `backupRelativePath`,
`recoveryRequired`, `outputAvailable` and/or `error`. CLI internal errors may emit this envelope to
stderr with `outcome: "internal-error"` and exit 70.

## Null Policy

All stable fields are present. Unavailable scalar/object fields are `null`; booleans are present when
contracted; arrays are `[]`.

## Ordering

Root property order follows the schema concept. Nested artifact/manifest/error orders follow their
own contracts.

## Compatibility

Consumers must check `formatVersion`. This envelope is not assignable to older JSON contracts.

## Security

No absolute paths, stack traces, raw `Error`, environment, secrets, full source document, generated
artifact bytes or backup absolute path. Retained backup is exposed only as a logical relative path.

## Evolution Policy

Any field addition/removal/reordering that changes bytes requires a version bump and regression tests.
