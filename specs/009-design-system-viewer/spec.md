# Feature Specification: Design System Viewer

**Feature Branch**: `009-design-system-viewer`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Provide a local, 100% read-only visual projection of the Design System — Overview, Colors,
Typography, Spacing, Radius, Borders, Shadows, Motion, Aliases, Foundations, Assets, Presets, Issues,
Build artifacts — for designers, developers, brand owners, a Design System administrator, and an external
agent/application (MCP-style consumer). The Viewer consumes **only** the existing headless use
cases/contracts of `002` (validate/inspect), `003` (JSON), `004` (foundations), `005` (presets), `006`
(build/export), `007` (assets) and `008` (token mutations/diff model, read-only: `plan`/inspection shapes,
never `apply`). It MUST NOT parse internal files directly and MUST NOT write to the filesystem. It is a
**new read projection layer**, not a reimplementation of any closed feature's logic. Out of scope: Visual
Token Editor, asset editing, preset authoring, Figma, scraping, image analysis, AI, candidate approval,
cloud collaboration, authentication, multi-user, automatic Git commits. Closed features `001`–`008` keep
their behavior and byte-stability; this feature never touches `design-system/**`.

---

## Concepts & Definitions *(mandatory context)*

This feature adds the first UI-facing layer envisioned in
[`docs/product/vision.md`](../../docs/product/vision.md) §4 ("Visualizador del Design System"), built
strictly on top of the Core's existing headless use cases, per
[`docs/product/architecture-guardrails.md`](../../docs/product/architecture-guardrails.md) rules 1–5
(Core headless-first, no React/browser in Core, CLI/MCP/Studio reuse the same use cases, UI is a client
not an authority, filesystem stays behind ports).

| Concept | Defines | Owns | In scope here? |
|---|---|---|---|
| **Viewer session** | One in-memory aggregate of every reused use case's result, built once per launch/refresh. | The single semantic load. | **Yes — this feature.** |
| **Viewer projection** | A `ViewerXxxV1` contract deriving from an existing public DTO (never a new domain concept). | The shape shown to the UI. | **Yes — this feature.** |
| **Viewer application adapter** | The framework-agnostic layer that calls Core use cases and builds projections. | Orchestration, caching, search/filter, navigation state. | **Yes — this feature.** |
| **Viewer UI** | The visual shell (Overview/Colors/Typography/…) that renders projections. | Presentation, accessibility, interaction. | **Yes — this feature (design + contracts now; implementation deferred to checkpoints).** |
| **Token source (DTCG)** | `design-system/tokens/base.tokens.json`. | Canonical tokens. | **Read-only reuse via `002`/`004`/`006`/`008`; never mutated here.** |
| **Assets / Presets / Build artifacts** | Managed by `007`/`005`/`006` respectively. | Their own domains. | **Read-only reuse; never mutated here.** |
| **Candidate / mutation plan** | `008`'s `TokenMutationPlanV1`/diff model. | Future editing. | **Vocabulary reused for the Aliases "potential impact" view; no `apply`, no candidate approval.** |

**Product problem solved**: today the only way to see a Design System's state is the CLI's human-readable
text output or raw JSON envelopes (`003`). There is no visual, navigable, searchable projection a
designer, brand owner or non-technical stakeholder can use, and no stable read-only contract an external
agent/MCP-style consumer can render without re-implementing the CLI's presentation logic. This feature
gives every consumer (human or agent) one shared, versioned, read-only view model over the same Core
results the CLI already produces — without adding a second source of truth or a second parsing/validation
engine.

### Read-only invariant

The Viewer MUST NOT: edit tokens, mutate assets, apply presets, write any file, or approve mutation
candidates. All of that belongs to `008` (headless mutation API, already closed) and the future
`010-visual-token-editor`. This feature is 100% read/query. It calls `planTokenMutation`-shaped read
models only insofar as `008` already exposes safe, read-only diff/plan projections for a *hypothetical*
rename/move impact preview (see US7); it never calls `applyTokenMutation` and never persists a command.

### Forbidden dependencies (architecture invariants — testable in later checkpoints)

