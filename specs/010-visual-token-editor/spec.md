# Feature Specification: Visual Token Editor

**Feature Branch**: `010-visual-token-editor`

**Created**: 2026-07-01

**Status**: Draft

**Input**: Crear una interfaz visual local para crear, modificar y organizar tokens reutilizando
exclusivamente los casos de uso headless de `008-token-mutations` y el shell/proyecciones de
`009-design-system-viewer`. No implementar codigo productivo en esta fase. El flujo obligatorio es:
accion del usuario -> comando estructurado -> mutation plan -> diff visual -> validacion -> aprobacion ->
transactional apply -> verificacion -> recarga de la sesion del Viewer.

---

## Concepts & Definitions *(mandatory context)*

`010-visual-token-editor` convierte el Viewer de solo lectura (`009`) en una superficie de edicion
controlada para tokens DTCG. El Editor no es un segundo Core: es un cliente visual del Core headless
cerrado en `008`.

| Concept | Defines | Owns | In scope here? |
|---|---|---|---|
| **009 Viewer** | Lectura, exploracion, busqueda, filtros, token tree, foundation views, assets, issues y estados. | Proyecciones `ViewerXxxV1` y sesion de lectura. | Reutilizado, sin duplicar DTOs ni proyecciones. |
| **010 Editor** | Intencion visual, comandos, plan, diff, aprobacion y apply. | Estado de edicion, orquestacion de plan/apply, recuperacion visual. | Si. |
| **Structured command** | `TokenMutationCommandV1` de `008`. | La intencion normalizada del usuario. | Unica entrada aceptada para mutar tokens. |
| **Mutation plan / diff** | `TokenMutationPlanV1` y `TokenMutationDiffV1` de `008`. | Vista previa determinista y no editable. | Si, presentado visualmente. |
| **Apply result** | `TokenMutationResultV1` de `008`. | Outcome, wrote, conflicts, recovery y errores seguros. | Si, mostrado y usado para recargar el Viewer. |

**Separacion obligatoria**:

- `009 Viewer = lectura y exploracion`.
- `010 Editor = comandos, plan, diff, aprobacion y apply`.

La UI nunca edita `base.tokens.json` directamente, no usa filesystem directo, no reconstruye aliases, no
reconstruye planner/diff, no invoca writers, y no duplica logica del Core.

### Mandatory editor flow

```text
accion del usuario
-> comando estructurado
-> mutation plan
-> diff visual
-> validacion
-> aprobacion
-> transactional apply
-> verificacion
-> recarga de la sesion del Viewer
```

If any step returns `invalid-command`, `conflict`, `unchanged`, `write-error`, `verification-error`,
`source unavailable`, `plan expired` or `source changed concurrently`, the Editor must stop before the
next destructive step and present the exact safe outcome and recovery state.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit a token value through review (Priority: P1)

A user selects a token from the existing Viewer token tree, edits its value in a type-aware control,
reviews the generated plan and visual diff, approves it, and sees the Viewer session reload with the
updated value.

**Why this priority**: This is the smallest valuable editor loop and proves the complete safety flow
without adding new mutation semantics.

**Independent Test**: Updating a color token value produces a `TokenMutationCommandV1` with
`update-value`, shows a non-editable `updated` diff, writes only after approval, then reloads the session
and shows the new declared/resolved values.

**Acceptance Scenarios**:

1. **Given** a valid token, **When** the user edits its value and requests preview, **Then** the Editor
   calls the `008` plan use case and shows the resulting plan/diff without writing.
2. **Given** a planned update, **When** the user approves apply, **Then** the Editor calls the `008` apply
   use case, shows `applied`, and refreshes the Viewer session.
3. **Given** an invalid typed value, **When** the user previews, **Then** the Editor shows
   `invalid-command` with the source control error and writes nothing.

---

### User Story 2 - Create, duplicate and remove tokens safely (Priority: P1)

A user creates a new token, duplicates an existing token, or removes an unreferenced token using visual
controls, always reviewing the plan and diff first.

**Why this priority**: Token lifecycle operations are core authoring tasks and exercise add/remove safety.

**Independent Test**: Each operation produces exactly one structured command, displays added/removed diff
entries, blocks removal with dependents, and never exposes a direct file-edit path.

**Acceptance Scenarios**:

1. **Given** a destination path that does not exist, **When** the user creates or duplicates a token,
   **Then** the diff lists `added` entries before approval.
2. **Given** a token with dependents, **When** the user attempts removal, **Then** the Editor shows
   `conflict` / `removal-with-dependents` with the dependent paths and does not offer an implicit force.
3. **Given** a no-op creation batch, **When** it is applied, **Then** the result is `unchanged` and no
   write is reported.

---

### User Story 3 - Manage aliases and references (Priority: P1)

A user creates an alias, removes an alias, renames a token, or moves a token and sees every affected
reference in the visual diff before approving.

**Why this priority**: Alias integrity is the most fragile part of token editing; `008` already owns the
rules and the Editor must make them visible.

**Independent Test**: Rename/move operations show the `renamed`/`moved` entry plus every
`alias-changed` entry returned by `008`; alias cycles/type mismatches block before apply.

