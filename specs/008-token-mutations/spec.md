# Feature Specification: Token Mutation Commands and Safe Diff

**Feature Branch**: `008-token-mutations`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Provide a headless, safe API to modify the DTCG token document
(`design-system/tokens/base.tokens.json`) through **structured commands** instead of free-form file
edits. Every mutation flows command → read snapshot → analyze → validate command → build mutation plan →
calculate diff → validate candidate document → approval boundary → transactional apply → post-write
verification. The plan and diff are read-only, deterministic and expose only safe, logical data. Writes
reuse the proven single-file transactional guarantees of `005`/`006`/`007` (snapshot identity,
concurrency detection, backup, restore, verification, idempotency). Renames/moves rewrite **all** affected
alias references so aliases never break; removing a token with dependents or a non-empty group is blocked.
This API is the single shared base for CLI, MCP, skills, Studio, the Visual Token Editor, preset authoring
and approved importers — the UI never writes `base.tokens.json` directly. No visual interface, viewer,
asset editing, Figma, scraping, AI/inference, multi-theme, component tokens, auto Git commits,
collaboration server or cloud sync. Closed features `001`–`007` keep their behavior and byte-stability.

---

## Concepts & Definitions *(mandatory context)*

This feature generalizes the safe single-file token-write path proven by `005-presets` (apply) into a
reusable, command-driven mutation API over the DTCG source. It follows the product architecture guardrails
([`docs/product/architecture-guardrails.md`](../../docs/product/architecture-guardrails.md)): the Core is
the authority, the UI is a client, the filesystem stays behind ports, writes are transactional, and
unknown content is preserved.

| Concept | Defines | Owns | In scope here? |
|---|---|---|---|
| **Token source (DTCG)** | `design-system/tokens/base.tokens.json` — the single source of truth. | Token values, types, aliases, groups, metadata. | **Mutated only through this API.** |
| **Mutation command** | A structured, validated instruction (`TokenMutationCommandV1`) describing one or more operations. | The user's intent. | **Yes — this feature.** |
| **Mutation plan** | `TokenMutationPlanV1` — the read-only, deterministic projection of what would change. | The preview. | **Produced; never writes.** |
| **Mutation diff** | `TokenMutationDiffV1` — the per-path set of changes (added/updated/renamed/moved/removed/alias/metadata/group). | The reviewable change set. | **Produced; safe/logical only.** |
| **Candidate document** | The in-memory next DTCG document the plan would produce. | The proposed file content. | **Validated before any write.** |
| **Approval boundary** | The explicit gate between `plan` (preview) and `apply` (write). | Human/agent approval. | **Yes — apply is always explicit.** |
| **Mutation result** | `TokenMutationResultV1` — outcome, wrote flag, diff, conflicts, recovery, safe error. | The structured outcome. | **Produced by plan and apply.** |

**Product problem solved**: editing tokens by hand or letting each surface (CLI/MCP/Studio/editor)
write the file independently is unsafe — it risks broken aliases, invalid DTCG, lost unknown content,
concurrent overwrites and divergent logic. A single, validated, transactional command API makes every
mutation previewable (plan + diff), safe (validation + reference rewrite), and atomic (transactional
write with recovery), shared identically by every interface.

### Separation invariant

Token mutations operate **only** on `design-system/tokens/base.tokens.json`. They MUST NOT modify
`design-system/build/**`, `design-system/assets/**`, the host manifest
(`design-system/design-system.json`) or the asset manifest (`design-system/assets/assets.json`). They
reuse the closed `002`/`004` analysis engine for reading/validation and never reimplement it.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan a token creation (Priority: P1)

A developer or agent submits a `create-token` command and receives a deterministic plan and diff showing
the token that would be added — without writing anything.

**Why this priority**: `plan` is the safety gate and the minimum viable, read-only surface every consumer
(CLI/MCP/Studio) needs first.

**Independent Test**: Planning a valid `create-token` returns a plan with one `added` diff entry at the
logical path; the source file is byte-identical before and after.

**Acceptance Scenarios**:

1. **Given** a valid Design System, **When** a `create-token` is planned, **Then** the diff has one
   `added` entry with the logical path and a safe public value, and `outcome` is `planned`.
2. **Given** a `create-token` for an existing path, **When** planned, **Then** `outcome` is
   `invalid-command` with a `token-exists` reason and nothing is written.

---

### User Story 2 - Apply a token creation (Priority: P1)

After reviewing the plan, the user applies the command; the token is written transactionally and the
document remains valid DTCG.

**Why this priority**: Apply is the only write path and must be atomic and verified.

