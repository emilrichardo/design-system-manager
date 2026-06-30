# Contract: TokenMutationDiffV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: diff calculator (within `planTokenMutation`)
- **Consumers**: reporters, Studio/MCP approval views, apply verification

## Schema Concept

```text
TokenMutationDiffV1 {
  entries: TokenMutationDiffEntry[]   # deterministic order: by path, then kind
  summary: { added; updated; renamed; moved; removed; aliasChanged; metadataChanged; groupChanged }
}

TokenMutationDiffEntry {
  kind: "added" | "updated" | "renamed" | "moved" | "removed"
      | "alias-changed" | "metadata-changed" | "group-changed"
  path: string                 # logical path (post-state path for renamed/moved)
  previousPath: string | null  # for renamed/moved
  before: SafePublicValue | null
  after: SafePublicValue | null
  references: string[]         # logical paths of aliases rewritten because of this entry
}
```

## Invariants

- **Deterministic**: identical command + source ⇒ identical entries and order.
- Represents all required change kinds: added, updated, renamed, moved, removed, alias-changed,
  metadata-changed, group-changed.
- On rename/move, the entry's `references` lists every alias rewritten (update-all-affected policy); no
  alias is left dangling.
- `before`/`after` are **safe public values** (resolved/declared values, alias targets, description,
  category) — never raw bytes, internal parsed nodes, `Error`, stack traces, absolute paths or trust
  internals.
- Empty diff (`entries: []`) means a no-op (apply ⇒ `unchanged`).
