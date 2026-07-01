# Contract: EditorSessionV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: Visual Token Editor application/adapter layer
- **Consumers**: local UI, local HTTP JSON API, tests, future Studio shell

## Shape

```text
EditorSessionV1 {
  viewer: ViewerSessionV1
  mode: "view" | "edit" | "review" | "applying" | "applied" | "blocked" | "recovery-required"
  draft: EditorCommandDraftV1 | null
  review: EditorReviewV1 | null
  applyResult: EditorApplyResultV1 | null
}
```

## Invariants

- `viewer` is the current read state from `009`; it is never locally patched to simulate a write.
- `draft`, `review` and `applyResult` are editor-local candidate/write state.
- `mode === "review"` implies `review !== null`.
- `mode === "recovery-required"` implies `applyResult.recovery.recoveryRequired === true`.
- A successful apply must be followed by a Viewer session reload; a reload failure is recorded in
  `applyResult.refresh` and does not erase the apply result.

## Exclusions

No direct filesystem handles, raw bytes, absolute paths, stack traces, secrets, cwd, hostname or process
details.