- `Viewer UI → fs direct` — forbidden. The UI never imports `node:fs`/`node:path` for Design System data.
- `Viewer UI → JSON.parse of internal files` — forbidden. The UI never parses
  `design-system/**` documents itself; it only consumes `ViewerXxxV1` projections already parsed/validated
  by the Core.
- `Viewer UI → writer` — forbidden. No write port is ever imported by the UI or the viewer application
  adapter.
- `Viewer UI → Commander` — forbidden. The viewer application adapter has no CLI parsing dependency.
- `Core → React` — forbidden. No domain/application module imports a UI framework.
- `Core → browser` — forbidden. No domain/application module imports `window`/`document`/DOM/browser APIs.
- The viewer application adapter (conceptually `src/application/viewer/**`) MUST remain framework-agnostic:
  it may depend on `002`/`003`/`004`/`005`/`006`/`007`/`008` application ports and domain types, and on
  nothing else. Only an infrastructure/CLI-or-server adapter and the UI itself may know about a concrete
  UI/server technology (see [`plan.md`](plan.md), [`research.md`](research.md)).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a local Design System (Priority: P1)

A user (designer, developer, brand owner, DS administrator) launches the Viewer against a local, already
initialized Design System and lands on a working shell without any write occurring.

**Why this priority**: Everything else depends on a successful, safe session bootstrap.

**Independent Test**: Launching the Viewer against a valid Design System reaches `ready` with zero bytes
written anywhere under the host root; launching against an absent/invalid one reaches the matching state
(`not-found`/`invalid-design-system`/`read-error`) without writing anything either.

**Acceptance Scenarios**:

1. **Given** a valid, initialized Design System, **When** the Viewer opens it, **Then** the session
   reaches `ready` and the host root is byte-identical before and after.
2. **Given** no Design System at the resolved root, **When** the Viewer opens it, **Then** the session
   reaches `not-found` and nothing is written.

---

### User Story 2 - View the Overview (Priority: P1)

A user sees, on one screen, validation status, token count, groups, aliases, foundations summary, assets
summary, presets summary, issues summary and the last build status.

**Why this priority**: The Overview is the single-glance entry point every other view links from.

**Independent Test**: Opening a Design System with tokens, assets, a build and issues shows an Overview
whose every count matches the underlying `002`/`004`/`005`/`006`/`007` results for the same session.

**Acceptance Scenarios**:

1. **Given** a Design System with known counts, **When** the Overview renders, **Then** every summary
   number equals the corresponding reused use case's count for the same load (no independent recount).
2. **Given** a Design System with no prior build, **When** the Overview renders, **Then** the "last build
   status" area shows a defined empty state, not an error.

---

### User Story 3 - Explore colors (Priority: P1)

A user browses color tokens as swatches with value, aliases, roles and accessibility state, and inspects
text/background combinations against the declared contrast policy.

**Why this priority**: Colors are the highest-traffic, most visual foundation category.

**Independent Test**: The Colors view lists every `color` category token from the foundations projection
with a swatch, its resolved value, and a contrast state per policy (`pass`/`fail`/`not-computable`), with
no color recomputed by a second engine.

**Acceptance Scenarios**:

