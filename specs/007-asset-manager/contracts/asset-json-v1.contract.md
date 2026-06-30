# Contract: AssetJsonEnvelopeV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: asset JSON reporter (application DTO + mapper, infrastructure serializer)
- **Consumers**: CI, agents, MCP, Studio

## Schema Concept

```text
AssetJsonEnvelopeV1 {
  formatVersion: "1.0.0"
  command: "asset-list" | "asset-inspect" | "asset-plan"
  outcome: AssetOutcome | "internal-error"
  result: { … } | null            # list/inspect/plan payload with logical paths only
  error: { code, message, path|null } | null
}
```

## Independence

- A **separate** contract from `003`'s `JsonEnvelopeV1`; it does NOT extend or modify it. `003`/`004`/`006`
  JSON outputs remain byte-stable.
- Shares the `formatVersion: "1.0.0"` shape convention but has its own `command` union and `result` DTOs.

## Invariants

- Deterministic serialization: `JSON.stringify(envelope, null, 2) + "\n"`, UTF-8, no BOM, single LF.
- Logical relative paths only; never absolute paths, cwd, hostname, username, raw bytes, parsed source,
  `Error` objects, stack traces or secrets.
- Null policy: stable-but-absent → `null`; empty collection → `[]`; empty record → `{}`; no `undefined`.
- Property order is contractual and stable across runs.
- `command` covers read/plan only; `apply`/`remove` are write operations (their machine output, if any,
  is a future concern and not part of this read-oriented envelope).
- Expected outcomes ⇒ envelope on stdout, stderr empty; `internal-error` ⇒ envelope on stderr, exit 70.
