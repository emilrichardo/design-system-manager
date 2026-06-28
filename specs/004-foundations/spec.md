# Feature Specification: Design System Foundations

**Feature Branch**: `004-foundations`

**Created**: 2026-06-28

**Status**: Draft

**Input**: Define formally the concept of *foundations* (the visual bases of the Design System:
color, spacing, typography, radius, border, shadow, opacity, sizing, motion) — their categories,
structure, token levels (primitive / semantic), alias dependency rules, validation guarantees,
observable states and headless query capabilities — **without** defining concrete design values
(those belong to `005-presets`) and **without** breaking the closed features `001`/`002`/`003`.

---

## Clarifications

### Session 2026-06-28

- Q: How is a foundation token classified as `primitive` vs `semantic`? → A: Explicit DTCG
  `$extensions` metadata under the vendor namespace `ar.neuraz.design-system-manager`
  (`foundation.level` = `primitive | semantic`), applicable to a token or a group, with precedence
  *token own → nearest ancestor group → `unclassified`*. No inference from names, paths, prefixes,
  `$type`, alias target, or any external/duplicated registry. `base.tokens.json` stays the single
  source of truth. (Resolves FR-003; see FR-037..FR-046.)

---

## User Scenarios & Testing *(mandatory)*

> Foundations is, in this feature, a **read-only descriptive + validation** capability derived from
> the Design System already analyzed by `002`. It does not write files and does not introduce a
> second analysis of the tokens document.

### User Story 1 — List foundation categories (Priority: P1)

As a developer or automated tool, I want to know which foundation categories the manager recognizes
and which of them are present in my Design System, so I can reason about coverage.

**Why this priority**: Categories are the entry point; every other capability builds on them.

**Independent Test**: Query foundations on an initialized DS and receive the canonical list of
recognized categories, each marked present/absent, without modifying any file.

**Acceptance Scenarios**:

1. **Given** an initialized DS, **When** foundations are queried, **Then** the result lists every
   recognized category (color, spacing, typography, radius, border, shadow, opacity, sizing, motion)
   with a per-category status, in a stable order, and no file is changed.
2. **Given** a DS where only `color` has tokens, **When** foundations are queried, **Then** `color`
   is reported present and the remaining categories are reported `absent`.

---

### User Story 2 — Distinguish primitive vs semantic tokens (Priority: P1)

As a consumer, I want each foundation token classified as primitive, semantic, or unclassified, so I
can build presets and exports on a clear two-level model.

**Why this priority**: The primitive/semantic distinction is the core conceptual contribution of
foundations and the basis for alias rules.

**Independent Test**: Query foundations on a DS containing both a primitive scale and a semantic role;
each token reports a deterministic `level` without ambiguous guessing.

**Acceptance Scenarios**:

1. **Given** a token classified as primitive, **When** foundations are queried, **Then** its `level`
   is `primitive`.
2. **Given** a token classified as semantic, **When** foundations are queried, **Then** its `level`
   is `semantic`.
3. **Given** a token with no classification signal, **When** foundations are queried, **Then** its
   `level` is `unclassified` and the token is preserved (never dropped, never guessed).

---

### User Story 3 — Category completeness status (Priority: P1)

As a developer, I want to know whether each category is `absent`, `partial`, `complete`, or `invalid`,
so I can see at a glance what still needs work.

**Why this priority**: Coverage status is the headline signal for adopters and for presets.

**Independent Test**: Construct DSes exercising each status and confirm the reported per-category
status matches.

**Acceptance Scenarios**:

1. **Given** a category with no tokens, **Then** its status is `absent`.
2. **Given** a category with some but not all expected pieces (per its definition), **Then** its
   status is `partial`.
3. **Given** a category that satisfies its definition with no foundation errors, **Then** its status
   is `complete`.
4. **Given** a category containing a foundation rule violation (e.g. a forbidden alias direction),
   **Then** its status is `invalid`.

---

### User Story 4 — Validate primitive/semantic relationships (Priority: P1)

