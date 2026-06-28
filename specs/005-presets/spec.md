# Feature Specification: Design System Presets

**Feature Branch**: `005-presets`

**Created**: 2026-06-28

**Status**: Draft

**Input**: Define formally the *presets* system of the Neuraz Design System Manager — a catalog of
concrete, reusable sets of initial **values** for the foundations defined in `004`. A preset is
explicitly discovered, inspected, previewed and applied to the host Design System's tokens document.
Presets contribute concrete primitive/semantic tokens (with foundation `$extensions` metadata) but
**must not** redefine foundations, introduce themes/component tokens, or alter the closed features
`001`/`002`/`003`/`004`. Application is an explicit, atomic, idempotent, preserving write; preview is
read-only. No CSS/SCSS/export/build (that is `006`).

---

## Concepts & Definitions *(mandatory context)*

This feature sits on top of `004-foundations`. To keep scope unambiguous, four concepts are kept
strictly separate:

| Concept | Defines | Owns | In scope here? |
|---|---|---|---|
| **Foundation** (`004`) | The *architecture*: the 9 categories (`color, spacing, typography, radius, border, shadow, opacity, sizing, motion`), levels (`primitive`/`semantic`/derived `unclassified`), category resolution, alias dependency rules, validation & states. | Structure & rules. | Consumed, never redefined. |
| **Preset** (`005`) | A *concrete, reusable selection of token values* for one or more foundations (e.g. a color primitive scale + semantic color roles + spacing scale). | Values for the existing structure. | **Yes — this feature.** |
| **Theme** | A contextual/appearance variation (e.g. dark/light) layered over a Design System. | Appearance variants. | **No — out of scope.** |
| **Component token** | Component-scoped tokens such as `button.primary.background`. | Component surface. | **No — out of scope.** |

**Product problem solved**: a project already has a *valid* Design System (after `init`), but writing
all the concrete foundation token values by hand is laborious and error-prone. Presets let a user
discover, inspect, preview, and explicitly apply a coherent base of concrete values — safely,
deterministically, and without losing any unmanaged content.

**Conceptual relationship (obligatory)**:

```text
foundations (004) → define categories, levels, structure, rules
presets     (005) → contribute concrete values for that structure
build/export(006) → later consumes the resulting Design System
```

---

## Decisions (v1) *(material choices, resolved by the simplest / most-reversible / preservation-by-default rule)*

These choices were resolved at specification time (no `[NEEDS CLARIFICATION]` remain). Each is
revisitable in `/speckit-clarify`; the rationale is recorded so the decision is auditable.

- **D1 — Preset source**: **package-bundled, immutable presets only** (Option A). They ship inside
  `@neuraz/design-system-manager`, versioned with the package, discoverable offline, reproducible.
  Local project presets (Option B), mixed catalogs (C), and arbitrary external paths (D) are **out of
  scope for v1** (D rejected on security/portability grounds). Rationale: simplest, most reproducible,
  no path-resolution/schema surface, no precedence/ID-collision complexity.
- **D2 — Merge policy**: **safe merge / add-only by default.** Apply *creates* tokens that do not yet
  exist; an existing path the preset would touch with a **different** value/`$type`/level/alias is a
  **blocking conflict** (never silently overwritten); an existing path already byte-equal to what the
  preset would write is `unchanged`. No `--force`, no managed-field replacement, no deletion in v1.
  Rationale: most reversible, preservation-by-default, no destructive surface.
- **D3 — Existing-token updates**: v1 apply **never mutates an existing token's value/type/level**
  (those are conflicts, not updates). The diff vocabulary still defines `update` for forward
  compatibility, but v1 default never emits a value-changing `update` without an explicit future
  opt-in policy. Rationale: consequence of D2.
- **D4 — Preset format**: **envelope** — preset descriptive metadata (`id`, `name`, …) plus a DTCG
  token block (`tokens`). Rationale: a plain DTCG document (Option) cannot carry a stable preset
  id/version cleanly; a separate manifest+document adds files/duplication. The envelope keeps the
  token block fully DTCG-compatible so `002`/`004` analysis applies unchanged.
