# Contract: ViewerIssueV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectIssues`)
- **Consumers**: Issues view, Overview (`issues.total`), Foundations/Assets views (nested `issues[]`),
  HTTP JSON API

## Shape

```text
ViewerIssueV1 {
  source: "validation" | "foundations" | "assets" | "aliases" | "build"
  code: string
  path: string | null
  severity: "error" | "warning"
  message: string
}
```

## Provenance (field → source; FR-013)

| `source` | Feeds from | `code` examples |
|---|---|---|
| `validation` | `002` `AnalysisIssue` (`DesignSystemAnalysis.errors`/`warnings`) | DTCG structural codes |
| `foundations` | `004` `FoundationIssue` | `foundation-level-invalid`, `foundation-type-mismatch`, … |
| `assets` | `007` `AssetIssue` | `svg-unsafe`, `license-required`, `owned-by-unknown`, … |
| `aliases` | `002` `TokenNodeSummary.aliasState` (non-`valid`/`n/a` states, surfaced as issues) | `missing`, `to-group`, `cyclic`, `malformed` |
| `build` | one Viewer-computed boolean over `006`'s existing manifest source-hash field | `stale-build` |

## Invariants (FR-013/SC-003)

- The Issues view's total count MUST equal the sum of every source's own issue/conflict count for the same
  session, **plus** the `stale-build` flag when applicable — the Viewer runs **no second validation
  engine**.
- `stale-build` is the **only** issue code this contract computes itself (a boolean hash comparison over
  values `006` already records); every other code is a direct pass-through of an existing source code.
- `severity` MUST be the source's own severity where one exists (`002`/`004`/`007`); `stale-build` is
  always `"warning"` (never blocking, since the Viewer cannot rebuild).
- Ordering is deterministic: grouped by `source` in the fixed order above, then by the source's own
  existing ordering within each group.

## Exclusions

No absolute paths, `Error`/stack, raw bytes, secrets.
