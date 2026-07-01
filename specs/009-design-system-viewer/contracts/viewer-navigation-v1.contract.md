# Contract: ViewerNavigationV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectNavigation`)
- **Consumers**: UI shell (nav/menu), HTTP JSON API

## Shape

```text
ViewerNavigationV1 {
  sections: ViewerSectionSummary[]
}

ViewerSectionSummary {
  id: ViewerSectionId   // overview | colors | typography | spacing | radius | borders | shadows | motion
                         // | aliases | foundations | assets | presets | issues | build
  count: number
  state: ViewerStateV1
}
```

## Provenance

`sections` is a fixed-order array (the canonical `ViewerSectionId` order above), one entry per section;
`count` is always a pass-through of a count already computed for `ViewerOverviewV1` (e.g. `colors.count`
= the `color` category's token count from `004`'s `FoundationsSummary`); `state` is the same
`ViewerStateV1` the section's own view would show (usually `ready`/`empty`, `partial` only if the
underlying category/asset/preset read itself came back `partial`/degraded).

## Invariants

- `sections` MUST contain exactly one entry per `ViewerSectionId`, in the fixed canonical order — no
  reordering by usage/recency, no omission.
- `count` MUST equal the corresponding `ViewerOverviewV1`/`ViewerFoundationV1` count for the same session
  (SC-003); it is never independently computed.
- Navigation projection MUST NOT trigger any additional Core use-case call beyond the session's initial
  load (FR-016/SC-006) — it is derived entirely from already-loaded data.

## Exclusions

No absolute paths, `Error`/stack, raw bytes, secrets.