- **D5 — Partial presets**: **allowed.** A preset MAY cover a subset of categories and declares the
  categories it contributes (`includedCategories`). Applying is **one preset at a time**; automatic
  composition/merging of multiple presets in a single operation is **out of scope** (no auto-compose).
- **D6 — Category selection at apply (`--category …`)**: **out of scope for v1.** The preset's own
  declared scope governs what it contributes; per-apply category filtering adds combinatorial
  conflict/partial semantics without proven need. Justification recorded; revisit later if demanded.
- **D7 — Confirmation without TTY**: safety is provided by the **explicit preview (plan) + explicit
  apply** separation, not by interactive prompts. Apply is non-interactive, never blocks on stdin,
  writes only when there are no blocking conflicts, and a dry-run/plan never writes. CI-safe.
- **D8 — Target file**: preset application modifies **only** `design-system/tokens/base.tokens.json`.
  It does **not** modify `neuraz-ds.config.json` or `design-system/design-system.json`. No additional
  token files are introduced.
- **D9 — Two analyses, explicitly**: the single-analysis-per-operation guarantee of `002`/`004` is
  preserved *per phase*. Apply is two explicit phases — **pre-write analysis** (plan/validate) and
  **post-write verification** (re-analyze the written result) — never disguised as one read. Each
  phase performs at most one read/parse/analysis of the document.

---

## User Scenarios & Testing *(mandatory)*

> Presets expose **read-only queries** (list, inspect, preview/plan) and **one explicit write**
> (apply). Queries never write. Apply is atomic, idempotent and preserving. All operations are
> headless-first and reuse `002`/`004` analysis; none introduce a parallel DTCG validator.

### User Story 1 — Discover available presets (Priority: P1)

As a developer or automated tool, I want to list the presets bundled with the manager so I can choose
a base of concrete values.

**Why this priority**: discovery is the entry point; without it nothing else is usable. Pure read.

**Independent Test**: run the list operation in any host (even before `init`) and receive a stable,
deterministic, ordered catalog with each preset's id and summary metadata; no files are written.

**Acceptance Scenarios**:

1. **Given** the installed package, **When** I list presets, **Then** I get every bundled preset id
   in a stable order with its name, description, version and included categories.
2. **Given** no network access, **When** I list presets, **Then** the catalog is returned identically
   (presets are bundled; no remote fetch).

---

### User Story 2 — Inspect a preset (Priority: P1)

As a developer or tool, I want to inspect a single preset's metadata, which foundation categories it
covers, and which concrete tokens it would contribute, without applying it.

**Why this priority**: informed choice before any write. Pure read.

**Independent Test**: inspect a known preset id and receive its metadata, `includedCategories`, and
the list of token paths/levels it declares; inspecting an unknown id yields a `not-found` result; no
files are written.

**Acceptance Scenarios**:

1. **Given** a valid preset id, **When** I inspect it, **Then** I see its metadata, included
   categories, and contributed token paths with their foundation level (primitive/semantic) and
   `$type`.
2. **Given** an unknown preset id, **When** I inspect it, **Then** I get a `not-found` outcome with a
   stable code and no write.

---

### User Story 3 — Preview the application plan (Priority: P1)

As a developer or tool, I want to preview exactly what applying a preset would do to the current
Design System — which tokens would be created, which already match, and which would conflict — before
any write.

**Why this priority**: this is the core safety guarantee — "know exactly what will happen". Pure read.

**Independent Test**: run the plan/preview against a host Design System and receive a deterministic,
complete diff (`create` / `update` / `unchanged` / `conflict` / `skip`) plus a list of conflicts; the
target file's bytes are unchanged afterwards.

**Acceptance Scenarios**:

1. **Given** a Design System with no overlapping paths, **When** I preview, **Then** every contributed
   token appears as `create` and there are no conflicts.
2. **Given** a Design System already containing a contributed path with an identical value, **When** I
   preview, **Then** that path appears as `unchanged`.
3. **Given** a Design System containing a contributed path with a different value/type/level, **When**
   I preview, **Then** that path appears as `conflict` with a stable code, logical path and proposed
   action, and the plan is marked non-writable.
4. **Given** any preview, **When** it completes, **Then** the target file is byte-identical to before.

---

### User Story 4 — Apply a preset (Priority: P1)