**Acceptance Scenarios**:

1. **Given** a token referenced by aliases, **When** the user renames or moves it, **Then** the diff lists
   all rewritten references returned by `008`.
2. **Given** a `set-alias` that would create a cycle, **When** the user previews, **Then** the Editor shows
   `invalid-command` / `alias-cycle` and writes nothing.
3. **Given** an alias token, **When** the user removes the alias, **Then** the diff shows the alias target
   removed and the resolved value inlined, as defined by `008`.

---

### User Story 4 - Organize groups (Priority: P2)

A user creates, renames, moves, or removes an empty group from the visual tree while preserving token
references and blocking destructive group deletion.

**Why this priority**: Group operations organize the editor tree and must match `008` policies.

**Independent Test**: Group rename/move rewrites descendant references through `008`; non-empty group
removal is blocked with `group-removal-non-empty`.

**Acceptance Scenarios**:

1. **Given** an empty group, **When** the user removes it, **Then** the diff shows `group-changed` and
   apply can proceed after approval.
2. **Given** a non-empty group, **When** the user requests removal, **Then** the Editor shows the blocking
   conflict and offers cancel/back-to-edit only.

---

### User Story 5 - Edit metadata and type with clarity (Priority: P2)

A user edits `$type`, `$description` and Neuraz classification metadata while clearly seeing declared,
resolved, current and pending values.

**Why this priority**: Metadata changes are common but easy to confuse with derived foundation category.

**Independent Test**: The Editor distinguishes declared value, resolved value, current value, pending
value, current source and candidate source, and never treats path-derived foundation category as a
directly editable field.

**Acceptance Scenarios**:

1. **Given** a token with inherited or alias-derived type, **When** the user opens the type selector,
   **Then** the Editor labels declared type, effective type and type origin separately.
2. **Given** an edit to category metadata, **When** the user previews, **Then** the command is
   `update-category` and the copy explains that path-derived foundation category changes require move.

---

### User Story 6 - Handle concurrency and recovery (Priority: P1)

A user can understand and recover from expired plans, concurrent source changes, write failures,
verification failures and unavailable sources.

**Why this priority**: A visual write surface is unsafe unless failure states are explicit and actionable.

**Independent Test**: A source hash change between plan and apply produces `source changed concurrently`
/ `concurrent-source-change`; a post-write verification failure shows backup availability and
`recoveryRequired` without hiding it behind a generic error.

**Acceptance Scenarios**:

1. **Given** the source changed after a plan was shown, **When** the user approves apply, **Then** apply
   is blocked and the Editor prompts to refresh/re-plan.
2. **Given** a verification error with backup available, **When** the result is shown, **Then** the Editor
   displays backup availability, recovery-required status and source availability explicitly.

---

### User Story 7 - Work accessibly without pointer-only interactions (Priority: P1)

A keyboard and screen-reader user can navigate the editor, operate every command, inspect conflicts and
approve/cancel without drag and drop.

**Why this priority**: The constitution treats accessibility as structural, and the Editor introduces
destructive actions that need strong focus and announcement behavior.

**Independent Test**: Every editor action has keyboard navigation, visible focus, labels, control-level
errors, non-drag alternatives and accessible announcements for success/conflict/recovery.

**Acceptance Scenarios**:

1. **Given** a keyboard-only user, **When** they create, edit, preview, approve or cancel, **Then** every
   step is reachable without pointer or drag and drop.
2. **Given** a conflict or recovery state, **When** it appears, **Then** it is announced accessibly and
   focus moves to the relevant region.

### Edge Cases

- Plan expired before approval.
- Source changed concurrently between plan and apply.
- Command invalid because of path, type, alias, collision or unsupported value.
- Conflict from remove-with-dependents, non-empty group removal, rename/move collision.
- No-op plan/apply returns `unchanged`.
- Write error before commit point.
- Verification error after commit point with backup available and recovery required.
- Source unavailable or unreadable during preview or refresh.
- Unsupported or composite DTCG type opened in the editor.
- Batch command containing one invalid operation must produce zero writes.
- UI refresh fails after successful apply; apply result must remain visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Editor MUST reuse the `009` visual shell, local server, navigation, token tree,
  foundation views, assets, issues, search, filters, loading/error/empty states, accessibility baseline
  and offline packaging.
- **FR-002**: The Editor MUST reuse `009` Viewer projections instead of duplicating DTOs or rebuilding
  token/foundation/asset/read models.
- **FR-003**: The Editor MUST convert every user action into a `TokenMutationCommandV1` before any plan
  or apply step.
- **FR-004**: The Editor MUST call `008` planning to obtain mutation plan, diff, conflicts and warnings;
  it MUST NOT reconstruct planner, diff, alias graph, validation or candidate generation.
- **FR-005**: The Editor MUST require explicit approval before apply and MUST allow cancel and
  back-to-edit from the review step.
- **FR-006**: The visual diff MUST be non-editable and MUST display tokens added, tokens updated,
  renames, moves, aliases modified, metadata, groups, removals, dependents, conflicts and warnings when
  present.