**Independent Test**: Applying a reviewed `create-token` writes the token and re-analysis confirms it;
an induced mid-write failure leaves the prior or the new document, never a partial file.

**Acceptance Scenarios**:

1. **Given** a planned `create-token`, **When** applied, **Then** `outcome` is `applied`, `wrote:true`,
   and the new document is valid DTCG.
2. **Given** an identical re-apply, **When** applied, **Then** `outcome` is `unchanged`, `wrote:false`.

---

### User Story 3 - Update a token value (Priority: P1)

A user updates a token's `$value` (and only that), with the diff showing the previous and next public
values.

**Why this priority**: Value editing is the most common mutation and the core of the Visual Token Editor.

**Independent Test**: Updating a value yields an `updated` diff entry; the type/description/aliases are
untouched; invalid DTCG values are rejected before any write.

**Acceptance Scenarios**:

1. **Given** a concrete token, **When** its value is updated to a valid DTCG value, **Then** the diff
   shows one `updated` entry and apply succeeds.
2. **Given** an update to an invalid DTCG value, **When** planned, **Then** `outcome` is
   `invalid-command` (`invalid-dtcg-value`) and nothing is written.

---

### User Story 4 - Create or remove an alias (Priority: P1)

A user sets a token to alias another (`set-alias`) or removes an alias (`remove-alias`), with cycle and
target validation.

**Why this priority**: Aliases are central to DTCG and the main source of breakage if done unsafely.

**Independent Test**: `set-alias` to a valid target yields an `alias changed` diff; a cycle or
alias-to-group is rejected; `remove-alias` on a non-alias is `invalid-command`.

**Acceptance Scenarios**:

1. **Given** two concrete tokens, **When** one is set to alias the other, **Then** the diff shows an
   `alias changed` entry and the candidate is valid.
2. **Given** a `set-alias` that would create a cycle or point to a group, **When** planned, **Then**
   `outcome` is `invalid-command` (`alias-cycle` / `alias-to-group`).

---

### User Story 5 - Rename a token with references (Priority: P1)

A user renames a token; every alias that referenced the old path is rewritten to the new path so no alias
breaks, and the diff lists the rename plus every updated reference.

**Why this priority**: Rename is high-value and the most dangerous for alias integrity.

**Independent Test**: Renaming a referenced token yields a `renamed` entry and `alias changed` entries for
each referencing token; the candidate has no broken aliases.

**Acceptance Scenarios**:

1. **Given** a token referenced by two aliases, **When** it is renamed, **Then** the diff shows one
   `renamed` entry and two `alias changed` entries, and no alias is left dangling.
2. **Given** a rename whose destination path already exists, **When** planned, **Then** `outcome` is
   `conflict` (`rename-collision`) and nothing is written.

---

### User Story 6 - Move a token (Priority: P1)

A user moves a token to a different group; references are rewritten exactly as for rename, and the diff
shows the `moved` entry plus updated references.

**Why this priority**: Move and rename share the reference-integrity policy; moving reorganizes the tree.

**Independent Test**: Moving a referenced token yields a `moved` entry and `alias changed` entries; a
move whose destination exists is a `move-collision`.

**Acceptance Scenarios**:

1. **Given** a token under `color.brand`, **When** moved to `color.base`, **Then** the diff shows a
   `moved` entry and any referencing aliases are rewritten.
2. **Given** a move into a path occupied by another token, **When** planned, **Then** `outcome` is
   `conflict` (`move-collision`).

---

### User Story 7 - Remove a token without dependents (Priority: P1)

A user removes a token that nothing aliases; it is deleted transactionally.

**Why this priority**: Safe deletion is required and must be ownership/dependency-aware.

**Independent Test**: Removing an unreferenced token yields a `removed` diff entry and apply succeeds.

**Acceptance Scenarios**:

1. **Given** a token with no dependents, **When** removed, **Then** the diff shows one `removed` entry
   and apply succeeds.

---

### User Story 8 - Block removal with dependents (Priority: P1)

Removing a token that other tokens alias is blocked by default; the result lists the dependents.

**Why this priority**: Prevents silent alias breakage — a core safety guarantee.

**Independent Test**: Removing a referenced token returns `conflict` (`removal-with-dependents`) listing
the dependents; nothing is written; no `--force` exists.

**Acceptance Scenarios**:

1. **Given** a token referenced by an alias, **When** removal is planned, **Then** `outcome` is
   `conflict` with the dependents listed and nothing is written.

---

### User Story 9 - Manage groups (Priority: P2)

A user creates, renames, moves, or removes (only when empty) a group, with references rewritten on
rename/move.

**Why this priority**: Groups organize the token tree; group ops must respect DTCG nesting and alias
integrity.