As a developer or tool, I want to apply a preset to the host Design System as one explicit, atomic
write so that the contributed tokens exist in `base.tokens.json`.

**Why this priority**: the central value-delivering action.

**Independent Test**: apply a preset to a host with no conflicts and confirm the contributed tokens
now exist (observable via `foundations`), the write is atomic (no partial file ever), and unmanaged
content is preserved byte-for-byte where untouched.

**Acceptance Scenarios**:

1. **Given** a host with no blocking conflicts, **When** I apply a preset, **Then** the contributed
   tokens are created, the result re-analyzes cleanly, and the outcome is `applied`.
2. **Given** a host with one or more blocking conflicts, **When** I apply, **Then** **nothing is
   written**, the outcome is `conflict`, and the original file is intact.
3. **Given** a successful apply, **When** I run `neuraz-ds foundations`, **Then** the contributed
   categories/levels are observable.

---

### User Story 5 — Idempotent re-application (Priority: P1)

As a developer or tool, I want re-applying the same preset over the same state to be a safe no-op.

**Why this priority**: reproducibility and CI re-runs must be safe.

**Independent Test**: apply a preset, then apply it again; the second run reports `unchanged`, performs
no write, and leaves the file byte-identical.

**Acceptance Scenarios**:

1. **Given** a state where a preset was already applied, **When** I apply it again, **Then** the
   outcome is `unchanged`, no bytes change, and it is considered success.
2. **Given** an `unchanged` apply, **When** it completes, **Then** no temporary metadata/timestamp is
   introduced into the document.

---

### User Story 6 — Conflicts surfaced before any write (Priority: P2)

As a developer or tool, I want every conflict detected and reported *before* writing, with enough
structure to act on it.

**Independent Test**: construct hosts exhibiting each conflict kind and confirm each is reported with
a stable code, logical path, severity, proposed action and a "blocks write" flag — with no write.

**Acceptance Scenarios**:

1. **Given** a contributed path that exists with a different value/`$type`/level/alias, **When** I
   plan or apply, **Then** a corresponding conflict is reported and apply is blocked.
2. **Given** a contributed token path that collides with an existing group (or vice versa), **When** I
   plan, **Then** a token-vs-group conflict is reported.

---

### User Story 7 — Preservation of unmanaged content (Priority: P2)

As a developer or tool, I want everything the preset does not own to be preserved exactly.

**Independent Test**: apply a preset to a host containing unmanaged tokens, unknown `$extensions`
namespaces, extra properties and descriptions; confirm all untouched paths/fields are byte-identical
and `$extensions` objects are never wholesale-replaced.

**Acceptance Scenarios**:

1. **Given** unmanaged tokens and unknown `$extensions`, **When** I apply, **Then** they remain
   byte-identical and reasonably stable in order.
2. **Given** categories the preset does not include, **When** I apply, **Then** their tokens are
   untouched.

---

### User Story 8 — Atomicity & safe recovery (Priority: P2)

As a developer or tool, I want application to never leave a partially modified file, and to recover a
safe, structured result if writing fails.

**Independent Test**: simulate a write failure and confirm the original file is intact, no temporary
artifact remains, and a `write-error` result (recoverable, structured) is returned.

**Acceptance Scenarios**:

1. **Given** a write failure mid-operation, **When** apply runs, **Then** the original file is
   preserved, temporaries are cleaned up, and a `write-error` outcome is returned.
2. **Given** blocking conflicts, **When** apply runs, **Then** no write is attempted at all.

---

### User Story 9 — Observable via the existing pipeline (Priority: P2)

As a developer or tool, I want the post-apply Design System to remain fully analyzable by the existing
commands.

**Independent Test**: after a successful apply, `neuraz-ds validate`, `inspect` and `foundations` (and
their `--json` forms) run unchanged and reflect the new tokens.

**Acceptance Scenarios**:

1. **Given** a successful apply, **When** I run `validate`/`inspect`/`foundations`, **Then** they work
   with no contract changes and reflect the contributed tokens.

---

### User Story 10 — Headless API (Priority: P2)

As an integrator, I want to list, inspect, plan and apply via a headless API with a strict separation
between read-only queries, planning, and the write.