- **FR-007**: The Editor MUST call `008` apply only after approval, using the command/plan identity needed
  to detect stale or concurrent source changes.
- **FR-008**: After `applied`, the Editor MUST reload the Viewer session and show the refreshed current
  state; if reload fails, it MUST keep the apply result visible.
- **FR-009**: The Editor MUST support visual operations: create token, edit value, edit type, edit
  description, edit category metadata, create alias, remove alias, rename token, move token, duplicate
  token, remove token, create group, rename group, move group and remove empty group.
- **FR-010**: The Editor MUST preserve all `008` policies: rename/move update references, remove with
  dependents blocks, remove-alias inlines resolved value, non-empty groups block, collisions block, no
  implicit force, invalid batch writes zero files.
- **FR-011**: The Editor MUST distinguish declared value, resolved value, current value, pending value,
  current source and candidate source in token detail/review views.
- **FR-012**: Type editors MUST exist for `color`, `number`, `dimension`, `fontFamily`, `fontWeight`,
  `duration`, `cubicBezier`, `string` and `boolean`.
- **FR-013**: Composite or unsupported types MUST be read-only or explicitly blocked unless `006`/DTCG
  contracts already define a supported structured editing path; the Editor MUST NOT silently expand the
  `006` support matrix.
- **FR-014**: The Editor MUST expose views/states for detail editor, value editor, type selector, alias
  selector, metadata, group administration, mutation plan, visual diff, conflicts, warnings, approval,
  apply result, concurrency, verification error and recovery required.
- **FR-015**: The Editor MUST surface `plan expired`, `source changed concurrently`, `invalid command`,
  `conflict`, `unchanged`, `write error`, `verification error`, `backup available`, `recovery required`
  and `source unavailable` as distinct states/messages.
- **FR-016**: The UI MUST NOT directly import or use `node:fs`, direct filesystem paths, writer adapters
  or direct `base.tokens.json` parsing for editor operations.
- **FR-017**: Public editor contracts MUST expose logical paths and safe values only; no absolute paths,
  raw bytes, `Error`, stack traces, secrets, cwd, hostname or process details.
- **FR-018**: The local HTTP/JSON adapter MUST remain loopback-only and offline-capable, inheriting the
  `009` packaging model.
- **FR-019**: Accessibility MUST include keyboard navigation, visible focus, labels, control-associated
  errors, screen-reader support, contrast, reduced motion and announcements for success, conflict and
  recovery.
- **FR-020**: The Editor MUST provide non-drag alternatives for all move/reorder operations.
- **FR-021**: The Editor MUST NOT implement asset editing, preset authoring, Figma, scraping, image
  analysis, AI, multi-user collaboration, cloud sync, authentication, Git commits, multi-theme editing or
  component editing.
- **FR-022**: The Editor MUST keep the Core/framework boundary intact: no React/browser/DOM/Commander in
  domain/application Core; UI/server concerns stay in infrastructure/adapter layers.

### Key Entities

- **EditorSessionV1**: A Viewer session plus editor-local pending command/review/apply state.
- **EditorCommandDraftV1**: The structured visual intent before preview, mapped to
  `TokenMutationCommandV1`.
- **EditorReviewV1**: Non-editable plan/diff/conflict/warning projection returned by `008`.
- **EditorApplyResultV1**: Presentation of `TokenMutationResultV1` plus refresh state.
- **EditorValueControlV1**: Type-specific control state for supported DTCG value types.
- **EditorRecoveryStateV1**: Visual recovery details derived from `TokenMutationResultV1.recovery`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of write-capable UI flows pass through preview and explicit approval before any apply
  call is made.
- **SC-002**: 100% of supported operations listed in FR-009 can be completed or blocked with a specific
  `008` outcome and safe message.
- **SC-003**: For rename/move/remove/alias flows, the visual diff matches the `008` diff entry count and
  affected logical paths exactly.
- **SC-004**: A failed preview, conflict, concurrent change, write error or verification error produces
  zero additional writes from the Editor layer.
- **SC-005**: A successful apply reloads the Viewer session and shows refreshed token data in the same
  user journey.
- **SC-006**: Every supported type editor has at least one valid and one invalid input scenario covered.
- **SC-007**: Keyboard-only users can complete create/edit/preview/approve/cancel and group movement
  alternatives without pointer or drag and drop.
- **SC-008**: No editor public contract exposes absolute paths, raw bytes, stack traces, secrets or direct
  filesystem details.
- **SC-009**: Packaging verification proves `neuraz-ds view` with the Editor remains installable from a
  real tarball and works offline on `127.0.0.1`.

## Assumptions

- The Editor is a local single-user surface over one host repository, like the Viewer.
- `008-token-mutations` and `009-design-system-viewer` are closed and authoritative; this feature extends
  them rather than changing their semantics.
- The first implementation may expose editing inside the existing `neuraz-ds view` local surface rather
  than introducing a separate command, as long as the read/write separation is explicit.
- Preset authoring, assets and component contracts stay out of scope even if their data is visible in the
  inherited Viewer shell.