1. **Given** two color tokens usable as text/background, **When** a combination is inspected, **Then** the
   view reports the WCAG 2.1 AA contrast ratio and pass/fail per the policy in
   [Colors & contrast policy](#colors--contrast-policy).
2. **Given** a color token whose resolved value cannot be reduced to sRGB (e.g. broken alias), **When**
   contrast is requested, **Then** the state is `not-computable` — never a guessed ratio.

---

### User Story 4 - Explore typography (Priority: P1)

A user browses typography tokens (family, weight, style, size, line height, letter spacing), sees a live
preview, and — when a matching font asset exists — sees its license/provenance.

**Why this priority**: Typography is the second most-used foundation and the one most tied to assets and
licensing.

**Independent Test**: A typography token that references a `fontFamily`/`typography` value shows every
declared sub-value; when a `007` font asset's family matches, its license/provenance is shown; when none
matches, the view says so explicitly (never a guessed license).

**Acceptance Scenarios**:

1. **Given** a `typography` composite token, **When** inspected, **Then** every declared field (family,
   weight, style, size, line height, letter spacing) is shown from the resolved value with no recomputation.
2. **Given** a typography token whose family matches an unlicensed (`unspecified`) font asset, **When**
   inspected, **Then** the license state is shown as `unspecified` — never a filled-in guess.

---

### User Story 5 - Explore spacing, radius, borders, shadows and motion (Priority: P1)

A user browses each remaining foundation category (spacing, radius, borders, shadows, motion) with a
dedicated view listing its tokens, values, levels (primitive/semantic/unclassified) and issues.

**Why this priority**: Parity across all nine foundation categories is required scope, not just color/type.

**Independent Test**: Each category view lists exactly the tokens `004`'s foundations projection assigns
to that category, with the same counts as the Overview's per-category breakdown.

**Acceptance Scenarios**:

1. **Given** a Design System with tokens in every category, **When** each category view is opened, **Then**
   its token list and counts match the `004` `FoundationCategoryInspection` for that category exactly.

---

### User Story 6 - Inspect a single token (Priority: P1)

A user opens one token and sees its logical path, category, primitive/semantic/unclassified level,
declared value, resolved value, effective type (and origin), immediate alias target, full alias chain,
description and metadata — in one place.

**Why this priority**: The detail view is the shared destination every list/search/alias view links into.

**Independent Test**: Opening any token from any list view (Colors/Typography/.../Aliases/search) reaches
the same `ViewerTokenV1` shape with all fields sourced from the single session load, never a fresh read.

**Acceptance Scenarios**:

1. **Given** a concrete token, **When** inspected, **Then** declared value, resolved value, effective type
   and origin, category, level and description match the session's `002`/`004`/`006` projections exactly.
2. **Given** an alias token, **When** inspected, **Then** the immediate target and the full resolved chain
   are both shown, and a broken/cyclic alias is shown as such (never silently resolved to a guessed value).

---

### User Story 7 - Navigate aliases (Priority: P1)

A user follows a token's alias origin, immediate target, full chain, and sees every dependent (what would
be affected by a future rename/move) — informationally only.

**Why this priority**: Alias integrity is a core Core guarantee (`008`); making it visible is central to
trust in the Design System.

**Independent Test**: For a token referenced by two other aliases, the Aliases view lists both dependents
and, when requested, shows the same "would rewrite N references" impact preview `008`'s read-only plan
projection would compute for a hypothetical rename — without ever calling `apply` or persisting anything.

**Acceptance Scenarios**:

1. **Given** a token with two dependents, **When** its alias view opens, **Then** both dependents are
   listed with their logical paths.
2. **Given** a cyclic or missing alias, **When** inspected, **Then** the state is shown as `cyclic`/
   `missing` with the offending path — never resolved to a guessed value and never auto-fixed.

---

### User Story 8 - Explore assets (Priority: P2)

A user browses fonts/logos/svg/icons/images with dimensions, MIME, hash, license, provenance,
sanitization status and ownership, reusing `007`'s existing read use cases only.

**Why this priority**: Assets are a first-class, separately-governed surface (guardrail 6) that must be
visible without becoming a second Asset Manager.

**Independent Test**: The Assets view's list and per-asset detail match `007`'s `AssetListResult`/
`AssetInspectResult` exactly (same records, same conflicts) with no second store observation.

**Acceptance Scenarios**:

1. **Given** an SVG asset, **When** inspected, **Then** its sanitization status (`safe`/removed items) from
   `007` is shown as-is, never recomputed.
2. **Given** an asset with `unspecified` license, **When** inspected, **Then** the license state is shown
   as `unspecified` — never assumed as permitted.

---

### User Story 9 - View issues (Priority: P1)

A user sees one consolidated view grouping errors, warnings, conflicts, invalid aliases, unsafe assets,
unknown licenses and stale build state.

**Why this priority**: A single triage surface is the most concrete value-add of a viewer over raw CLI
text output.

**Independent Test**: The Issues view's total count equals the sum of `002` errors/warnings + `004`
foundation issues + `007` asset conflicts + a "stale build" flag derived from `006`'s existing
source-hash-vs-manifest comparison, with no independent issue engine.

**Acceptance Scenarios**:

1. **Given** a Design System with a broken alias, an unsafe SVG and a stale build, **When** the Issues view
   opens, **Then** all three appear, each attributed to its source use case (`002`/`007`/`006`).