**Independent Test**: drive each operation programmatically (no CLI/stdout) and receive structured
results; the domain layer never touches filesystem/CLI/streams/exit codes/JSON.

**Acceptance Scenarios**:

1. **Given** the headless API, **When** I call the query/plan operations, **Then** no write occurs.
2. **Given** the headless API, **When** I call apply, **Then** writing is the only side effect and the
   result is a structured value (no process exit, no ANSI).

---

### User Story 11 — JSON output isolated from prior contracts (Priority: P2)

As a tool author, I want JSON output for preset operations that does not change the JSON contracts of
`validate`/`inspect` (`003`) or `foundations` (`004`).

**Independent Test**: emit preset JSON for each outcome and confirm it parses, is byte-stable, and the
existing `003`/`004` JSON bytes are unchanged.

**Acceptance Scenarios**:

1. **Given** any preset operation, **When** I request JSON, **Then** I receive a self-contained
   envelope with its own versioning, and the `003`/`004` envelopes are untouched.

---

### User Story 12 — Determinism (Priority: P2)

As a developer or tool, I want identical inputs to yield identical plans and identical written bytes.

**Independent Test**: run list/inspect/plan twice and apply twice (fresh state) and confirm
deeply-equal results and byte-identical writes; no timestamps/UUID/locale/env influence output.

**Acceptance Scenarios**:

1. **Given** the same host and preset, **When** I plan twice, **Then** the plans are deeply equal.
2. **Given** the same host and preset, **When** I apply on equivalent fresh states, **Then** the
   written bytes are identical.

---

### User Story 13 — No-TTY / CI operation (Priority: P3)

As a CI pipeline, I want every operation to work without a TTY and never block on stdin.

**Independent Test**: run all operations with stdin closed and no TTY; confirm deterministic output,
correct exit codes, and no interactive prompt.

**Acceptance Scenarios**:

1. **Given** no TTY, **When** I run any preset operation, **Then** it completes without prompting.

---

### User Story 14 — Human-readable reporting (Priority: P3)

As a developer at a terminal, I want readable summaries for list/inspect/plan/apply.

**Independent Test**: run each operation without `--json` and confirm a deterministic human summary on
the correct stream, with no required colors and no truncation of the headless model.

**Acceptance Scenarios**:

1. **Given** a plan, **When** I view the human output, **Then** it shows counts of
   create/update/unchanged/conflict/skip and the conflicts, in stable order.

---

### User Story 15 — Included categories are explicit (Priority: P2)

As a developer or tool, I want each preset to state exactly which foundation categories it covers, so
I can decide whether the preset matches the gap in my Design System.

**Independent Test**: inspect every bundled preset and confirm `includedCategories` contains only the
canonical `004` categories, in stable order, with partial presets clearly represented.

**Acceptance Scenarios**:

1. **Given** a preset that covers only typography, **When** I inspect it, **Then** `includedCategories`
   reports `typography` only and no other category is implied.
2. **Given** a preset that declares an unsupported category, **When** it is validated, **Then** the
   preset is rejected before any application plan is writable.

---

### User Story 16 — Tokens to create are visible (Priority: P2)

As a developer or tool, I want the preview to identify every token that would be newly created, so I
can review the write before it happens.

**Independent Test**: preview a preset against a host missing the contributed paths and confirm every
new token path appears exactly once as `create`.

**Acceptance Scenarios**:

1. **Given** a host where none of the preset's token paths exist, **When** I preview, **Then** every
   contributed path is listed as `create` with stable ordering and no write.

---

### User Story 17 — Existing paths are classified before write (Priority: P2)

As a developer or tool, I want the preview to classify existing paths as unchanged, future update
candidates, or conflicts, so I know whether applying the preset is safe.

**Independent Test**: preview against hosts containing identical paths, differing token values, and
paths that would require a future update policy; confirm v1 emits `unchanged` or `conflict` and never
silently overwrites.

**Acceptance Scenarios**:

1. **Given** an existing path that is identical to the preset contribution, **When** I preview, **Then**
   the path is `unchanged`.
2. **Given** an existing path with a different value, `$type`, level, or alias, **When** I preview,
   **Then** the path is a blocking `conflict`, not a silent update.
