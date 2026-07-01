# Quickstart: Visual Token Editor (implemented)

`010-visual-token-editor` is implemented. `neuraz-ds view` exposes the Editor alongside the read-only
Viewer, reusing `planTokenMutation`/`applyTokenMutation` from `008` without reimplementing validation,
diff or writing. These scenarios are covered by `tests/integration/editor/**`.

## Prerequisites

- Node `>=22`.
- A host project initialized with `neuraz-ds init`.
- `008-token-mutations` and `009-design-system-viewer` available in the built package.
- A valid token source at `design-system/tokens/base.tokens.json`.

## User flow

```text
neuraz-ds view
-> open local Viewer URL (http://127.0.0.1:<port>/)
-> click "Enter edit mode" on Overview
-> change value/type/alias/metadata/group in a draft form
-> POST /api/editor/plan (preview, read-only)
-> inspect non-editable diff and conflicts/warnings panel
-> approve or cancel/back-to-edit
-> POST /api/editor/apply (transactional, through 008)
-> show apply/recovery result
-> reload an independent Viewer session (GET /api/section/:id or /api/session)
```

## Scenario 1 — update a token value

1. Open the local Viewer.
2. Select `color.brand.500`.
3. Change the value using the color editor.
4. Preview.

Expected:

- The Editor sends a `TokenMutationCommandV1` with one `update-value` operation.
- The result is `planned`.
- The visual diff contains one `updated` entry.
- No file is written before approval.

After approval:

- `applyTokenMutation` returns `applied`.
- The Viewer session reloads.
- The token detail shows the updated declared/resolved/current values.

## Scenario 2 — block remove with dependents

1. Select a token referenced by one or more aliases.
2. Request removal.
3. Preview.

Expected:

- The plan returns `conflict` with `removal-with-dependents`.
- Dependent logical paths are shown.
- There is no force action.
- Apply is disabled.
- The source is unchanged.

## Scenario 3 — rename with reference rewrite

1. Select a referenced token.
2. Rename it.
3. Preview.

Expected:

- The diff shows one `renamed` entry.
- The diff also shows every `alias-changed` entry returned by `008`.
- The user can approve, cancel or return to editing.

## Scenario 4 — source changed concurrently

1. Preview a valid edit.
2. Change the token source outside the Editor before approval.
3. Approve.

Expected:

- Apply returns a conflict equivalent to `concurrent-source-change`.
- The Editor shows `source changed concurrently`.
- The user must refresh/re-plan.
- No automatic retry occurs.

## Scenario 5 — verification error and recovery

Use fault injection in tests to make post-write verification fail.

Expected:

- The result shows `verification-error`.
- `backup available`, `source available` and `recovery required` are displayed explicitly.
- The error is not hidden behind a generic toast.

## Scenario 6 — accessibility

Complete create/edit/preview/approve/cancel and move token/group flows using only keyboard controls.

Expected:

- Focus is visible.
- Controls have labels.
- Errors are associated with controls.
- Drag and drop is optional only; a non-drag move path exists.
- Success, conflict and recovery states are announced.

## Validation Commands

Every checkpoint (and the final close) runs:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm pack --dry-run --json
git diff --check
```

Supervisor commands for this closed feature:

```bash
npm run agent:status -- --feature 010-visual-token-editor
npm run agent:brief -- --feature 010-visual-token-editor   # rejects further work once closed
```
