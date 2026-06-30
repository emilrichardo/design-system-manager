# Research — Token Mutation Commands and Safe Diff (Phase 0)

Decisions that ground the plan. Each: Decision · Rationale · Alternatives rejected. No code here.

## D1 — Structured-command mutation model and flow

**Decision**: All mutations are expressed as a `TokenMutationCommandV1` (an ordered set of typed
`TokenMutationOperationV1`) and processed through a fixed flow: command → read snapshot → analyze →
validate command → build mutation plan → calculate diff → validate candidate document → approval boundary
→ transactional apply → post-write verification. There is no path from a command to `fs.writeFile`.

**Rationale**: A single validated, previewable, transactional pipeline is the only safe way to let
CLI/MCP/Studio/editor/importers all mutate the source without divergent logic or unsafe direct writes
(guardrails 3, 4, 8). It generalizes the proven `005-presets apply` path.

**Alternatives rejected**: Per-surface direct file edits (unsafe, divergent); a patch/JSON-Pointer format
(too low-level, bypasses DTCG/alias validation); free-form text edits (no validation, no diff).

## D2 — Approval boundary: plan is preview, apply is explicit

**Decision**: `plan` is read-only and returns the plan + diff; `apply` is a separate, explicit call that
re-derives the plan from the same commands and writes only past that boundary. `apply` recalculates
(does not trust a serialized plan blindly) and re-checks concurrency, exactly like `005 apply`.

**Rationale**: Mirrors the candidate-review guardrail (8) and the presets model; Studio/MCP render the
diff, the human/agent approves, then `apply` runs. Re-deriving avoids stale-plan application.

**Alternatives rejected**: Applying a serialized plan token directly (risks acting on a stale snapshot);
auto-applying on plan (no approval boundary).

## D3 — DTCG groups and which group operations are supported

**Decision**: In DTCG a "group" is simply a nested object node (no `$value`) that may carry `$description`
and `$extensions`. Supported group operations: `create-group` (create an empty nested object, optionally
with `$description`), `rename-group` (rename the object key + rewrite descendant references),
`move-group` (re-parent the object subtree + rewrite references), `remove-empty-group` (delete a nested
object only when it has no token/group descendants). There is no separate "group entity" beyond nesting.

**Rationale**: Matches DTCG 2025.10 nesting semantics and the current analysis model; keeps groups as
structure, not a second source of truth.

**Alternatives rejected**: A first-class group registry (duplicate source of truth); deleting non-empty
groups (data loss; use explicit token removals first); group-level `$value` (not DTCG).

## D4 — Rename/move reference policy: update all affected aliases (v1)

**Decision**: The v1 policy is **update all affected aliases**. On `rename-token`/`move-token`/
`rename-group`/`move-group`, every alias whose reference resolves to an affected path is rewritten to the
new path. Broken aliases are never produced; the diff lists every modified reference as `alias-changed`.
Renames/moves never overwrite an existing destination (collision blocks).

**Rationale**: It is the only policy that preserves alias integrity while keeping rename/move useful, and
it is fully auditable via the diff. Reference rewriting reuses the existing alias graph from `002`.

**Alternatives rejected**:
- *reject-when-referenced*: safe but frequently unusable (cannot rename anything referenced).
- *update-immediate-references-only*: incomplete — transitive/chained aliases could break.
- *silent partial update*: forbidden (could leave dangling aliases; violates "never silent").

## D5 — Validation classification

**Decision**: Each validation case is classified:

- **Blocking (hard error, nothing written)**: invalid-path, token-not-found, group-not-found,
  alias-not-found, alias-cycle, alias-to-group, type-mismatch, invalid-dtcg-value,
  parent-descendant-conflict, removal-with-dependents, group-removal-non-empty.
- **Blocking conflict (state/collision)**: rename-collision, move-collision, token-exists (for
  create/duplicate), concurrent-source-change.
- **Requires an explicit different operation** (not a flag): replacing an existing token is `update-*`,
  not `create`; removing a group is `remove-empty-group` after emptying it.
- **Auto-resolved and shown in the diff**: alias-reference rewriting on rename/move (D4).
- **Never silently resolved**: type-mismatch, invalid-dtcg-value, broken aliases, concurrent-source-change
  — always surfaced as blocking with a stable code.

**Rationale**: Predictable, safe, and auditable; aligns with guardrails 8 and 14.

**Alternatives rejected**: Best-effort auto-fixing of values/types (silent data changes); `--force`
overrides (see D6).

## D6 — Remove policies (no `--force`)

**Decision**: Removing a token with dependents is **blocked by default** (`removal-with-dependents`,
listing dependents); there is **no `--force`** in v1. Removing a non-empty group is **blocked**
(`group-removal-non-empty`); a group is removed only via `remove-empty-group` once it has no descendants.

**Rationale**: A `--force` that breaks aliases contradicts the "no broken aliases" guarantee; no
demonstrated contractual need. Emptying-then-removing keeps every step previewable and safe.

**Alternatives rejected**: `--force` removal (breaks aliases silently); cascade-delete dependents
(destructive and surprising); recursive group delete (data loss).

