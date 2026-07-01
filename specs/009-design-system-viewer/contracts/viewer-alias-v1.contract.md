# Contract: ViewerAliasV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectAlias`, `projectRenameMoveImpactPreview`)
- **Consumers**: Aliases view, token detail screen (alias section), HTTP JSON API

## Shape

```text
ViewerAliasV1 {
  path: string
  origin: { kind: "concrete" | "alias" }
  immediateTarget: string | null
  chain: string[]
  dependents: string[]
  state: "valid" | "missing" | "to-group" | "cyclic" | "malformed" | "n/a"
  impactPreview: ViewerRenameMoveImpactV1 | null
}

ViewerRenameMoveImpactV1 {
  hypotheticalNewPath: string
  wouldRewriteReferences: string[]
  blocked: boolean
  blockingReason: MutationIssueCode | null   // e.g. "rename-collision"; reuses 008's own codes
}
```

## Provenance (field → source; FR-015)

| Field | Source |
|---|---|
| `path`, `origin.kind`, `immediateTarget`, `state` | `002` `TokenNodeSummary` |
| `chain` | `006` `ResolvedTokenRecord.aliasChain` |
| `dependents` | `008` `AnalyzedTokenSource.dependentsOf(path)` |
| `impactPreview` | a discarded, in-memory-only `008` read-only plan computation for a synthetic `rename-token`/`move-token` command (research D7) |

## Invariants (read-only guarantee)

- `impactPreview` MUST be computed **without ever calling** `applyTokenMutation`; the synthetic command and
  its resulting plan/diff MUST NOT be persisted, cached to disk, or written anywhere (spec FR-004/D7).
- `impactPreview` is `null` until the user explicitly requests a hypothetical rename/move; it is never
  precomputed for every token (would be a needless second pass over every alias per session load).
- `blocked`/`blockingReason` MUST reuse `008`'s own `MutationIssueCode` vocabulary (e.g.
  `rename-collision`, `alias-cycle`) rather than inventing Viewer-specific error codes, so the preview stays
  truthful to what `008`'s real `plan` would report.
- `dependents` MUST equal `008`'s own `dependentsOf` result for the same path in the same session — no
  independent alias-graph walk.

## Exclusions

No absolute paths, `Error`/stack, raw bytes, secrets. No persisted command/plan artifact of any kind.