As a developer or CI process, I want foundation alias relationships validated, so misuse is caught
before presets or exports consume the tokens.

**Why this priority**: Alias correctness is what makes the two-level model trustworthy.

**Independent Test**: Provide DSes with valid and invalid alias directions; confirm violations are
reported as structured foundation issues and valid relationships pass.

**Acceptance Scenarios**:

1. **Given** `semantic → primitive`, **Then** the relationship is valid.
2. **Given** `semantic → semantic` that preserves intent and forms no cycle, **Then** it is valid.
3. **Given** `primitive → semantic`, **Then** a forbidden-direction issue is reported.

---

### User Story 5 — Detect missing references (Priority: P1)

As a developer, I want aliases that point to a non-existent token reported, so dangling references
never reach presets/exports.

**Independent Test**: A DS with an alias to a missing token reports a structured missing-reference
issue (reusing `002`'s alias analysis).

**Acceptance Scenarios**:

1. **Given** an alias whose target does not exist, **Then** a missing-reference issue is reported with
   the source token path.

---

### User Story 6 — Detect cycles (Priority: P1)

As a developer, I want alias cycles among foundation tokens detected, so resolution can never loop.

**Independent Test**: A DS with `a → b → a` reports a cycle issue without infinite loops or crashes.

**Acceptance Scenarios**:

1. **Given** a cyclic alias chain, **Then** a cycle issue is reported and analysis terminates within
   the safe limits.

---

### User Story 7 — Detect forbidden dependencies (Priority: P1)

As a developer, I want forbidden dependency directions (notably `primitive → semantic`) reported as
distinct, stable issues, so the two-level contract is enforced.

**Independent Test**: A DS with a `primitive → semantic` alias reports a forbidden-direction issue
distinct from missing-reference and cycle.

**Acceptance Scenarios**:

1. **Given** a forbidden direction, **Then** a `foundation-forbidden-dependency` issue (stable code)
   is reported.

---

### User Story 8 — Preserve unknown / future tokens (Priority: P1)

As a developer, I want tokens, categories, and DTCG extensions that foundations does not recognize to
be preserved and reported as-is (never dropped, reordered destructively, or normalized), so future
content survives.

**Independent Test**: A DS with an unrecognized top-level group and `$extensions` is queried; the
unknown content is preserved in the source file and surfaced as `unclassified`/`unmanaged` rather than
removed or flagged as fatal.

**Acceptance Scenarios**:

1. **Given** an unknown token group, **When** foundations are queried, **Then** the source file is
   byte-identical afterward and the unknown content is reported, not discarded.

---

### User Story 9 — Read-only queries (Priority: P1)

As any user, I want foundation queries to never modify the Design System, so inspection is safe in CI
and locally.

**Independent Test**: Snapshot the host project before and after a foundations query; the listing and
file bytes are identical.

**Acceptance Scenarios**:

1. **Given** any DS state, **When** foundations are queried, **Then** no file, timestamp, permission,
   or directory is altered and no temporary file is created in the host root.

---

### User Story 10 — Deterministic results (Priority: P1)

As an automation author, I want identical input to yield identical foundation results, so output can
be diffed and asserted.

**Independent Test**: Run the foundations query twice on the same DS; results are identical
(categories, tokens, issues order, counts) with no timestamps/UUIDs.

**Acceptance Scenarios**:

1. **Given** the same DS, **When** queried twice, **Then** the two results are deeply equal.

---

### User Story 11 — Works without TTY (Priority: P2)

As a CI process, I want foundation queries to work without an interactive terminal and with redirected
streams.

**Independent Test**: Run the query with stdin closed / output redirected; it completes normally.

**Acceptance Scenarios**:

1. **Given** no TTY, **When** foundations are queried, **Then** the query completes and produces a
   structured result.

---

### User Story 12 — Preset-ready model (Priority: P2)

As the author of `005-presets`, I want the foundation model (categories, levels, alias rules) to be
consumable so presets can supply concrete values without redesigning the model.

**Independent Test**: The foundation result exposes, per category, the information a preset needs
(category, level slots, alias expectations) without embedding concrete values.

**Acceptance Scenarios**:

1. **Given** the foundation model, **Then** a preset can map values to categories/levels using only
   the published structure.

---

### User Story 13 — Build/export-ready model (Priority: P2)

As the author of `006-build-export`, I want the resolved foundation/token graph (with alias targets
and effective types already provided by `002`) consumable, so export needs no re-analysis.

**Independent Test**: The foundation result reuses `002`'s token summaries (effective type, alias
target, alias state) so export can traverse without re-resolving.

