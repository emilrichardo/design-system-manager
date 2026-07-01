# Contract: EditorCommandDraftV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: Visual Token Editor controls
- **Consumers**: `planTokenMutation`, review view, tests

## Shape

```text
EditorCommandDraftV1 {
  id: string
  sourceTokenPath: string | null
  operations: TokenMutationOperationV1[]
  command: TokenMutationCommandV1 | null
  state: "clean" | "dirty" | "planning" | "planned" | "invalid-command" | "conflict" | "unchanged"
       | "expired" | "source-unavailable"
  controlErrors: EditorControlErrorV1[]
}
```

## Operation Mapping

Every visual operation maps to exactly one `008` operation kind:

```text
create token -> create-token
edit value -> update-value
edit type -> update-type
edit description -> update-description
edit category metadata -> update-category
create alias -> set-alias
remove alias -> remove-alias
rename token -> rename-token
move token -> move-token
duplicate token -> duplicate-token
remove token -> remove-token
create group -> create-group
rename group -> rename-group
move group -> move-group
remove empty group -> remove-empty-group
```

## Invariants

- `command` is exactly `TokenMutationCommandV1`; the Editor never sends another write shape.
- A draft with `command === null` cannot be planned or applied.
- Batch operations are ordered and all-or-nothing because `TokenMutationCommandV1` is ordered and
  all-or-nothing.
- Control errors are associated with a control id when possible for labels and accessible error
  relationships.
- The Editor must preserve `008` issue codes and paths rather than replacing them with generic labels.

## Exclusions

No free-form source JSON edits, raw file paths, direct writer references or arbitrary filesystem targets.