3. **Given** the v1 default policy, **When** a value-changing `update` would be required, **Then** the
   plan is blocked unless a future explicit replacement policy is defined.

---

### User Story 18 — Unknown `$extensions` survive application (Priority: P2)

As a developer or tool, I want unknown `$extensions` namespaces to survive preset application, so other
tools can keep their metadata.

**Independent Test**: apply a preset to a host that has non-Neuraz `$extensions` on untouched paths
and adjacent managed paths; confirm the unknown namespaces remain byte-identical wherever the preset
is not authorized to modify them.

**Acceptance Scenarios**:

1. **Given** a token with an unknown `$extensions` namespace, **When** I apply a preset to another
   path, **Then** that namespace and its content are preserved.
2. **Given** a token with both Neuraz and unknown `$extensions`, **When** the preset adds an allowed
   Neuraz field, **Then** the unknown namespace is not removed or replaced wholesale.

---

### User Story 19 — Category filtering is intentionally unavailable in v1 (Priority: P3)

As an adopter, I want v1 to be explicit about whether I can apply only selected categories from a
preset, so I do not assume a partial write occurred.

**Independent Test**: inspect the v1 contract and any eventual CLI/help text; category filtering is
documented as out of scope, and the preset's declared `includedCategories` is the only application
scope.

**Acceptance Scenarios**:

1. **Given** a preset with multiple included categories, **When** I apply it in v1, **Then** the whole
   preset scope is considered; no hidden per-category filter is applied.
2. **Given** a user asks for per-apply category filtering in v1, **Then** the feature contract treats
   it as unsupported/deferred rather than silently applying a subset.

---

### User Story 20 — Write errors return a safe result (Priority: P3)

As a developer or CI process, I want write failures to return a structured, recoverable result without
leaking secrets or leaving debris, so automation can fail safely.

**Independent Test**: induce write failures such as permission denial or failed rename and confirm the
original file remains intact, temporaries are removed, and the outcome is `write-error` with sanitized
details.

**Acceptance Scenarios**:

1. **Given** the target cannot be written, **When** apply reaches the write phase, **Then** the result
   is `write-error`, the original file is intact, and no stack, environment variable, or full token
   document is exposed.
2. **Given** the write phase fails after a temporary file is created, **When** apply finishes, **Then**
   temporary files are cleaned or reported safely without modifying unrelated content.

---

### Edge Cases

- Querying presets in a host **without** an initialized Design System: list/inspect still work
  (catalog is package-bundled); plan/apply yield `not-found` for the host.
- Applying a preset whose contributed paths fully match the host already → `unchanged`.
- A bundled preset that fails its own validation → `invalid-preset` (a packaging defect surfaced
  safely, never a crash).
- Token-vs-group and group-vs-token path collisions → blocking conflicts.
- A contributed token carries invalid Neuraz `$extensions` metadata → blocking conflict
  (`invalid-preset`-class), never written.
- Host file is unreadable / invalid UTF-8 / invalid JSON → `read-error`; no write.
- Write fails after validation (permissions/disk) → `write-error`; original intact; temporaries
  cleaned.
- Post-write re-analysis reveals a structural problem → `verification-error`; structured, recoverable
  result (the write already happened; the result reports the discrepancy without further writes).
- Limits exceeded (size/tokens/depth/conflicts) → reported via limits; apply may be blocked.

## Requirements *(mandatory)*

### Catalog & source

- **FR-001**: The system MUST provide a catalog of **package-bundled** presets; v1 MUST NOT read
  local-project or external-path presets (D1).
- **FR-002**: The system MUST list presets in a **stable, deterministic order** independent of locale,
  filesystem order, and environment.
- **FR-003**: Listing and inspecting presets MUST work **offline** and MUST NOT require network access
  or external assets.

### Preset format & metadata

- **FR-004**: A preset MUST use an **envelope** format: descriptive metadata plus a DTCG-compatible
  token block (D4). The token block MUST be analyzable by `002`/`004` without a parallel validator.
- **FR-005**: Each preset MUST carry a **stable, deterministic, CLI-safe `id`** with a documented
  case/normalization policy and **no silent collisions** across the catalog.