**Independent Test**: `create-group` adds an empty group; `rename-group`/`move-group` rewrite descendant
references; `remove-empty-group` only succeeds when the group has no descendants.

**Acceptance Scenarios**:

1. **Given** a group with descendants, **When** `remove-empty-group` is planned, **Then** `outcome` is
   `conflict` (`group-removal-non-empty`).
2. **Given** a group rename, **When** planned, **Then** descendant token paths and every alias that
   referenced them appear in the diff (`group changed` + `alias changed`).

---

### User Story 10 - Obtain a deterministic diff (Priority: P2)

Any consumer can obtain a stable, machine-readable diff for a set of commands.

**Why this priority**: Studio/MCP render the diff for approval; it must be deterministic and safe.

**Independent Test**: Planning the same commands against the same source yields byte-identical diffs;
the diff contains only logical paths and safe public values.

**Acceptance Scenarios**:

1. **Given** the same commands and source, **When** planned twice, **Then** the diffs are identical.
2. **Given** any diff, **When** inspected, **Then** it contains no raw bytes, absolute paths, `Error`,
   stack traces or internal parsed document.

---

### User Story 11 - Detect a concurrent source change (Priority: P2)

If the source changed between plan and apply, apply refuses rather than overwriting.

**Why this priority**: Prevents lost updates across surfaces/agents.

**Independent Test**: Modifying the source between the captured snapshot and apply yields
`conflict` (`concurrent-source-change`) and nothing is written.

**Acceptance Scenarios**:

1. **Given** a plan captured at snapshot S, **When** the source changes and apply runs, **Then**
   `outcome` is `conflict` (`concurrent-source-change`).

---

### User Story 12 - Obtain JSON output (Priority: P2)

Plan and apply can emit a stable JSON envelope for CI, agents and Studio.

**Why this priority**: Headless consumers need parseable, stable output.

**Independent Test**: The JSON form of plan/apply parses, carries `formatVersion: "1.0.0"`, and contains
only logical paths and safe values.

**Acceptance Scenarios**:

1. **Given** a plan or apply, **When** JSON output is requested, **Then** stdout is exactly one
   `TokenMutationJsonEnvelopeV1` with `formatVersion: "1.0.0"`.

---

### User Story 13 - Use the headless use cases (Priority: P2)

Studio, MCP and skills invoke the same use cases without CLI/UI coupling.

**Why this priority**: One source of behavior across every surface (guardrail 3).

**Independent Test**: The use cases depend on no Commander/process/TTY/React/browser/Figma/AI and return
plain structured data.

**Acceptance Scenarios**:

1. **Given** the mutation use cases, **When** invoked from any adapter, **Then** they return the same
   plan/diff/result with logical paths and outcomes.

---

### User Story 14 - Preserve assets, build and unknown content (Priority: P2)

Mutations only touch the token source; assets, build artifacts, host/asset manifests and unknown token
content (unknown `$extensions`, key order where preserved) are untouched.

**Why this priority**: Compatibility with `001`–`007` and the separation invariant.

**Independent Test**: After any mutation, `design-system/build/**`, `design-system/assets/**`, the host
manifest and asset manifest are byte-identical; unknown `$extensions` on untouched tokens are preserved.

**Acceptance Scenarios**:

1. **Given** a project with build, assets and unknown token metadata, **When** a token is mutated, **Then**
   build/assets/manifests are unchanged and unknown metadata on other tokens is preserved.

---

### Edge Cases

- Invalid logical path (traversal, empty segment, reserved `$` key) → `invalid-command` (`invalid-path`).
- Target token/group does not exist for update/rename/move/remove → blocked (`token-not-found` /
  `group-not-found`).
- `create-token`/`duplicate-token` to an existing path → `invalid-command` (`token-exists`).
- `set-alias` target missing/group/cyclic → blocked (`alias-not-found`/`alias-to-group`/`alias-cycle`).
- Value/type mismatch (alias target type ≠ declared type) → blocked (`type-mismatch`), never silent.
- Invalid DTCG value for the declared type → blocked (`invalid-dtcg-value`).
- Parent/descendant conflict (move a group into its own descendant) → blocked
  (`parent-descendant-conflict`).
- Remove a token with dependents → blocked (`removal-with-dependents`), no `--force`.
- Remove a non-empty group → blocked (`group-removal-non-empty`); use the explicit operation set instead.
- Source changed since snapshot → blocked (`concurrent-source-change`).
- A batch where any operation is invalid → the whole plan is rejected (all-or-nothing; no partial apply).
- Source unreadable / invalid DTCG → `read-error` / `invalid-design-system`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept structured mutation commands (`TokenMutationCommandV1`) carrying one
  or more ordered operations (`TokenMutationOperationV1`); it MUST NOT accept free-form file edits.
