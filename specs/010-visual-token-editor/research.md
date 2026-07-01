# Research — Visual Token Editor

All decisions below inherit the closed behavior of `008-token-mutations` and
`009-design-system-viewer`. No new productive code is created by this artifact.

## D1 — Editor as a client of `008`, not a second mutation engine

**Decision**: Every edit starts as an `EditorCommandDraftV1` and is normalized into
`TokenMutationCommandV1`. Preview calls `planTokenMutation`; apply calls `applyTokenMutation`. The Editor
does not parse `base.tokens.json`, does not build candidates, does not validate aliases, and does not
calculate diffs.

**Rationale**: `008` is already the shared safe mutation API for CLI/MCP/Studio. Rebuilding it in the UI
would violate the product guardrail "UI as client, not authority" and create divergent behavior.

**Alternatives considered**: Direct JSON editing in the browser (unsafe, duplicates validation);
UI-specific planner (drift from `008`); filesystem writer in the server route (violates transactional
ownership and recovery model).

## D2 — Extend the `009` local Viewer surface instead of creating a second app

**Decision**: The Editor reuses the `009` shell, local `node:http` adapter, static TypeScript/DOM UI,
navigation, session state, search/filter and packaging model. It may add write-capable local routes or
adapter commands, but the read-only Viewer projections remain the source of visible current state.

**Rationale**: The user explicitly requires reuse of `009`; ADR-0026 already decided the local server,
vanilla UI and no new runtime dependency posture. A second app would duplicate navigation, state and
offline packaging.

**Alternatives considered**: New `neuraz-ds edit` app (duplicated shell); separate UI framework
(premature dependency); embedding a future Studio shell (not implemented).

## D3 — Explicit read/write boundary in the UI

**Decision**: The UI labels Viewer sections as current/read state and Editor panels as pending/review/apply
state. The Editor must distinguish declared value, resolved value, current value, pending value, current
source and candidate source.

**Rationale**: The constitution requires visual editing without hiding the source. Users must know whether
they are looking at current DTCG data, a resolved projection or a candidate produced by a mutation plan.

**Alternatives considered**: Inline editing directly in lists (too easy to confuse saved vs pending);
making the diff editable (would bypass the command/plan contract).

## D4 — One adapter-level approval flow

**Decision**: Plan and apply are separate adapter steps. The plan view is non-editable and can be approved,
canceled or returned to editing. Apply reuses the original structured command and current snapshot
identity semantics from `008`; if stale/concurrent, the user must refresh and re-plan.

**Rationale**: `008` already defines the approval boundary. A visual Editor must make the boundary more
visible, not weaker.

**Alternatives considered**: Auto-apply after valid form submit (unsafe); approving individual diff rows
(not supported by the all-or-nothing `TokenMutationCommandV1` contract).

## D5 — HTTP routes may be write-capable only as thin local adapters

**Decision**: If implementation adds HTTP routes, they are loopback-only and adapter-thin. They accept a
structured command, call `008`, and return versioned editor envelopes. They do not expose arbitrary file
paths, raw source bytes, or generic write endpoints.

**Rationale**: `009` only allowed `GET` because it was read-only. `010` has legitimate write behavior, but
only through the Core use cases and local approval flow. The route boundary must make mutability explicit.

**Alternatives considered**: Reusing `ViewerJsonEnvelopeV1` for mutation results (conflates read and write
contracts); generic POST body to write source JSON (forbidden).

## D6 — Type editor matrix is bounded by existing token support

**Decision**: v1 supports visual controls for `color`, `number`, `dimension`, `fontFamily`, `fontWeight`,
`duration`, `cubicBezier`, `string` and `boolean`. Unsupported/composite values are read-only or blocked
unless an existing contract already defines structured editing.

**Rationale**: The prompt explicitly forbids silently expanding the `006` matrix. Type controls are UI
affordances over existing DTCG values, not a new type system.

**Alternatives considered**: Generic JSON editor for all values (would look like direct file editing);
silent best-effort parsing of composite values (risk of invalid candidates and hidden semantics).

## D7 — Group movement must not require drag and drop

**Decision**: Move token/group operations must offer explicit path/parent selectors and keyboard
commands. Drag and drop may be added as a convenience only if the non-drag path is complete.

**Rationale**: Accessibility is structural and move operations are destructive. Pointer-only movement
would violate the feature requirements.

**Alternatives considered**: Drag-only tree editing (not accessible); free-form path only (valid but poor
for common visual workflows, so selector plus text path is preferred).

## D8 — Recovery states are first-class UI states

**Decision**: `plan expired`, `source changed concurrently`, `write error`, `verification error`, `backup
available`, `recovery required` and `source unavailable` are distinct UI states mapped from `008`
outcomes/issues/recovery fields.

**Rationale**: Hiding recovery behind a generic error would defeat the safety model of `008`.

**Alternatives considered**: Generic toast only (insufficient for high-risk writes); automatic retry of
apply (can repeat stale/destructive operations without user context).

## D9 — No new durable ADR except the editor adapter boundary

**Decision**: Most technology decisions are inherited from ADR-0026 (`009`) and `008` research. One new
ADR is warranted for the durable change from read-only Viewer to write-capable Editor adapter over the
same shell.

**Rationale**: The write-capable local UI boundary will affect future Studio/MCP integration and must be
recorded outside the feature docs.

**Alternatives considered**: Keeping the decision only in `research.md` (too transient for a boundary that
future features will reuse).