- **FR-006**: Each preset MUST declare descriptive metadata with **observable use**: at minimum `id`,
  `name`, `description`, `version`, and `includedCategories`. Fields without observable use MUST NOT
  be added.
- **FR-007**: Each preset MUST be **versioned**; the spec MUST define what a version change means
  (the contributed tokens/metadata changed between package versions) so consumers can detect drift.
- **FR-008**: Preset `includedCategories` MUST reference only the 9 canonical foundation categories of
  `004`; a preset MAY cover a **subset** (partial preset, D5).

### Preset content rules

- **FR-009**: A preset MAY contribute **primitive** and/or **semantic** tokens, `$type`,
  `$description`, aliases, Neuraz foundation `$extensions`, and descriptive preset metadata.
- **FR-010**: A preset MUST NOT contain component tokens, themes, dark/light variants, CSS, SCSS,
  compiled artifacts, Figma config, executable code, scripts, dependencies, or commands. Presets are
  **data, never code**.
- **FR-011**: Foundation level metadata in a preset MUST use the `004` namespace
  (`ar.neuraz.design-system-manager` → `foundation.level` ∈ `primitive`/`semantic`), declarable on a
  token or a group, and MUST NOT rely on name/path inference.
- **FR-012**: The applied result MUST preserve the `004` level-resolution precedence (token own →
  nearest ancestor group → derived `unclassified`). This feature MUST NOT redefine `004` semantics
  (`primitive`/`semantic`/`unclassified`).

### Query, plan & diff

- **FR-013**: The system MUST expose read-only operations to **list**, **inspect** and **preview/plan**
  a preset application; none MUST write.
- **FR-014**: A plan MUST be a **structured, deterministic, complete** representation using the change
  vocabulary `create` / `update` / `unchanged` / `conflict` / `skip`. `delete` is **out of scope**.
- **FR-015**: A plan MUST be consumable by both human and JSON presentation and MUST be independent of
  TTY.
- **FR-016**: A plan MUST clearly indicate whether it is **writable** (no blocking conflicts) or
  **blocked**.

### Conflicts

- **FR-017**: The system MUST detect and report conflicts for at least: existing token with a
  different value; different `$type`; different foundation level; token-vs-group and group-vs-token
  collisions; different alias; invalid Neuraz metadata; invalid DTCG structure; unsupported category;
  incompatible preset; reserved path; limit exceeded.
- **FR-018**: Each conflict MUST have a **stable code**, a **logical path**, a **severity**, a
  **proposed action**, and a **blocks-write** flag; it MUST NOT expose arbitrary token content or
  secrets.
- **FR-019**: Any blocking conflict MUST prevent the entire write (no partial application).

### Merge policy

- **FR-020**: The default policy MUST be **safe merge / add-only** (D2): create absent tokens; treat a
  differing existing path as a blocking conflict; treat a byte-equal existing path as `unchanged`.
- **FR-021**: v1 MUST NOT overwrite or delete existing tokens, and MUST NOT introduce a `--force` or
  managed-field-replacement option without a fully defined contract (deferred).

### Apply, atomicity & idempotency

- **FR-022**: Apply MUST be an **explicit** write operation, separate from planning/preview.
- **FR-023**: Apply MUST be **atomic**: validate before writing, build the full result in memory,
  write via a safe temporary + atomic rename where the platform allows, clean up temporaries, and
  preserve the original on failure. It MUST NOT leave a partially modified file.
- **FR-024**: Apply MUST NOT write when the plan is blocked or when the result is `unchanged`.
- **FR-025**: Apply MUST be **idempotent**: re-applying the same preset over the same state yields
  `unchanged` with no write and no temporary/timestamp metadata in the document.
- **FR-026**: The system MUST NOT perform automatic Git commits or any VCS side effects.

### Target file & preservation

- **FR-027**: Apply MUST modify **only** `design-system/tokens/base.tokens.json` (D8); it MUST NOT
  modify `neuraz-ds.config.json` or `design-system/design-system.json`, and MUST NOT add token files.
- **FR-028**: Apply MUST preserve unmanaged tokens, non-included categories, unknown `$extensions`
  namespaces, unknown properties, existing descriptions, unmanaged metadata, unrelated content, and a
  reasonably stable order — modifying only authorized paths/fields.