---

### User Story 10 - Search and filter (Priority: P2)

A user searches tokens/assets/foundations by path, name, category, level, type or issue, across the
single loaded session, without triggering a second read.

**Why this priority**: Required for any dataset beyond a handful of tokens.

**Independent Test**: Searching by a path substring returns the same tokens the Overview counted, filtered
client-side against the already-loaded session; no additional Core call is issued per keystroke.

**Acceptance Scenarios**:

1. **Given** a loaded session, **When** the user types a query, **Then** results update from the in-memory
   projection only (verified by observing zero additional reused-use-case invocations while typing).

---

### User Story 11 - Show empty/error states (Priority: P1)

A user sees a clear, specific state for every non-`ready` situation: `loading`, `empty`,
`invalid-design-system`, `not-found`, `read-error`, and `partial` (only where an underlying use case
already returns a partial/recoverable result).

**Why this priority**: Silent failure or a generic error erodes trust; each state must map to a real,
already-defined outcome.

**Independent Test**: Every state the Viewer can show is traceable to an existing outcome of `002`/`004`/
`005`/`006`/`007`/`008` per the table in [data-model.md](data-model.md); no new domain outcome is invented.

**Acceptance Scenarios**:

1. **Given** `002` returns `partial` (structural state), **When** the Viewer session loads, **Then** the
   Viewer shows `partial` and still renders whatever the partial inspection recovered (never a blank
   screen).
2. **Given** a Design System with zero tokens/groups/assets/presets, **When** the Overview loads, **Then**
   the state is `empty`, distinct from an error.

---

### User Story 12 - Work offline (Priority: P2)

A user opens and browses the Viewer with no network access at all.

**Why this priority**: Local-first is a non-negotiable product principle (constitution XIII; guardrail 1).

**Independent Test**: The Viewer's session load, every view render, search and navigation complete with
the host machine's network interfaces disabled.

**Acceptance Scenarios**:

1. **Given** no network access, **When** the Viewer is used end-to-end (open → browse every view →
   search), **Then** every action succeeds identically to the networked case.

---

### User Story 13 - Consume headless use cases (Priority: P1)

An external agent or application (MCP-style consumer) or the future Studio calls the same viewer
application adapter functions the UI calls, and gets the same `ViewerXxxV1` structured data with no
Commander/process/TTY/React/browser dependency.

**Why this priority**: Guardrail 3 — one source of behavior across every surface; this is the traceability
anchor from the architecture section back to the Core.

**Independent Test**: Every viewer projection function is invoked directly (no CLI, no server, no browser)
in a test and returns the same structured `ViewerXxxV1` shape a UI render would consume.

**Acceptance Scenarios**:

1. **Given** the viewer application adapter, **When** invoked from a non-UI caller, **Then** it returns
   plain structured `ViewerXxxV1` data, sourced only from `002`–`008` use cases.

---

### User Story 14 - Preserve zero writes (Priority: P1)

No user action in the Viewer — opening, browsing, searching, navigating aliases, inspecting a rename/move
impact preview — ever writes, deletes or modifies any file under the host root.

**Why this priority**: This is the feature's core safety contract and the reason it can ship without the
approval/review machinery `008`/future `010` require.

**Independent Test**: A full session (open + visit every view + search + inspect an alias impact preview)
leaves every file under the host root byte-identical, and the viewer application adapter never imports a
write port.

**Acceptance Scenarios**:

1. **Given** any Design System, **When** a full Viewer session runs, **Then** `design-system/**` and the
   host manifest are byte-identical before and after, and no write port is ever imported by viewer code.

---

### Edge Cases

- Host not initialized (`not-found`) → the Viewer shows `not-found` with a safe hint, never a stack trace.
- Design System present but structurally invalid (`complete-invalid` in `002` terms) → the Viewer shows
  `invalid-design-system` and still surfaces whatever `002`/`004` recovered, per FR-011.
- Structural state `partial` → the Viewer shows `partial` and renders the recoverable subset (FR-011),
  distinct from `invalid-design-system`.
