# Contract: TokenMutationCommandV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: CLI/MCP/Studio/editor/importers (any adapter)
- **Consumers**: `planTokenMutation`, `applyTokenMutation`

## Schema Concept

```text
TokenMutationCommandV1 {
  formatVersion: "1.0.0"
  operations: TokenMutationOperationV1[]    # ordered; applied in sequence to a working model
}
```

## Invariants

- All-or-nothing: if any operation is invalid, the whole command is rejected (`invalid-command`/
  `conflict`) and nothing is written; there is no partial application.
- Operations apply in order; a later operation may depend on an earlier one in the same command.
- An empty `operations` array is a valid no-op (apply ⇒ `unchanged`).
- Pure data: no bytes, no `Error`, no absolute paths. Paths are logical token paths (`a.b.c`).
- The same command is accepted by every adapter (CLI declarative JSON file, MCP, Studio, importers): one
  shared shape.

## Notes

This is the only accepted input for mutating `design-system/tokens/base.tokens.json`. Adapters MUST build
a `TokenMutationCommandV1` and call the use cases; they MUST NOT write the file directly.
