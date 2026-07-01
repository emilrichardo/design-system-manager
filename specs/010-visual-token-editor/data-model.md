# Data Model — Visual Token Editor

Conceptual entities, fields and invariants for the Editor. Public fields use logical token paths and safe
JSON values only. Null policy: stable-but-absent -> `null`; empty collection -> `[]`; empty record -> `{}`;
never `undefined`.

## Enumerations

### EditorModeV1

`view | edit | review | applying | applied | blocked | recovery-required`

### EditorDraftStateV1

`clean | dirty | planning | planned | invalid-command | conflict | unchanged | expired | source-unavailable`

### EditorApplyStateV1

`idle | applying | applied | unchanged | source-changed-concurrently | write-error | verification-error |
recovery-required | refresh-failed`

### EditorValueTypeV1

`color | number | dimension | fontFamily | fontWeight | duration | cubicBezier | string | boolean |
readonly-composite | unsupported`

## Entities

### EditorSessionV1

| Field | Type | Provenance |
|---|---|---|
| viewer | `ViewerSessionV1` | `009` current read session |
| mode | `EditorModeV1` | editor adapter/UI state |
| draft | `EditorCommandDraftV1 | null` | user intent before preview |
| review | `EditorReviewV1 | null` | latest `008` plan result |
| applyResult | `EditorApplyResultV1 | null` | latest `008` apply result + refresh state |

Invariants: `viewer` is current read state; `draft`/`review`/`applyResult` are candidate/write state.
The Editor never mutates `viewer` locally to pretend an apply succeeded; it reloads the Viewer session
after `applied`.

### EditorCommandDraftV1

| Field | Type | Notes |
|---|---|---|
| id | string | UI-local stable id for form state; never persisted as source data |
| sourceTokenPath | string \| null | logical path of selected token/group when applicable |
| operations | `TokenMutationOperationV1[]` | ordered draft operations |
| command | `TokenMutationCommandV1 | null` | normalized command, present when draft is syntactically complete |
| state | `EditorDraftStateV1` | current planning state |
| controlErrors | `EditorControlErrorV1[]` | field-associated errors before/after plan |

Invariants: `command` is the only object sent to `008`; invalid draft state cannot apply. A batch with
one invalid operation remains one blocked command.

### EditorReviewV1

| Field | Type | Provenance |
|---|---|---|
| result | `TokenMutationResultV1` | `008` plan result |
| plan | `TokenMutationPlanV1 \| null` | pass-through from result |
| diff | `TokenMutationDiffV1 \| null` | pass-through from result |
| conflicts | `MutationIssue[]` | pass-through from result |
| warnings | `MutationIssue[]` | non-blocking issues when present |
| canApprove | boolean | true iff result outcome is `planned` and plan is writable |
| expired | boolean | adapter judgement when source identity no longer matches current session |

Invariants: The diff is non-editable; any "back to edit" action changes the draft and requires a new
plan. `canApprove:false` must disable apply.

### EditorApplyResultV1

| Field | Type | Provenance |
|---|---|---|
| result | `TokenMutationResultV1` | `008` apply result |
| state | `EditorApplyStateV1` | mapped from result outcome/issues/recovery |
| refresh | `EditorRefreshStateV1` | Viewer reload status after apply |
| recovery | `EditorRecoveryStateV1 \| null` | mapped from `result.recovery` |

Invariants: `result.wrote === true` only when `result.outcome === "applied"`. If refresh fails after a
successful apply, the successful apply result remains visible.

### EditorValueControlV1

| Field | Type | Notes |
|---|---|---|
| tokenPath | string | logical path |
| type | `EditorValueTypeV1` | supported/control/blocked state |
| declaredValue | safe JSON value | current declared value from `ViewerTokenV1` |
| resolvedValue | safe JSON value | current resolved value from `ViewerTokenV1` |
| pendingValue | safe JSON value \| null | candidate value before command creation |
| currentSource | string | source label from `ViewerTokenV1` provenance |
| candidateSource | string \| null | planned candidate source label |
| readOnlyReason | string \| null | for unsupported/composite cases |

Invariants: The control may only produce `update-value`, `set-alias` or `remove-alias` operations. It
does not write and does not validate DTCG beyond local form completeness; `008` remains authoritative.

### EditorControlErrorV1

`{ controlId: string; path: string | null; code: string; message: string; severity: "error" | "warning" }`

Invariants: Errors must be associated with controls when possible for accessibility. Codes from `008`
must be preserved rather than rewritten into generic text.

### EditorRecoveryStateV1

| Field | Type | Provenance |
|---|---|---|
| sourceAvailable | boolean | `TokenMutationResultV1.recovery.sourceAvailable` |
| backupRelativePath | string \| null | logical/relative backup path |
| recoveryRequired | boolean | `TokenMutationResultV1.recovery.recoveryRequired` |
| message | string | safe user-facing explanation |

Invariants: Backup availability and recovery requirement are never hidden. No absolute backup path is
publicly exposed.

### EditorRefreshStateV1

`{ state: "not-needed" | "reloading" | "reloaded" | "failed"; viewerState: ViewerStateV1 | null; error:
SafeMutationError | null }`

Invariants: `failed` does not imply the apply failed; it only means the post-apply Viewer reload failed.

## Operation mapping

| Visual operation | `008` operation |
|---|---|
| create token | `create-token` |
| edit value | `update-value` |
| edit type | `update-type` |
| edit description | `update-description` |
| edit category metadata | `update-category` |
| create alias | `set-alias` |
| remove alias | `remove-alias` |
| rename token | `rename-token` |
| move token | `move-token` |
| duplicate token | `duplicate-token` |
| delete token | `remove-token` |
| create group | `create-group` |
| rename group | `rename-group` |
| move group | `move-group` |
| delete empty group | `remove-empty-group` |

## Relationships to existing models

- `EditorSessionV1.viewer` embeds/references `ViewerSessionV1` from `009`; no Viewer DTO is copied.
- `EditorCommandDraftV1.command` is exactly `TokenMutationCommandV1` from `008`.
- `EditorReviewV1` displays `TokenMutationPlanV1`, `TokenMutationDiffV1` and `MutationIssue` from `008`.
- `EditorApplyResultV1` displays `TokenMutationResultV1` and recovery fields from `008`.
- `EditorValueControlV1` uses `ViewerTokenV1` current fields for declared/resolved/current/source labels.

## Exclusions

No raw bytes, absolute paths, cwd, hostname, process details, `Error`/stack, filesystem handles, direct
source JSON AST, secrets, asset bytes or Git state in public editor contracts.