- **FR-002**: The system MUST support the token operations: `create-token`, `update-value`,
  `update-type`, `update-description`, `update-category`, `set-alias`, `remove-alias`, `rename-token`,
  `move-token`, `duplicate-token`, `remove-token`.
- **FR-003**: The system MUST support the group operations compatible with DTCG: `create-group`,
  `rename-group`, `move-group`, `remove-empty-group` (DTCG groups are nested objects; see research).
- **FR-004**: Every mutation MUST follow the flow: command → read snapshot → analyze → validate command →
  build mutation plan → calculate diff → validate candidate document → approval boundary → transactional
  apply → post-write verification. It MUST NOT write the file directly from a command.
- **FR-005**: The system MUST perform one semantic read/analysis of the source (reusing `002`/`004`),
  with no second parser/alias-graph/type-engine.
- **FR-006**: The system MUST provide a `plan` operation that is read-only and deterministic: the source
  is byte-identical before and after, and identical commands + source yield identical plan and diff.
- **FR-007**: The system MUST produce a `TokenMutationDiffV1` able to represent: `added`, `updated`,
  `renamed`, `moved`, `removed`, `alias changed`, `metadata changed`, `group changed`.
- **FR-008**: The diff and plan MUST contain only logical paths and safe public values; they MUST NOT
  contain raw bytes, absolute paths, `Error`, stack traces, the internal parsed document or trust
  internals.
- **FR-009**: Before any write, the system MUST validate the candidate document and detect: invalid path,
  token-exists, token-not-found, group-not-found, rename-collision, move-collision, alias-not-found,
  alias-cycle, alias-to-group, type-mismatch, invalid-dtcg-value, parent/descendant conflict,
  removal-with-dependents, group-removal-non-empty, concurrent-source-change.
- **FR-010**: The system MUST classify each validation case as **blocking**, **requiring an explicit
  operation/strategy**, **auto-resolved (and shown in the diff)**, or **never silently resolved**, per
  the contract (see research/data-model). Type mismatches, invalid values, broken aliases and concurrent
  changes MUST never be resolved silently.
- **FR-011**: On `rename-token`/`move-token`/`rename-group`/`move-group`, the system MUST apply the v1
  reference policy **update all affected aliases**: every alias referencing an affected path is rewritten
  to the new path; the system MUST NOT leave broken aliases, and the diff MUST list every modified
  reference.
- **FR-012**: `rename`/`move` MUST NOT overwrite an existing token/group at the destination; a collision
  MUST block (`rename-collision`/`move-collision`).
- **FR-013**: Removing a token with dependents MUST be blocked by default (`removal-with-dependents`),
  listing the dependents; the system MUST NOT provide a `--force` bypass in v1.
- **FR-014**: Removing a non-empty group MUST be blocked (`group-removal-non-empty`); only
  `remove-empty-group` removes a group, and only when it has no descendants.
- **FR-015**: Apply MUST be transactional and reuse the `005`/`006`/`007` write guarantees: ownership /
  snapshot identity, concurrency detection (by bytes/hash, not mtime), backup, restore, post-write
  verification, idempotency and safe recovery; partial writes MUST never be visible.
- **FR-016**: The system MUST detect a concurrent source change between the captured snapshot and apply,
  and block with `conflict` (`concurrent-source-change`) without writing.
- **FR-017**: Re-applying a command set that produces no change MUST yield `unchanged` with `wrote:false`
  and no rewrite (idempotency).
- **FR-018**: The system MUST keep the candidate document deterministic and preserve unknown content of
  untouched nodes (unknown `$extensions`, properties the operation does not manage) and key order to the
  extent the write policy preserves it.
- **FR-019**: The system MUST classify outcomes using the closed set `planned`, `applied`, `unchanged`,
  `invalid-command`, `invalid-design-system`, `conflict`, `not-found`, `read-error`, `write-error`,
  `verification-error`, mapped to the shared exit-code table of `001`–`007`. `internal-error` exists only
  at the adapter boundary and MUST NOT be a domain outcome.
- **FR-020**: The system MUST expose every operation as a headless use case with no Commander, process,
  TTY, React, browser, Figma, scraping or AI dependency, returning plain structured results reusable by
  CLI, MCP, skills, Studio, the Visual Token Editor, preset authoring and approved importers.
