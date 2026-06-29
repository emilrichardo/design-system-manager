# Contract: ResolvedTokensV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: JSON artifact renderer
- **Consumers**: `build`, `export json`, downstream tools

## Schema Concept

```json
{
  "formatVersion": "1.0.0",
  "source": {
    "path": "design-system/tokens/base.tokens.json",
    "hash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "tokens": {
    "color.base.blue.500": {
      "value": "#0066ff",
      "aliasOf": null,
      "type": "color",
      "category": "color",
      "foundationLevel": "primitive",
      "description": null
    }
  }
}
```

## Invariants

- Independent from `JsonEnvelopeV1`, `FoundationsJsonEnvelopeV1` and `PresetsJsonEnvelopeV1`.
- Flat token-path record.
- `value` is fully resolved; alias relation is preserved only in `aliasOf`.
- Unknown `$extensions`, raw source document and trust are excluded.

## Errors

Invalid source blocks before this contract is produced. Unsupported CSS values do not prevent
`export json` if JSON-safe.

## Null Policy

Stable absent scalar fields use `null`: `aliasOf`, `category`, `description`. No `undefined`.

## Ordering

Root keys: `formatVersion`, `source`, `tokens`. Token keys follow canonical order. Token fields:
`value`, `aliasOf`, `type`, `category`, `foundationLevel`, `description`.

## Compatibility

Consumers must reject unsupported `formatVersion`. Additive fields require a new version because byte
stability is part of the contract.

## Security

No absolute paths, stacks, raw errors, source document dump, secrets, environment data or unknown
extensions.

## Evolution Policy

Future versions may add metadata only through explicit version bump and ADR.