- **FR-029**: Apply MUST NOT wholesale-replace an `$extensions` object and MUST NOT destructively
  normalize the whole document.

### Validation (pre & post)

- **FR-030**: Before writing, the system MUST validate the preset, analyze the current Design System
  (reusing `002`/`004`), check compatibility, and compute conflicts.
- **FR-031**: After writing, the system MUST **re-analyze** the result (post-write verification),
  confirm readability, confirm contributed tokens exist, confirm no new structural errors, and return
  a structured result. The two phases MUST be explicit (pre-write analysis, post-write verification),
  each at most one read/parse/analysis — never disguised as a single read (D9).

### Headless API & layering

- **FR-032**: The system MUST expose headless use cases for list/inspect/plan/apply with read-only
  queries, planning, and the write **clearly separated**.
- **FR-033**: The domain layer MUST NOT know about filesystem, CLI, Commander, ANSI, streams, numeric
  exit codes, or JSON serialization.

### CLI

- **FR-034**: The system MUST expose a coherent CLI surface for list/inspect/preview/apply with
  documented argument shape, a non-writing preview (e.g. dry-run/plan), human and JSON output, and
  documented exit codes. The exact singular/plural and subcommand shape is a planning decision; it
  MUST NOT change `init`/`validate`/`inspect`/`foundations` behavior.
- **FR-035**: The CLI MUST be **non-interactive and CI-safe** (D7): preview + explicit apply is the
  safety mechanism; no operation may block on stdin; any required confirmation MUST have an
  unambiguous non-interactive form.

### JSON

- **FR-036**: Preset JSON output MUST use **its own contract** with independent or explicitly
  coordinated versioning; sharing a `formatVersion` string MUST NOT imply sharing a TypeScript union.
- **FR-037**: Preset JSON MUST NOT modify the envelopes, version, DTOs, mappers, serializer, bytes,
  streams, or exit codes of `validate --json`, `inspect --json` (`003`) or `foundations --json`
  (`004`).

### Outcomes & exit codes

- **FR-038**: The system MUST define outcomes for queries and for writes, **reusing existing outcomes
  where semantics genuinely match** and not overloading `partial`. The conceptual set is: `ok`
  (query), `applied`, `unchanged`, `conflict`, `invalid-preset`, `not-found`, `read-error`,
  `write-error`, `verification-error`, `internal-error`.
- **FR-039**: For each outcome the spec MUST define whether the result is recoverable, whether it
  blocks/blocked the write, whether it wrote, exit-code mapping (conceptual; reuse `002`/`004` codes
  where semantics match), and stdout/stderr policy. A blocked plan is still a **successful query**;
  the block applies to apply only.

### Security

- **FR-040**: The system MUST enforce path containment and MUST NOT follow symlinks out of the host,
  read unauthorized external locations, or follow paths embedded inside a preset.
- **FR-041**: The system MUST NOT execute code from presets and MUST treat presets as inert data.
- **FR-042**: The system MUST enforce limits (size, token count, depth, conflict count), handle
  invalid UTF-8 and invalid JSON safely, clean up temporaries, support safe rollback, and MUST NOT
  expose stacks, environment variables, or full token content in errors.

### Determinism

- **FR-043**: The system MUST guarantee stable order of presets, categories, diff operations and
  conflicts; identical inputs MUST yield the same plan and the same applied bytes; output MUST be free
  of timestamps, UUIDs, locale, TTY and environment influence, and MUST NOT inject temporal metadata
  into the DTCG document.

### Compatibility

- **FR-044**: `neuraz-ds init` MUST remain unchanged — presets MUST NOT be auto-applied during `init`,
  and `init`'s three files, initial bytes, prompts and exit codes MUST NOT change. A preset is applied
  only by an explicit later operation.
- **FR-045**: The system MUST reuse `002` (host resolution, readers, parsing, DTCG traversal, alias
  graph, type resolution, trust, limits, issues, outcomes where applicable) and MUST NOT create a
  parallel DTCG validator; after apply, `validate`/`inspect` MUST keep working with no contract change.
- **FR-046**: The system MUST NOT change `003` (`validate --json`/`inspect --json`) in any observable
  way.
