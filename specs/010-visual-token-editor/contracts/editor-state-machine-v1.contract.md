# Contract: EditorStateMachineV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: editor orchestration layer
- **Consumers**: UI, tests, future Studio integration

## State Flow

```text
view
-> edit
-> planning
-> review
-> approve | cancel | back-to-edit
-> applying
-> applied | unchanged | blocked | recovery-required
-> refresh Viewer session
-> view/edit
```

## Blocking States

```text
invalid-command
conflict
plan expired
source changed concurrently
source unavailable
write-error
verification-error
recovery-required
```

## Invariants

- `apply` is impossible unless the active review is approvable.
- Any change to a draft after review invalidates the review.
- `plan expired` and `source changed concurrently` require refresh/re-plan, not retry.
- `cancel` preserves current Viewer state and discards draft/review state.
- `back-to-edit` preserves the draft but discards the review/apply state.
- `applied` triggers Viewer reload; failure to reload is displayed separately from apply failure.

## Exclusions

No auto-apply, no partial row approval, no implicit force, no automatic destructive retry.
