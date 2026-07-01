# Contract: ViewerOverviewV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectOverview`)
- **Consumers**: UI Overview screen, HTTP JSON API, MCP/agent consumers

## Shape

```text
ViewerOverviewV1 {
  validation: { state: ViewerStateV1; errorCount: number; warningCount: number }
  tokens: { total: number; primitive: number; semantic: number; unclassified: number }
  groups: { total: number }
  aliases: { total: number; valid: number; broken: number }
  foundations: { categories: { absent: number; partial: number; complete: number; invalid: number } }
  assets: { totalAssets: number; byKind: Record<AssetKind, number>; totalByteLength: number }
  presets: { total: number; outcome: "success" | "invalid-preset" }
  issues: { total: number }
  build: { hasBuild: boolean; formats: BuildFormat[]; stale: boolean }
}
```

## Provenance (field → source; FR-005)

| Field group | Source |
|---|---|
| `validation` | `002` `ValidationReport` / `DesignSystemAnalysis.errors`/`warnings` |
| `tokens` | `004` `FoundationsSummary.tokens` |
| `groups` | `002` analysis node count of non-`$value` nodes |
| `aliases` | `002` `TokenNodeSummary.aliasState` tally over all nodes |
| `foundations.categories` | `004` `FoundationsSummary.categories` |
| `assets` | `007` `AssetsSummary` |
| `presets` | `005` `PresetListResult` |
| `issues.total` | sum of `ViewerIssueV1[]` (see `viewer-issue-v1.contract.md`) |
| `build` | `006` build/manifest snapshot read (`hasBuild`/`formats`/source-hash comparison for `stale`) |

## Null policy

Every field is a number/boolean/closed-string-union; no field is ever `undefined`. Absent data is `0`/
`false`/an empty record, never `null`, since the Overview always has a defined zero-state (`empty`).

## Invariants (SC-003)

- Every number equals the corresponding source use case's own count for the **same session load** — the
  Overview MUST NOT recompute a count independently.
- `assets.byKind` MUST include every `AssetKind` key (`font | logo | svg | icon | image`), `0` when absent
  — a fixed-shape record, not a sparse map.
- `build.stale` MUST be `false` when `hasBuild` is `false` (no build ⇒ staleness is not applicable, not
  "true by default").

## Exclusions

No absolute paths, cwd, hostname, `Error`/stack, raw bytes, secrets, timestamps.