**Acceptance Scenarios**:

1. **Given** the foundation model, **Then** export-relevant fields (effective type, alias target,
   trust) are present and reuse the existing analysis.

---

### User Story 14 — Compatible with validate / inspect / --json (Priority: P1)

As an existing user, I want `validate`, `inspect`, and their `--json` output to keep working exactly
as in `002`/`003` after foundations is added.

**Independent Test**: The full historical suite (001 + 002 + 003) stays green; the JSON v1 envelope is
unchanged unless a versioning decision is made explicitly.

**Acceptance Scenarios**:

1. **Given** foundations exists, **When** `validate`/`inspect`/`--json` run, **Then** their output,
   exit codes, and `formatVersion: "1.0.0"` are unchanged.

---

### Edge Cases

- Category present but with only reserved props (`$type` group, no leaf tokens) → `partial` or
  `absent` per its definition; never a crash.
- Alias to a **group** rather than a token → reported with `002`'s existing `to-group` alias state;
  treated as a foundation issue, not a resolved relationship.
- Type-incompatible alias (semantic of one category referencing a primitive of an incompatible
  `$type`) → reported as a foundation issue (shallow, see DTCG limits below).
- Tokens lacking any classification signal → `unclassified` (preserved, not an error by itself).
- Unreadable file / invalid UTF-8 / limits exceeded → reuse `002`'s `read-error` / `partial`
  behaviour; foundations reports what is recoverable.
- Motion category present but only partially defined → `partial`, with shallow validation only.

---

## Requirements *(mandatory)*

### Foundation model

- **FR-001**: The system MUST define a fixed, ordered set of recognized foundation **categories**:
  `color`, `spacing`, `typography`, `radius`, `border`, `shadow`, `opacity`, `sizing`, `motion`.
- **FR-002**: The system MUST define three conceptual **token levels** — `primitive`, `semantic`,
  `component` — and MUST treat `component` as **out of scope** for `004` (documented relationship
  only; never classified or validated here).
- **FR-003**: Each foundation token MUST resolve to exactly one `level` — `primitive`, `semantic`, or
  the derived `unclassified` — using a **deterministic, non-heuristic** rule: explicit DTCG
  `$extensions` metadata (see *Token level classification*, FR-037..FR-046). Names, paths, prefixes,
  `$type`, alias targets, and external/duplicated registries MUST NOT be used to infer the level.
- **FR-004**: The system MUST clearly distinguish, and never conflate, the following concepts:
  *foundation category*, DTCG `$type`, DTCG *group*, *token level* (primitive/semantic), *visual
  role*, and *token name/path*. (E.g. `color.primary` may be a semantic token of category `color`
  whose DTCG `$type` is `color`.)

### Token level classification

- **FR-037**: The `level` of a foundation token/group MUST be declared via explicit DTCG
  `$extensions` metadata under the vendor namespace `ar.neuraz.design-system-manager`, with shape
  `{ "foundation": { "level": "primitive" | "semantic" } }`. `design-system/tokens/base.tokens.json`
  remains the single source of truth (no metadata is read from `design-system.json` or `config`).
- **FR-038**: In v1, `level` MUST admit **only** `primitive` or `semantic`. `component` (out of scope
  for `004`) and any other token (`alias`, `base`, `core`, `reference`, `theme`, `preset`, …) MUST NOT
  be accepted as a `level` value.
- **FR-039**: The metadata MAY appear on an individual **token** or on a **group**. Group metadata
  declares a default level for that branch, so a level need not be repeated on every descendant token.