- **FR-021**: The system MUST expose stable `1.0.0` contracts: `TokenMutationCommandV1`,
  `TokenMutationOperationV1`, `TokenMutationPlanV1`, `TokenMutationDiffV1`, `TokenMutationResultV1`, an
  outcomes/exit-codes/streams contract, and a `TokenMutationJsonEnvelopeV1` for `plan`/`apply` JSON.
- **FR-022**: The system MUST use logical relative paths in every public result/diff/error; it MUST NOT
  expose absolute paths, cwd, hostname, username or stack traces.
- **FR-023**: Mutations MUST NOT modify `design-system/build/**`, `design-system/assets/**`, the host
  manifest or the asset manifest; closed features `001`–`007` MUST remain byte-stable.
- **FR-024**: A batch of operations MUST be all-or-nothing: if any operation is invalid, the whole plan is
  rejected and nothing is written; there is no partial application.
- **FR-025**: The future CLI (`neuraz-ds token …`) MUST be a thin adapter over the headless use cases; the
  headless API is the priority. The command surface MAY accept a declarative JSON command file to avoid an
  oversized flag-based CLI (see research).
- **FR-026**: The system MUST NOT include out-of-scope capabilities: visual interface, viewer, asset
  editing, Figma, scraping, image analysis, AI/inference, multi-theme, component tokens, automatic Git
  commits, collaboration server or cloud sync.

### Key Entities *(include if feature involves data)*

- **TokenMutationOperationV1**: A discriminated operation (create/update/alias/rename/move/duplicate/
  remove for tokens; create/rename/move/remove-empty for groups) with logical paths and safe values.
- **TokenMutationCommandV1**: An ordered, validated set of operations submitted together (all-or-nothing).
- **TokenMutationPlanV1**: The read-only, deterministic projection: ordered operations, the diff, the
  candidate document hash, and the captured source snapshot identity.
- **TokenMutationDiffV1 / TokenMutationDiffEntry**: Per-path change of kind `added | updated | renamed |
  moved | removed | alias-changed | metadata-changed | group-changed`, with before/after safe public
  values and the affected references.
- **TokenMutationResultV1**: Discriminated result carrying outcome, wrote flag, diff, conflicts, recovery
  state and a safe error.
- **MutationConflict / MutationIssue**: Stable-coded, ordered, logical-path reasons for blocked commands.
- **SourceSnapshotIdentity**: The logical source path + content hash captured at plan time, used to detect
  concurrent change at apply.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `plan` never writes: the source is byte-identical before and after planning, in 100% of
  cases.
- **SC-002**: Identical commands + source produce byte-identical plans and diffs, in 100% of cases.
- **SC-003**: After any rename/move, the candidate document has zero broken aliases, and every modified
  reference appears in the diff, in 100% of cases.
- **SC-004**: Removing a token with dependents is blocked in 100% of cases; no mutation ever leaves a
  dangling alias.
- **SC-005**: Apply is all-or-nothing: an induced mid-write failure always leaves the prior or the new
  document, never a partial file.
- **SC-006**: A concurrent source change between plan and apply is detected and blocked in 100% of cases.
- **SC-007**: Re-applying a no-op command set yields `unchanged` and writes nothing, in 100% of cases.
- **SC-008**: No mutation modifies build, assets, host manifest or asset manifest; `001`–`007` outputs
  remain byte-identical.
- **SC-009**: Unknown `$extensions` and unmanaged properties on untouched tokens are preserved in 100% of
  cases.
- **SC-010**: All public plan/diff/result outputs contain no absolute paths, raw bytes, `Error` or stack
  traces.
- **SC-011**: The JSON envelope for plan/apply parses and carries `formatVersion: "1.0.0"`.
- **SC-012**: Outcomes map to the shared exit-code table identically to `001`–`007` for equivalent
  conditions.

## Assumptions

- The source is the single DTCG document `design-system/tokens/base.tokens.json`; multi-file token sets,
  themes and component tokens are out of scope.
- The host is resolved by the existing host resolution; no new host concept is introduced.
- The write is a **single file** (the token source); it reuses the `005` single-file atomic writer's
  guarantees (snapshot identity, concurrency detection, backup, restore, verification), with `006`/`007`
  as the conceptual transactional model. A shared safe-write abstraction MAY be extracted (documented in
  the plan, not implemented here).
- The v1 reference policy for rename/move is **update all affected aliases**; reject-when-referenced and
  update-immediate-only are documented alternatives, not v1.
- The CLI, MCP server, Studio and Visual Token Editor are **future** adapters; this feature delivers the
  headless core and contracts and (optionally) a thin CLI surface, not the other adapters.
- The common outcome/exit-code vocabulary of `001`–`007` is reused; only `invalid-command` is added as a
  domain outcome specific to malformed/illegal commands.
