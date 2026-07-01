# Contract: EditorHttpJsonV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: local loopback editor adapter
- **Consumers**: Visual Token Editor UI, agent/local tests

## Shape

```text
EditorJsonEnvelopeV1 {
  formatVersion: "1.0.0"
  action: "editor-session" | "editor-plan" | "editor-apply" | "editor-refresh"
  state: EditorModeV1 | EditorDraftStateV1 | EditorApplyStateV1 | "internal-error"
  data: EditorSessionV1 | EditorReviewV1 | EditorApplyResultV1 | null
  error: SafeMutationError | null
}
```

## Route Concepts

```text
GET  /api/editor/session      -> current EditorSessionV1 over the Viewer session
POST /api/editor/plan         -> accepts TokenMutationCommandV1, returns EditorReviewV1
POST /api/editor/apply        -> accepts approved TokenMutationCommandV1/plan identity, returns EditorApplyResultV1
POST /api/editor/refresh      -> reloads Viewer session after apply or cancel
```

Route names are conceptual contracts; implementation may compose them differently if the same request and
response contracts are preserved.

## Invariants

- All routes are loopback-only and offline-capable, inheriting `009` server constraints.
- Write-capable routes are adapter-thin: they call `008`; they do not write directly.
- The adapter accepts structured commands only, not source JSON patches or paths to files.
- The adapter never exposes arbitrary filesystem routes, source bytes, absolute paths or generic writer
  endpoints.
- `EditorJsonEnvelopeV1` is separate from `ViewerJsonEnvelopeV1`; read state and write state are not
  conflated.

## Exclusions

No remote host binding, no authentication/cloud/multi-user state, no Git commit endpoint, no asset or
preset write routes.
