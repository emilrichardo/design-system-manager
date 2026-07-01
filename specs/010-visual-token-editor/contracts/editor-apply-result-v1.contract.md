# Contract: EditorApplyResultV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: Editor approval/apply flow
- **Consumers**: apply result view, recovery view, session refresh controller, tests

## Shape

```text
EditorApplyResultV1 {
  result: TokenMutationResultV1
  state: "idle" | "applying" | "applied" | "unchanged" | "source-changed-concurrently"
       | "write-error" | "verification-error" | "recovery-required" | "refresh-failed"
  refresh: {
    state: "not-needed" | "reloading" | "reloaded" | "failed"
    viewerState: ViewerStateV1 | null
    error: SafeMutationError | null
  }
  recovery: EditorRecoveryStateV1 | null
}
```

## Mapping

| `TokenMutationResultV1` evidence | Editor state |
|---|---|
| `outcome: "applied"` and refresh pending | `applied` with `refresh.state: "reloading"` |
| `outcome: "applied"` and refresh failed | `refresh-failed` |
| `outcome: "unchanged"` | `unchanged` |
| conflict with `concurrent-source-change` | `source-changed-concurrently` |
| `outcome: "write-error"` | `write-error` |
| `outcome: "verification-error"` and recovery required | `recovery-required` |
| `outcome: "verification-error"` without recovery required | `verification-error` |

## Invariants

- `result.wrote === true` only for `result.outcome === "applied"`.
- The Editor must not retry apply automatically after a concurrent-source-change or verification-error.
- `recovery` is present when `result.recovery !== null`.
- Backup availability and `recoveryRequired` are rendered explicitly.
- A refresh failure does not convert an `applied` result into a failed apply.

## Exclusions

No absolute backup path, stack trace, raw candidate document, or hidden retry counter.