- **FR-040**: The **effective level** MUST resolve in this precedence: (1) the token's own metadata;
  (2) the nearest ancestor group's metadata; (3) `unclassified`. A token's own metadata MUST override
  an inherited group level (e.g. a `primitive` token inside a `semantic` group resolves to
  `primitive`). This `$extensions` inheritance is a **Neuraz foundation convention**, not standard
  DTCG inheritance, and MUST be documented as such.
- **FR-041**: Level resolution MUST NOT inherit from sibling groups, alias targets, the manifest, the
  config, or path/name segments.
- **FR-042**: A token with neither own nor inherited metadata MUST resolve to `unclassified`.
  `unclassified` is a **derived inspection state, never a persisted `level` value** (a persisted
  `"level": "unclassified"` is itself invalid metadata, see FR-043). An `unclassified` token: remains
  a valid DTCG token; is never removed, modified, or heuristically classified; appears in the
  foundations view marked as unmanaged; and is never auto-promoted to `primitive`/`semantic`. It MUST
  be surfaced as a stable structured warning (non-invalidating by itself) and contributes to a
  category being `partial` rather than `complete` when present.
- **FR-043**: Metadata MUST be treated as **invalid** when: `foundation` is not an object; `level` is
  not a string; `level` is a string other than `primitive`/`semantic`; or the namespace exists with
  an incompatible shape. Invalid metadata MUST produce a stable-coded foundation issue carrying the
  logical token/group path, with no stack trace and no raw library error; the original content MUST be
  preserved (never auto-corrected or normalized); the derived level MUST be `unclassified`; and the
  owning category MAY become `invalid`/`partial` per the global status rules.
- **FR-044**: A token's level MUST be determined **solely** by its effective metadata, never inherited
  from its alias target. A `semantic` alias to a primitive stays `semantic`; an `unclassified` token
  aliasing a primitive stays `unclassified`. The allowed dependency direction (FR-005..FR-009) MUST be
  validated **only after** both endpoints' levels are determined independently.
- **FR-045**: `foundation.level` MUST NOT be inferred from `$type` (`$type: color` does not imply
  `primitive`) nor from a token being an alias (an alias does not imply `semantic`). `level`
  (architectural function) and `$type` (DTCG value type) are orthogonal.
- **FR-046**: `foundation.level` metadata MUST NOT duplicate the foundation category (no persisted
  `category` alongside `level`); category, level, effective `$type`, token path, and visual role
  remain separate concerns. This clarification resolves **only** `primitive | semantic`; it MUST NOT
  expand the contract further.

### Alias / dependency rules

- **FR-005**: `primitive → concrete value` MUST be allowed.
- **FR-006**: `primitive → primitive` MUST be allowed only when it forms no cycle.
- **FR-007**: `semantic → primitive` MUST be allowed.
- **FR-008**: `semantic → semantic` MUST be allowed only when it forms no cycle.
- **FR-009**: `primitive → semantic` MUST be reported as a forbidden-direction foundation issue with a
  stable code.
- **FR-010**: Dependencies involving `component` tokens are out of scope and MUST NOT be validated by
  `004`.
