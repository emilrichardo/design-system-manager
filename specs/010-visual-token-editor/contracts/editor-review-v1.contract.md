# Contract: EditorReviewV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: Editor preview flow after calling `planTokenMutation`
- **Consumers**: visual diff, approval dialog, tests

## Shape

```text
EditorReviewV1 {
  result: TokenMutationResultV1
  plan: TokenMutationPlanV1 | null
  diff: TokenMutationDiffV1 | null
  conflicts: MutationIssue[]
  warnings: MutationIssue[]
  canApprove: boolean
  expired: boolean
}
```

## Diff Requirements

The visual diff must display every category present in `TokenMutationDiffV1.summary`:

```text
tokens added
tokens updated
renames
moves
aliases modified
metadata
groups
removals
dependents
conflicts
warnings
```

## Invariants

- The diff is non-editable. Editing after review must return to draft and produce a new plan.
- `canApprove === true` only when `result.outcome === "planned"`, `plan !== null`, `plan.writable === true`
  and `expired === false`.
- `expired === true` blocks approval and requires refresh/re-plan.
- `conflicts` and `warnings` use the `008` codes/order whenever provided.
- Dependents shown for removal/rename/move come from the `008` result, never from a UI alias walk.

## Exclusions

No hidden mutation, no row-level partial approval, no direct edit of `before`/`after` values.
