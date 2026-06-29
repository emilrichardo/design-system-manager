# Contract: BuildOutcomesV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: build/export application use cases
- **Consumers**: CLI exit mapper, reporters, tests, future Studio/MCP

## Build Outcomes

```text
built
unchanged
invalid-design-system
unsupported-value
conflict
not-found
read-error
write-error
verification-error
```

## Export Outcomes

```text
exported
invalid-design-system
unsupported-value
not-found
read-error
```

## CLI-Only Outcome

```text
internal-error
```

## Exit Mapping

| Outcome | Exit |
|---|---:|
| `built`, `exported` | 0 |
| `unchanged` | 2 |
| `invalid-design-system` | 3 |
| `unsupported-value`, `conflict` | 4 |
| `not-found` | 5 |
| `read-error`, `write-error` | 6 |
| `verification-error` | 7 |
| `internal-error` | 70 |

## Invariants

- Domain/application do not contain numeric exit codes.
- `unsupported-value` and `conflict` share exit 4 but remain distinct discriminants.
- `not-found` distinguishes `design-system` and `source` where exposed.
- Expected outcomes contain no raw `Error`, stack or absolute path.

## Examples

```json
{ "outcome": "conflict", "wrote": false }
```

```json
{ "outcome": "verification-error", "wrote": true }
```

## Null Policy

Fields not meaningful for an outcome are `null`, not omitted when part of public JSON.

## Ordering

Issue/conflict arrays follow deterministic path order.

## Compatibility

Existing 001-005 exits are unchanged. New outcomes must not reuse old names with different meaning.

## Security

Messages are sanitized; no source dump or artifact bytes in errors.

## Evolution Policy

Adding a new outcome requires an exit-code ADR or explicit mapping in this contract family.
