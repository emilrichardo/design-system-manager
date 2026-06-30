# Contract: TokenMutationOutcomesV1 (outcomes, exit codes, streams)

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: mutation use cases (outcomes); adapter boundary (exit codes, streams)
- **Consumers**: CLI/MCP/Studio adapters, exit-code mapper, reporters

## Outcomes (domain)

```text
planned | applied | unchanged | invalid-command | invalid-design-system
| conflict | not-found | read-error | write-error | verification-error
```

`internal-error` exists ONLY at the adapter boundary (unexpected exception). Forbidden as public domain
outcomes: `partial`, `success`, `blocked`.

## Exit-code mapping (shared with 001–007)

| Outcome | Exit |
|---|---:|
| planned / applied | 0 |
| unchanged | 2 |
| invalid-command / invalid-design-system | 3 |
| conflict | 4 |
| not-found | 5 |
| read-error / write-error | 6 |
| verification-error | 7 |
| internal-error (adapter only) | 70 |

## Stream routing (when surfaced by an adapter)

- `plan`/`apply` success (human): report → stdout, stderr empty.
- Errors (expected): safe message → stderr, stdout empty; no partial document ever written.
- JSON mode: exactly one `TokenMutationJsonEnvelopeV1` → stdout; stderr per outcome; never mix human text
  into stdout JSON.
- `internal-error`: safe generic message; exit 70; no stack/secret/absolute path.

## Invariants

- The mapping is exhaustive; adding an outcome without mapping it is a compile-time error in
  implementation.
- Closed exit codes of `001`–`007` are unchanged; no new numbers introduced.
- `invalid-command` (malformed/illegal command) is distinct from `invalid-design-system` (the source DS is
  not analyzable); both map to exit 3 but carry different codes/messages.
