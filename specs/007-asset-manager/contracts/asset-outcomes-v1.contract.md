# Contract: AssetOutcomesV1 (outcomes, exit codes, streams)

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: asset use cases (outcomes); adapter boundary (exit codes, streams)
- **Consumers**: CLI/MCP/Studio adapters, exit-code mapper, reporters

## Outcomes (domain)

```text
listed | inspected | planned | applied | unchanged | removed
| invalid-asset-store | unsupported-asset | conflict | not-found | read-error
| write-error | verification-error
```

`internal-error` exists ONLY at the adapter boundary (unexpected exception). Forbidden as public
outcomes: `partial`, `success`, `blocked` (blocked is a candidate verdict, not an operation outcome).

## Exit-code mapping (shared with 001–006)

| Outcome | Exit |
|---|---:|
| listed / inspected / planned / applied / removed | 0 |
| unchanged | 2 |
| invalid-asset-store | 3 |
| unsupported-asset / conflict | 4 |
| not-found | 5 |
| read-error / write-error | 6 |
| verification-error | 7 |
| internal-error (adapter only) | 70 |

## Stream routing (when surfaced by an adapter)

- Read/plan success (human): report → stdout, stderr empty.
- Errors (expected): safe message → stderr, stdout empty (no partial artifact).
- JSON mode: exactly one `AssetJsonEnvelopeV1` → stdout; stderr per outcome; never mix human text in
  stdout JSON.
- `internal-error`: safe generic message; exit 70; no stack/secret/absolute path.

## Invariants

- The mapping is exhaustive; adding an outcome without mapping it is a compile-time error in
  implementation.
- Closed exit codes of `001`–`006` are unchanged; no new numbers introduced.
- `wrote:true` only for `applied`/`removed`/`verification-error`; read/plan/unchanged ⇒ `wrote:false`.