- **FR-011**: Missing alias targets MUST be reported (reusing `002`'s alias analysis) with the source
  token path.
- **FR-012**: Alias cycles among foundation tokens MUST be detected and reported within the existing
  safe analysis limits, without infinite loops.
- **FR-013**: An alias whose target is a **group** MUST be reported (reusing `002`'s `to-group` state),
  not treated as a resolved relationship.
- **FR-014**: A type-incompatible alias MUST be reported as a foundation issue at the depth currently
  supported (shallow for non-`color` types; see FR-019).

### DTCG compatibility

- **FR-015**: The system MUST continue to use DTCG 2025.10 and MUST NOT redefine token syntax.
- **FR-016**: Foundation categories MUST be expressed using existing DTCG structure (groups, `$type`,
  `$value`, aliases) — foundations is a **classification/validation layer over DTCG**, not a new
  token format.
- **FR-017**: The specification MUST NOT claim deep semantic validation for DTCG types that do not
  have it. Only `color` has deep inspection today; the other recognized types are validated
  **shallowly**.
- **FR-018**: Recognized-but-shallow types (e.g. `dimension`, `fontFamily`, `shadow`, `duration`)
  MUST continue to produce the existing shallow warning rather than a fabricated deep result.
- **FR-019**: The system MUST state, per category, the **validation level achievable today** (deep vs
  shallow) and MUST leave deeper validation as a future extension.

### Persistence

- **FR-020**: Foundations MUST be represented using **Option A** — DTCG structure inside the existing
  `design-system/tokens/base.tokens.json` — as the single source of truth. No new persisted file and
  no duplication of token data in `design-system.json` are introduced by `004`. *(Rationale: most
  reversible, single source of truth, minimal duplication, DTCG-native, preset/export-friendly.)*
- **FR-021**: `004` MUST NOT change the files generated by `001` `init` (the three current documents,
  byte-for-byte), nor their initial content.

### Observable states & results

- **FR-022**: Per-category status MUST be one of `absent | partial | complete | invalid`, defined as a
  **derived descriptive field**, NOT a new top-level outcome classification.
- **FR-023**: The overall query MUST reuse the existing `002` outcomes
  (`valid | complete-invalid | partial | not-found | read-error`) for analysis-level results; `004`
  MUST NOT introduce a second, incompatible top-level classification.
- **FR-024**: Foundations MUST be derived from the existing `DesignSystemAnalysis` produced once by
  `002`; `004` MUST NOT add a second read, parse, or token traversal.

### Headless capabilities

- **FR-025**: Foundation querying MUST be available as **headless** capability(ies) (behaviour over
  fixed names; candidate shapes: list categories, inspect foundations, validate foundations) that:
  perform no filesystem access in the domain layer, use no Commander/terminal output in the
  application layer, perform no writes, and return structured, deterministic results.
- **FR-026**: The headless result MUST be serializable to JSON in the future without redesign (it
  MUST contain only JSON-safe values: strings, finite numbers, booleans, null, arrays, plain objects).

### CLI (observable need only)

- **FR-027**: `004` MUST expose foundation querying through the CLI as a **read-only** surface. The
  decided direction is a **dedicated `neuraz-ds foundations` command** (read-only, with
  inspect/validate behaviours) so that the closed `validate`/`inspect` commands and the **frozen JSON
  v1 contract remain untouched**; integrating into `inspect`/`validate` is recorded as a rejected
  alternative because it would force a `formatVersion` decision on a frozen contract. *(No CLI is
  implemented in this phase.)*
- **FR-028**: Any future JSON output of foundations MUST reuse the existing serializer and the v1
  envelope shape conventions; it MUST NOT mutate the existing `validate`/`inspect` JSON v1 payloads.

### Preservation (non-destruction)

- **FR-029**: Queries MUST preserve unknown tokens, unknown categories, and DTCG `$extensions`
  exactly; nothing is dropped, normalized, or reordered destructively. Any **future** write operation
  MUST preserve unknown `$extensions` namespaces and unknown properties within the Neuraz namespace,
  MUST NOT replace the whole `$extensions` object, and MUST modify only the fields it explicitly
  manages. In `004` all operations are read-only, so this is guaranteed trivially.
- **FR-030**: The reported model MUST mark unmanaged/unknown content as such (e.g. `unclassified` /
  `unmanaged`) rather than omitting it, so future edit operations cannot silently erase it.

### Determinism

- **FR-031**: Category order MUST be stable (the canonical FR-001 order); token order MUST follow the
  source insertion order already used by `002`; issue order MUST be stable.
- **FR-032**: Identical input MUST produce deeply-equal results; output MUST contain no timestamps,
  UUIDs, durations, hostnames, or environment data, and MUST NOT depend on TTY or locale.

### Security

- **FR-033**: Foundation queries MUST reuse `002`'s safety guarantees: no arbitrary token `$value`
  content exposed beyond what `002` already exposes, no stack traces, no environment variables, no
  following symlinks outside the host, no executing code from files, and the existing safe limits on
  depth/nodes/aliases/path/issue counts. Unreadable files / invalid UTF-8 MUST be handled via `002`'s
  existing `read-error`/`partial` behaviour. These guarantees MUST be reused, not duplicated.

### Compatibility with closed features

- **FR-034**: `001` `init` MUST keep generating the three current files unchanged.
- **FR-035**: `002` `validate`/`inspect` MUST keep their outcomes, reporters, exit codes, and single
  analysis pass.
- **FR-036**: `003` JSON v1 (`formatVersion: "1.0.0"`) MUST stay byte-stable for `validate`/`inspect`;
  adding foundation information MUST NOT alter it without an explicit versioning decision in a later
  phase.

### Key Entities

- **Foundation Category**: one of the FR-001 set; has purpose, primitive/semantic example shapes,
  related DTCG `$type`(s), achievable validation level, alias restrictions, and a status definition.
- **Foundation Token (view)**: a `002` token summary plus a `level` (`primitive | semantic |
  unclassified`) and its owning category.
- **Foundation Issue**: a stable-coded validation finding (forbidden direction, missing reference,
  cycle, to-group, type-incompatible) reusing `002`'s `AnalysisIssue` shape.
- **Foundations View**: the derived, read-only result: ordered categories with status, classified
  tokens, issues, and the reused analysis outcome.

---

## Foundation categories (reference)

For each category: purpose · primitive examples · semantic examples · DTCG `$type`(s) · validation
level today · alias notes · status meaning. *(Token paths are illustrative, not prescribed values.)*

| Category | Purpose | Primitive examples | Semantic examples | DTCG `$type`(s) | Validation today |
|---|---|---|---|---|---|
| color | Color scales & roles | `color.blue.500`, `color.neutral.100` | `background.default`, `foreground.muted`, `primary.default`, `focus.ring` | `color` | **deep** (sRGB object) |
| spacing | Spacing scale | `spacing.100`, `spacing.300` | (layout roles e.g. `layout.gap.default` are **deferred** to a later layer, not foundations) | `dimension` | shallow |
| typography | Type system | `font.size.400`, `font.weight.600` | `text.body.default` (deferred where role-like) | `dimension`, `fontFamily`, `fontWeight`, `number`, and `typography` composite | shallow |
| radius | Corner radius | `radius.200` | `radius.none/small/medium/full` (role aliases) | `dimension` | shallow |
| border | Borders/strokes | `border.width.100` | `border.default` (composite of width/style/color) | `dimension`, `strokeStyle`, `color`, `border` composite | shallow |
| shadow | Elevation/shadow | `shadow.raw.*` | `shadow.elevation.1` | `shadow` composite | shallow (composite not deeply validated) |
| opacity | Opacity levels | `opacity.100` | `opacity.disabled` | `number` | shallow |
| sizing | Sizing scale (relation to spacing/dimension clarified) | `size.400` | `control.height.default` (deferred where role-like) | `dimension` | shallow |
| motion | Motion (bounded: duration/easing/transition roles) | `duration.150`, `easing.standard` | `motion.transition.default` | `duration`, `cubicBezier`, `transition` composite | shallow |

Notes: `typography`/`border`/`shadow`/`motion`/`transition` are DTCG **composite** types — recognized
but **shallow** today (FR-017/FR-018). `sizing` and `spacing` both map to DTCG `dimension`; the
specification keeps them as **distinct foundation categories** while sharing a `$type`. Role-like
semantic tokens (e.g. `layout.gap.default`, `control.height.default`) are treated as semantic
foundation tokens of their category when classified as such; purely layout-composition concerns are
deferred (out of scope) where they are not a single token value.

---

## Success Criteria *(mandatory)*

- **SC-001**: All nine recognized categories can be identified and reported with a per-category status
  in a single query.
- **SC-002**: Every foundation token reports exactly one `level` (`primitive | semantic |
  unclassified`) with no ambiguous guessing (deterministic rule).
- **SC-003**: Forbidden alias directions (`primitive → semantic`) are detected and reported with a
  stable code in 100% of constructed violation cases.
- **SC-004**: Alias cycles among foundation tokens are detected in 100% of constructed cycle cases,
  with no infinite loop and within existing limits.
- **SC-005**: Missing alias references are detected in 100% of constructed dangling cases.
- **SC-006**: Unknown tokens/categories/extensions are preserved: the source file is byte-identical
  before and after any query, in 100% of cases.
- **SC-007**: Foundation queries perform zero writes (no file/timestamp/permission/structure change,
  no temp file in host root).
- **SC-008**: Identical input produces deeply-equal results across repeated runs (determinism), with
  no timestamps/UUIDs/env data.
- **SC-009**: Foundation queries function with no TTY and with redirected streams.
- **SC-010**: The 001 + 002 + 003 historical suite stays green and JSON v1 (`formatVersion: "1.0.0"`)
  is unchanged.
- **SC-011**: The foundation model is consumable by `005-presets` and `006-build-export` without a
  fundamental redesign (presets map values to categories/levels; export reuses `002` token
  summaries).

---

## Assumptions & Decisions

- **Persistence = Option A** (FR-020): foundations live as DTCG structure in the existing
  `base.tokens.json`. Rejected: Option B (duplicate metadata in `design-system.json` — duplication),
  Option C (new file — extra source of truth), Option D (combination — unnecessary complexity now).
- **Level classification = explicit `$extensions` metadata** (FR-037..FR-046; resolves FR-003):
  namespace `ar.neuraz.design-system-manager`, `foundation.level` ∈ {`primitive`,`semantic`}, on token
  or group, precedence token→group→`unclassified`. **Rejected — naming convention** (`base.*`,
  `semantic.*`, `background.*`, …): names are user-owned, renames would silently change meaning,
  conventions differ per org, ambiguous, hard to version, and hostile to preserving unknown content;
  names may still organize the file visually but are never the contractual source of classification.
  **Rejected — external role registry** in `design-system.json`: duplicates information, creates two
  sources of truth, can desync, complicates renames, reduces DTCG portability, and contradicts
  Persistence Option A.
- **CLI = dedicated read-only `neuraz-ds foundations`** (FR-027): preserves the frozen `validate`/
  `inspect` + JSON v1 contracts. Rejected: folding into `inspect`/`validate` (would pressure a
  `formatVersion` bump on a frozen contract).
- **States**: per-category `absent|partial|complete|invalid` is a **derived** field; the top-level
  outcome reuses `002`'s five outcomes (FR-022/FR-023). No second classification.
- **No second analysis**: foundations is a derived view over the single `DesignSystemAnalysis`
  (FR-024).
- **Motion is in scope** but bounded to duration/easing/transition with shallow validation only;
  it does not expand the contract beyond the other shallow categories.
- **`component` tokens are out of scope**; only their future relationship to foundations is documented.
- Reuses `002` safety, limits, alias analysis, and `AnalysisIssue` shape rather than duplicating them.

---

## Relationship to future features

- **005-presets**: foundations defines the *structure* (categories, levels, alias rules); presets
  supply concrete *values* mapped onto that structure. `004` defines no values.
- **006-build-export**: export consumes the resolved foundation/token graph (effective type, alias
  target, trust) without re-analysis. `004` introduces no Style Dictionary / CSS / SCSS generation.
- Flow prepared: `foundation definitions → preset values → build/export`.

---

## Out of Scope

Concrete preset values; themes; automatic dark/light; component tokens; CSS/SCSS generation; Style
Dictionary; export; MCP; TUI; viewer; Figma; visual editing; migrations; repair; multiple Design
Systems per host; npm publishing; multiple token files (unless a later phase proves them
indispensable); deep validation of all DTCG types; **any change to the JSON v1 contract**; implementing
the foundations CLI or any code (this phase is specification only).
