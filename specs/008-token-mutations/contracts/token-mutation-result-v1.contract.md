# Contract: TokenMutationResultV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: `planTokenMutation`, `applyTokenMutation`
- **Consumers**: reporters, exit-code mapper, CLI/MCP/Studio adapters

## Schema Concept

```text
TokenMutationResultV1 {
  outcome: "planned" | "applied" | "unchanged" | "invalid-command" | "invalid-design-system"
         | "conflict" | "not-found" | "read-error" | "write-error" | "verification-error"
  wrote: boolean
  plan: TokenMutationPlanV1 | null
  diff: TokenMutationDiffV1 | null
  conflicts: MutationIssue[]
  recovery: { sourceAvailable; backupRelativePath; recoveryRequired } | null
  source: { logicalPath; contentHash } | null
  error: { code; message; path | null; details | null } | null
}

MutationIssue { code; path | null; severity; message; blocksApply; dependents: string[] }
```

## Invariants

- `wrote:true` only for `applied`; `planned`/`unchanged`/blocked/read outcomes ⇒ `wrote:false`.
- `plan`/`diff` are present for `planned` and `applied`; absent (`null`) for hard read/validation failures.
- `conflicts` is deterministically ordered (by code, then path); `removal-with-dependents` carries the
  `dependents` list.
- Recovery semantics mirror `005`/`006`/`007`: write-error before move ⇒ `sourceAvailable:true`,
  `backupRelativePath:null`, `recoveryRequired:false`; post-write verification failure ⇒
  `verification-error`, `sourceAvailable:true`, backup retained, `recoveryRequired:true` (no auto rollback).
- Public-safe only: no absolute paths, raw bytes, `Error`, stack traces or internal parsed document.
- `internal-error` is never produced by the domain; it exists only at the adapter boundary.