## D7 — Single-file transactional reuse vs the candidate-directory set writer

**Decision**: The token source is a **single file**, so apply reuses the `005`
`SingleFileAtomicWriter` (`createSingleFileAtomicWriter`) — temp-write + snapshot-identity concurrency
detection + atomic replace + backup + restore + post-write verification — the same writer `005-presets
apply` uses. The `006`/`007` candidate-directory set writer is for multi-file sets and is **not** needed
here. A shared "safe single-file candidate write" abstraction MAY be extracted later (documented in the
plan, not implemented; must not change `005` behavior/contracts).

**Rationale**: Right tool for a single-file mutation; avoids duplicating write orchestration and reuses a
proven, tested path.

**Alternatives rejected**: A new bespoke writer (duplication, drift); the set writer (over-engineered for
one file).

## D8 — Concurrency detection by snapshot identity

**Decision**: The plan captures the source's logical path + content hash (snapshot identity). `apply`
re-reads and compares by bytes/hash (not mtime); a mismatch blocks with `conflict`
(`concurrent-source-change`). This reuses the `005` writer's concurrent-modification detection.

**Rationale**: Prevents lost updates across surfaces/agents (FR-016); deterministic and mtime-independent.

**Alternatives rejected**: mtime/size checks (unreliable); no concurrency check (lost updates).

## D9 — Outcomes and exit codes; independent JSON envelope

**Decision**: Reuse the closed outcome/exit vocabulary of `001`–`007` and add one domain outcome,
`invalid-command`, for malformed/illegal commands. Mapping: `planned`/`applied`→0, `unchanged`→2,
`invalid-command`/`invalid-design-system`→3, `conflict`→4, `not-found`→5, `read-error`/`write-error`→6,
`verification-error`→7; `internal-error` is adapter-only (→70). Provide a **separate**
`TokenMutationJsonEnvelopeV1` (`formatVersion: "1.0.0"`), not an extension of `003`.

**Rationale**: Consistency for consumers without changing closed JSON contracts (byte-stability of
`003`/`004`/`006`/`007`). `invalid-command` is genuinely new (command-level validity, distinct from
`invalid-design-system`).

**Alternatives rejected**: Extending `003`'s envelope (changes a closed contract); reusing
`invalid-design-system` for command errors (conflates two distinct failures); a new exit-code table
(breaks consumer expectations).

## D10 — Deterministic candidate and unknown-content preservation

**Decision**: The candidate document is produced deterministically (stable key handling) and preserves
unknown content of untouched nodes (unknown `$extensions`, properties an operation does not manage). Only
the nodes an operation targets change. Serialization is canonical and reused from the existing token
write path.

**Rationale**: FR-018; protects user/importer metadata and keeps diffs/bytes stable.

**Alternatives rejected**: Re-emitting the whole document from a normalized model (would drop unknown
content and reorder keys).

## D11 — Thin CLI with an optional declarative command file

**Decision**: The headless API is primary. The future CLI is a thin adapter exposing conceptual commands
(`token create|update|rename|move|remove|plan`). To avoid an oversized flag matrix, the CLI MAY accept a
**declarative JSON command file** (a `TokenMutationCommandV1` document) for batch/complex operations;
simple operations may use a few flags. No CLI is implemented in this planning phase.

**Rationale**: Mutations are structurally rich (values, aliases, paths); a JSON command file is the
natural batch interface and is exactly what MCP/Studio already build, so the CLI reuses the same shape.

**Alternatives rejected**: A huge flag-based CLI for every operation/field (unwieldy, divergent from the
structured command); no CLI at all (the spec asks for a conceptual surface).

## D13 — Metadata operations and consistency with 004/005

**Decision**: `update-description` edits the DTCG standard `$description`. `update-category` edits the
token's **Neuraz classification metadata** under `$extensions["ar.neuraz.design-system-manager"]` (the
same block `004`/`005` use, e.g. `foundation.level`); it does not introduce a new persisted `category`
field. `remove-alias` **inlines the resolved concrete value** so the token is never left value-less.

**Rationale**: Keeps `008` consistent with `004` — in `004` the *foundation category* is **path-derived
and read-only**, so recategorizing by location is done via `move-token`/`move-group`, while the editable
classification is the Neuraz `$extensions` metadata. Inlining on `remove-alias` preserves a valid DTCG
token.

**Alternatives rejected**: A persisted `$category` field (contradicts `004`'s derived category and DTCG);
`remove-alias` leaving an empty `$value` (produces an invalid token); editing the path-derived category
in place (would require a move, not a metadata edit).

## D12 — Headless, adapters later

**Decision**: Deliver the headless use cases + contracts now; a thin CLI surface may be wired as the last
checkpoint. MCP, skills, Studio, the Visual Token Editor, preset authoring and approved importers are
future adapters that reuse the same use cases.

**Rationale**: Guardrail 3 — one source of behavior across interfaces.

**Alternatives rejected**: Building UI/MCP/editor now (out of scope; would duplicate logic before the
core is proven).
