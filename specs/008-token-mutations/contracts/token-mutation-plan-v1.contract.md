# Contract: TokenMutationPlanV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: `planTokenMutation`
- **Consumers**: `applyTokenMutation`, reporters, CLI/MCP/Studio adapters

## Schema Concept

```text
TokenMutationPlanV1 {
  operations: TokenMutationOperationV1[]    # validated, ordered
  diff: TokenMutationDiffV1
  candidateHash: string                     # SHA-256 of the serialized candidate document
  source: { logicalPath: string; contentHash: string }   # snapshot identity captured at plan time
  writable: boolean                         # false if any blocking issue exists
}
```

## Invariants

- **Read-only & deterministic**: computing a plan writes nothing; the source is byte-identical before and
  after; identical command + identical source ⇒ identical plan and diff (including `candidateHash`).
- One semantic read/analysis of the source (reuses `002`/`004`); no second parser/alias-graph/type-engine.
- The candidate document is built in memory, validated as DTCG, and hashed; it is never written by `plan`.
- `writable:false` when any blocking issue is present; the accompanying result carries the conflicts.
- Contains only logical paths and safe values; no raw bytes, absolute paths, `Error`, stack traces or the
  internal parsed document.

## apply linkage

`applyTokenMutation` re-derives an equivalent plan from the same command, re-checks concurrency via
`source` (snapshot identity), and writes only when `writable` and the source is unchanged. Re-applying a
no-op plan yields `unchanged`.