- Source unreadable (`read-error`) → the Viewer shows `read-error`; no partial/garbled render.
- Zero tokens, zero assets, zero presets, no build yet → each affected view shows `empty`, not an error.
- A token whose alias is cyclic/missing/points to a group → shown as such in both the token detail and the
  Aliases view; never resolved to a guessed value (mirrors `002`'s `AliasState`).
- A color token that cannot be reduced to sRGB → contrast state `not-computable`, never a fabricated ratio.
- A typography token with no matching font asset → license/provenance area shows "no matching asset",
  never an inferred license.
- An asset store issue (`invalid-asset-store`/ownership conflict) → surfaced in the Issues view and in the
  Assets view, sourced from `007`'s existing conflicts, not recomputed.
- A stale build (source hash differs from the last build manifest's recorded source hash) → surfaced as an
  issue, derived from `006`'s existing manifest/hash comparison, never a second build attempted.
- Searching with zero matches → an explicit "no results" state, distinct from `empty` (which means the
  underlying data itself is empty).
- Any underlying use case throws unexpectedly → the viewer adapter boundary maps it to a safe
  `internal-error` (adapter-only, never a domain outcome), exactly like `002`–`008`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Viewer MUST expose Overview, Colors, Typography, Spacing, Radius, Borders, Shadows,
  Motion, Aliases, Foundations, Assets, Presets, Issues and Build-artifacts views, each backed by a
  `ViewerXxxV1` projection.
- **FR-002**: The Viewer MUST consume Design System data **only** through the existing headless use cases/
  ports of `002`/`003`/`004`/`005`/`006`/`007`/`008`; it MUST NOT parse `design-system/**` files itself and
  MUST NOT import a filesystem port directly from the viewer application layer or the UI.
- **FR-003**: The Viewer MUST perform a **single session load**: each reused use case is invoked at most
  once per session/refresh; no view triggers a second read/parse/analyze of a document another view
  already loaded in the same session.
- **FR-004**: The Viewer MUST NOT write, delete or modify any file under the host root, under
  `design-system/**`, or anywhere else, under any user action defined in this spec.
- **FR-005**: Every `ViewerXxxV1` contract MUST declare, per field: type, null policy, deterministic
  ordering (where a list), and provenance (which existing use case/DTO it projects from); see
  [data-model.md](data-model.md) and [contracts/](contracts/).
- **FR-006**: Every `ViewerXxxV1` contract MUST exclude: raw bytes, absolute paths, internal parsed
  documents, `Error`/stack traces, secrets, filesystem details (cwd, hostname, fd, mtime).
- **FR-007**: The Viewer MUST classify every session/view state using only outcomes already returned by a
  reused use case, projected 1:1 into the closed set `loading | ready | empty | invalid-design-system |
  not-found | read-error | partial`, per the mapping in [data-model.md](data-model.md); it MUST NOT
  fabricate a new domain-level outcome.
  `loading` exists only at the UI/adapter boundary (before the session load resolves); it MUST NOT be a
  value any reused use case's result carries.
- **FR-008**: The Overview MUST show, for the current session: validation status (from `002`), token/group/
  alias counts (from `002`/`006`), foundations summary (from `004`), assets summary (from `007`), presets
  summary (from `005`), issues summary (from FR-013) and the last build status (from `006`), all sourced
  from the single session load.
- **FR-009**: Token/foundation views MUST show, per token: logical path, category (`004`), primitive/
  semantic/unclassified level (`004`), declared value, resolved value (`006`), effective type and its
  origin (`002`), immediate alias target, full alias chain (`006`), description (`002`) and metadata,
  matching `ViewerTokenV1`.
- **FR-010**: The Colors view MUST show swatches, resolved value, roles (from category/level), and, for a
  chosen text/background combination, a contrast state computed per the policy in
  [Colors & contrast policy](#colors--contrast-policy) MUST be stated exactly as defined there; the actual
  contrast **computation** is deferred to an implementation task (see [tasks.md](tasks.md) Checkpoint D),
  but the policy itself MUST be unambiguous now, with no `[NEEDS CLARIFICATION]`.
- **FR-011**: The Typography view MUST show family, weight, style, size, line height, letter spacing and a
  preview for every typography-related token, and, when a `007` font asset's family matches, its license/
  provenance from `007` as-is (never inferred).
- **FR-012**: The Viewer MUST provide dedicated views for Spacing, Radius, Borders, Shadows and Motion,
  each listing exactly the tokens `004` assigns to that foundation category.
- **FR-013**: The Issues view MUST consolidate, into one list: `002` errors/warnings, `004` foundation
  issues, `007` asset conflicts/issues, invalid/cyclic/missing aliases (from `002`'s alias state), and a
  stale-build flag derived from `006`'s existing source-hash-vs-manifest comparison; it MUST NOT run a
  second validation engine.
- **FR-014**: The Assets view MUST show fonts/logos/svg/icons/images with dimensions, MIME, hash, license,
  provenance, sanitization status and ownership state, sourced 1:1 from `007`'s `AssetRecord`/
  `AssetInspection`/`AssetListResult`/`AssetInspectResult`.
- **FR-015**: The Aliases view MUST show, per token: origin, immediate target, full chain, dependents, and
  cycle/invalid-reference state (from `002`'s alias graph); it MAY show a read-only "potential impact of a
  future rename/move" preview sourced from `008`'s read-only plan/diff shapes, computed without ever
  calling `applyTokenMutation` and without persisting any command.
- **FR-016**: The Viewer MUST support search/filter across tokens, assets and foundations by path, name,
  category, level, type and issue, operating only on the already-loaded session (FR-003); it MUST NOT
  issue an additional Core call per keystroke or per filter change.
- **FR-017**: The Viewer MUST render deterministically ordered lists (matching the ordering already
  guaranteed by the reused use case, e.g. document order for tokens, `FOUNDATION_CATEGORY_IDS` order for
  categories, `ASSET_KINDS` order for assets).
- **FR-018**: The Viewer MUST handle large datasets without a second read: pagination/virtualization/lazy
  rendering are UI-layer concerns operating on the single in-memory session projection.
- **FR-019**: The Viewer application layer (conceptually `src/application/viewer/**`) MUST depend only on
  `002`–`008` application ports/domain types; it MUST NOT import Commander, `process.exit`, TTY, a UI
  framework, or a browser API.
- **FR-020**: No domain/application module (Core, including `002`–`008` and the viewer application layer)
  MUST import React, a browser API, Figma, a scraper, or an AI SDK.
- **FR-021**: The Viewer's UI and any local server/adapter MUST be able to operate fully offline; no
  outbound network call is made to render, search, navigate or refresh a session.
- **FR-022**: The Viewer MUST be accessible per the requirements in
  [Accessibility](#accessibility-mandatory), which are testable, not aspirational.
- **FR-023**: The Viewer MUST expose every projection as a plain function callable by a non-UI caller
  (CLI/MCP/test), reusing the same viewer application adapter the UI calls; it MUST NOT duplicate
  projection logic between the UI and any other adapter.
- **FR-024**: The Viewer MUST NOT implement: token/alias/group editing, asset editing, preset authoring,
  Figma import, URL/scraping import, image/screenshot analysis, AI/inference, mutation candidate approval,
  cloud collaboration, authentication, multi-user sessions, or automatic Git commits.
- **FR-025**: Every public `ViewerXxxV1` contract MUST be versioned (`V1`, conceptually `1.0.0`) and stable,
  following the versioning convention of `003`/`006`/`007`/`008`'s JSON envelopes.
- **FR-026**: The Viewer MUST use logical relative paths in every projection; it MUST NOT expose absolute
  paths, cwd, hostname, username, stack traces, or raw file bytes.

### Colors & contrast policy

This is a **spec decision**, binding for the future implementation; the computation itself is a deferred
task (see [tasks.md](tasks.md) Checkpoint D), but the policy is fully specified now:

- **Standard**: WCAG 2.1, Success Criterion 1.4.3 (Contrast — Minimum) and 1.4.11 (Non-text Contrast),
  target conformance level **AA**.
- **Formula**: relative luminance and contrast ratio computed exactly per the WCAG 2.1 §1.4.3/Appendix
  formulas, over the sRGB color space. A color value that cannot be reduced to sRGB (e.g. a broken alias,
  an unsupported color space with no sRGB fallback recorded by `002`'s analysis) yields state
  `not-computable` — never a fabricated ratio.
- **Thresholds**:
  - Normal text: ratio ≥ **4.5:1** → `pass`; below → `fail`.
  - Large text (≥24px regular weight, or ≥19px/≈14pt bold) and non-text UI components/graphics (icons,
    borders of interactive controls): ratio ≥ **3:1** → `pass`; below → `fail`.
- **Inputs**: a text/background pair is any two color tokens the user selects in the Colors view (roles
  are a display hint only; the policy applies to any pair).
- **Output shape**: `{ ratio: number | null; level: "AA-normal" | "AA-large"; state: "pass" | "fail" |
  "not-computable" }` (see `ViewerColorV1` in [contracts/](contracts/)).
- **Out of scope for this policy**: WCAG AAA thresholds, color-blindness simulation, automatic remediation
  suggestions — none are part of v1.

### Key Entities *(include if feature involves data)*

- **ViewerSessionV1**: The single-load aggregate: session outcome, host summary, and references to every
  projection below, all produced from one invocation per reused use case.
- **ViewerOverviewV1**: The Overview aggregate (validation status, counts, per-category/summary rollups).
- **ViewerNavigationV1**: The ordered set of views/sections available for the current session, with counts
  per section (for badges) and the current empty/error state per section.
- **ViewerTokenV1**: One token's full projection (path, category, level, declared/resolved value, type,
  alias chain, description, metadata) — the shared detail shape every list links into.
- **ViewerFoundationV1**: One foundation category's projection (id, state, counts, tokens, issues) — reused
  for Spacing/Radius/Borders/Shadows/Motion; Colors and Typography extend it with `ViewerColorV1`/
  `ViewerTypographyV1`.
- **ViewerColorV1**: A color swatch/contrast projection extending `ViewerTokenV1` with the contrast policy
  output for a chosen combination.
- **ViewerTypographyV1**: A typography projection extending `ViewerTokenV1` with resolved sub-fields and an
  optional linked `ViewerAssetV1` (font).
- **ViewerAliasV1**: One token's alias-centric projection (origin, immediate target, chain, dependents,
  cycle/invalid state, optional rename/move impact preview).
- **ViewerAssetV1**: One asset's projection (kind, MIME, dimensions, hash, license, provenance,
  sanitization status, ownership state) — 1:1 from `007`.
- **ViewerIssueV1**: One consolidated issue (source use case, code, severity, path, message) feeding the
  Issues view.
- **ViewerPresetSummaryV1** / **ViewerBuildStatusV1**: Overview-only rollups of `005`/`006` results (no new
  detail views required beyond what the Overview needs; full preset/build detail stays in the CLI/`005`/
  `006` for v1 — see Assumptions).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening any Design System (valid, absent, invalid, partial, unreadable) never writes a byte
  under the host root, in 100% of sessions.
- **SC-002**: Every session performs at most one invocation of each reused use case
  (`analyze`/`inspectFoundations`/`listPresets`/build-status read/`listAssets`); verified by call-count
  assertions in tests, in 100% of cases.
- **SC-003**: Every number shown in the Overview equals the corresponding reused use case's own count for
  the same session, in 100% of cases (no independent recount).
- **SC-004**: Every `ViewerXxxV1` field traces to a named existing DTO/field per
  [data-model.md](data-model.md), with zero fields invented without provenance.
- **SC-005**: Every Viewer UI state shown is one of `loading | ready | empty | invalid-design-system |
  not-found | read-error | partial`, and each maps to a real existing outcome per FR-007, in 100% of
  cases — zero fabricated states.
- **SC-006**: Search/filter interactions issue zero additional Core use-case calls beyond the session's
  initial load, in 100% of interactions.
- **SC-007**: A full Viewer session (open + every view + search + alias impact preview) leaves
  `design-system/**` and the host manifest byte-identical, in 100% of sessions.
- **SC-008**: The contrast policy's formula/thresholds/output shape are fully specified with zero
  `[NEEDS CLARIFICATION]` markers; the computation task is clearly deferred, not the policy.
- **SC-009**: Every public contract excludes raw bytes, absolute paths, `Error`/stack traces and secrets,
  verified by a contract-shape test in the future implementation.
- **SC-010**: The Viewer operates fully offline: 100% of defined user actions succeed with network
  interfaces disabled.
- **SC-011**: The viewer application layer imports zero of: Commander, a UI framework, a browser API, a
  write port — verified by an architecture/lint check (extending the existing `scripts/arch-guard.mjs`
  pattern) in the future implementation.

## Accessibility *(mandatory)*

Per constitution Principle X (accessibility as a structural requirement, not an afterthought) and the
product guardrails, the Viewer UI (once implemented) MUST satisfy, testably:

- **Keyboard navigation**: every interactive element (nav, list item, search box, filter, alias link,
  color-combination picker) MUST be reachable and operable via keyboard alone, in a logical tab order that
  follows the visual/semantic structure.
- **Visible focus**: every focusable element MUST show a visible focus indicator meeting the WCAG 2.1 AA
  non-text contrast threshold (≥3:1) against its background, in every theme the Viewer itself uses to
  render its own UI (not the Design System's own tokens, which may fail contrast — that is what the Issues
  view reports, not a Viewer UI bug).
- **Contrast**: the Viewer's own chrome (nav, labels, buttons) MUST meet WCAG 2.1 AA (4.5:1 normal text,
  3:1 large text/non-text) independent of the Design System being viewed.
- **Semantic structure**: views MUST use semantic landmarks/headings (nav/main/heading levels) reflecting
  Overview → category → token/asset detail nesting, so a screen reader user can navigate by structure.
- **Screen reader support**: swatches, icons and non-text status indicators (pass/fail/not-computable,
  sanitization status, license state) MUST have an accessible text alternative; no state is color-only.
- **Reduced motion**: any transition/animation MUST respect `prefers-reduced-motion`; no motion is required
  to perceive any state change.
- **Not relying on color alone**: every pass/fail/warning/error/unspecified/not-computable state MUST be
  conveyed by text/icon/shape in addition to color.

These requirements are carried into [tasks.md](tasks.md) Checkpoint E as testable acceptance criteria for
the future implementation (not implemented in this specification phase).

## Assumptions

- The Viewer targets **one Design System per session**, matching constitution Principle I; multi-DS/
  workspace switching is out of scope for v1.
- Preset and build **detail** views beyond the Overview rollup (full preset inspection, full build artifact
  browsing) are **not** required in v1; the Overview's `ViewerPresetSummaryV1`/`ViewerBuildStatusV1` are
  sufficient, and a dedicated deep-dive is a candidate for a future iteration, not a gap in this spec (the
  "Presets" and "Build artifacts" items in the capability list are satisfied at Overview-rollup depth for
  v1; the checkpoints leave room to extend depth without a new contract version).
- The "potential impact of a future rename/move" alias preview (FR-015) reuses `008`'s existing read-only
  plan/diff *shapes* conceptually (a hypothetical, throwaway plan computation); it does not require `008`
  to expose a new public use case — the exact wiring (call `planTokenMutation` with a synthetic, discarded
  command vs. a smaller read-only "would affect" helper) is a technical decision for `plan.md`/`research.md`,
  not a spec ambiguity: either way, `applyTokenMutation` is never called and nothing is persisted.
  A future implementer choosing the synthetic-command wiring must still verify no artifact of that
  synthetic plan is written or cached to disk (consistent with FR-004).
- The technology used to render the Viewer (local static SPA vs. thin local server vs. future Studio
  embedding) is decided in [research.md](research.md)/[plan.md](plan.md), not in this spec; this spec only
  requires that whatever is chosen keeps the Core framework-agnostic (FR-019/FR-020) and writes nothing
  (FR-004).
- "Single session load" (FR-003) means at most one invocation of each reused use case per session/refresh,
  not a single filesystem read across all of `002`–`008` combined (each of those closed features already
  guarantees its own single-read/parse/analyze internally); the Viewer's obligation is not to add a
  *second* invocation of a use case another view already triggered in the same session.
- MCP server wiring, the future Visual Token Editor, and Studio embedding are **out of scope** for this
  feature; this feature defines the contracts/application layer they will consume later (traceable via
  User Story 13), matching how `008`'s headless API anticipated its own future adapters.
