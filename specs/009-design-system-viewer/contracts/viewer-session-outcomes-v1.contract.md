# Contract: ViewerSessionV1 and outcomes/states

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`buildViewerSession`)
- **Consumers**: local HTTP adapter, UI bundle, MCP/agent consumers, tests

## Shape

```text
ViewerSessionV1 {
  state: ViewerStateV1
  host: { initialized: boolean }
  overview: ViewerOverviewV1 | null   // null only for not-found / read-error
  navigation: ViewerNavigationV1 | null
}
```

## States (project, never invent — FR-007)

```text
loading | ready | empty | invalid-design-system | not-found | read-error | partial
```

`loading` exists only at the adapter/UI boundary, before the session promise resolves; it is never a field
value inside a resolved `ViewerSessionV1`.

## Outcome mapping (source of truth: `002` `AnalysisOutcome`, plus one derived judgment)

| Source outcome | ViewerStateV1 |
|---|---|
| `valid` (and any of tokens/assets/presets > 0) | `ready` |
| `valid` (and tokens = 0 and assets = 0 and presets = 0) | `empty` |
| `complete-invalid` | `invalid-design-system` |
| `partial` | `partial` |
| `not-found` | `not-found` |
| `read-error` | `read-error` |

The mapping MUST be exhaustive; adding a `002` outcome without mapping it here is a defect. No other
Viewer state exists; `success`/`blocked`/`partial-data` (not backed by a real outcome) are forbidden.

## Invariants

- `overview`/`navigation` are non-`null` for every state except `not-found`/`read-error` (nothing to
  project in those two).
- `partial` still carries a non-`null` `overview`/`navigation` built from whatever `002`/`004` recovered
  (never a blank screen — spec User Story 11).
- Building a `ViewerSessionV1` MUST NOT write, delete or modify any file (spec FR-004); this contract
  carries no field that could indicate a write occurred (no `wrote`/`recovery`/backup fields — unlike
  `005`–`008`'s mutating contracts, the Viewer never writes).
- `state` MUST be derivable from already-returned outcomes only; it MUST NOT depend on a Viewer-specific
  re-validation of the source.

## Exclusions

No absolute paths, cwd, hostname, `Error`/stack, raw bytes, secrets, timestamps, process/runtime details.
