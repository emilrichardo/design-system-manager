# Contract: TokenMutationJsonEnvelopeV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: token-mutation JSON reporter (application DTO + mapper, infrastructure serializer)
- **Consumers**: CI, agents, MCP, Studio

## Schema Concept

```text
TokenMutationJsonEnvelopeV1 {
  formatVersion: "1.0.0"
  command: "token-plan" | "token-apply"
  outcome: TokenMutationOutcome | "internal-error"
  result: { diff?, summary?, conflicts?, source?, wrote? } | null   # logical paths/safe values only
  error: { code; message; path | null } | null
}
```

## Independence

- A **separate** contract from `003`'s `JsonEnvelopeV1`; it does NOT extend or modify it. `003`/`004`/
  `006`/`007` JSON outputs remain byte-stable.
- Shares the `formatVersion: "1.0.0"` convention but has its own `command` union and `result` DTO.

## Invariants

- Deterministic serialization: `JSON.stringify(envelope, null, 2) + "\n"`, UTF-8, no BOM, single LF.
- Logical relative/token paths only; never absolute paths, cwd, hostname, raw bytes, parsed source,
  `Error`, stack traces or secrets.
- Null policy: stable-but-absent → `null`; empty collection → `[]`; empty record → `{}`; no `undefined`.
- Property order is contractual and stable across runs.
- `token-plan` and `token-apply` both emit the diff/summary; expected outcomes ⇒ envelope on stdout,
  stderr empty; `internal-error` ⇒ envelope on stderr, exit 70.