- **FR-047**: The system MUST consume `004` (categories, effective levels, canonical registry,
  namespace metadata, type compatibility, issues, states, outcomes where applicable) without
  redefining it, MUST NOT change `foundations`/`foundations --json`, and a successful apply MUST be
  observable via `neuraz-ds foundations`.

### Relation to 006 & out-of-scope guards

- **FR-048**: This feature MUST prepare a Design System with concrete values consumable later by `006`
  but MUST NOT implement CSS/SCSS/Style Dictionary/export/transformations/build pipelines, and MUST
  NOT embed export configuration inside presets.

### Key Entities *(conceptual; data, not implementation)*

- **Preset**: a bundled, versioned, immutable envelope — `id`, `name`, `description`, `version`,
  `includedCategories`, and a DTCG token block contributing primitive/semantic foundation tokens.
- **Preset catalog**: the ordered, deterministic set of bundled presets.
- **Application plan / diff**: structured prediction of changes — entries classified as
  `create`/`update`/`unchanged`/`conflict`/`skip`, plus a writable/blocked flag.
- **Conflict**: stable code + logical path + severity + proposed action + blocks-write flag.
- **Application result**: discriminated outcome (`applied`/`unchanged`/`conflict`/`invalid-preset`/
  `not-found`/`read-error`/`write-error`/`verification-error`/`internal-error`) with the recoverable
  structured data (plan, conflicts, post-write verification) and whether a write occurred.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Presets are listed in a stable order; listing twice yields identical results.
- **SC-002**: A preset can be inspected (metadata, categories, contributed tokens) with **zero**
  writes to the host.
- **SC-003**: A preview/plan is complete and deterministic and the target file is **byte-identical**
  before and after.
- **SC-004**: 100% of the defined conflict kinds are detected and reported **before** any write.
- **SC-005**: Application is atomic — under induced write failure the original file is byte-identical
  and no temporary artifact remains.
- **SC-006**: All unmanaged content (tokens, unknown `$extensions`, descriptions, non-included
  categories) is byte-identical after a successful apply.
- **SC-007**: Re-applying the same preset reports `unchanged` and performs **zero** writes.
- **SC-008**: A dry-run/plan performs **zero** writes; an apply with a blocking conflict performs
  **zero** writes.
- **SC-009**: After a successful apply, the contributed foundation result is observable via
  `neuraz-ds foundations`.
- **SC-010**: All operations complete without a TTY and never block on stdin.
- **SC-011**: `validate --json`, `inspect --json` (`003`) and `foundations --json` (`004`) remain
  byte-identical; preset JSON parses and is byte-stable.
- **SC-012**: The closed features `001`–`004` show **no regressions** after this feature's
  specification-driven work (full existing suite stays green).

## Assumptions

- The host has been initialized by `001` (a valid `base.tokens.json` exists) before apply; otherwise
  apply yields `not-found`. List/inspect do not require an initialized host.
- The bundled catalog ships at least one demonstrative/base preset; concrete names, palettes, scales
  and typography values are **deferred to planning** (no brand palettes/commercial fonts/themes here).
- The `004` foundation namespace, category registry, and target file path are reused as-is.
- Exit-code numbers are conceptual here; precise mapping (reusing `002`/`004`/`init` codes where
  semantics match) is finalized in planning, constrained by FR-038/FR-039.

## Dependencies

- `004-foundations` (categories, levels, namespace metadata, type compatibility, states, outcomes).
- `002-ds-validate-inspect` (host resolution, reader, parse, DTCG traversal, alias graph, type
  resolution, trust, limits, issues, outcomes).
- `001-ds-init` (the initialized `base.tokens.json` target) — consumed, never modified.

## Out of Scope

Themes; dark/light; component tokens; visual/aesthetic design of presets; preset editor; presets
downloaded from the internet; marketplace; script execution; plugins; CSS; SCSS; Style Dictionary;
export; Figma; MCP; TUI; viewer; visual editing; multiple Design Systems per host; multiple token
files; automatic Git commits; npm publication; format migration; **token deletion**; automatic repair
of foreign content; local/external-path presets (v1); automatic preset composition; per-apply category
selection (v1); automatic application during `init`.
