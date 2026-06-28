# Research — 004-foundations

Technical research for a read-only foundations view derived from the existing single analysis.
All decisions verified against **real code** (signatures/flows), not documentation names. No new
dependencies. No code in this phase.

## 1. Observed architecture (verified in code)

- [`analyzeExistingDesignSystem(input, deps, limits)`](../../src/application/analyze-existing-design-system.ts)
  is the **single producer** of `DesignSystemAnalysis`: 1 host resolve, 1 presence, ≤1 read + ≤1
  `JSON.parse` per document, **1 DTCG traversal** (via `deps.dtcgAnalyzer.analyze(value)`), 0 writes.
- **Key finding (line 191)**: for each read document it stores
  `documents[rel] = { …, parsed: value, … }`. The **full parsed tokens JSON** (including
  `$extensions` and group structure) is therefore retained in
  `analysis.documents["design-system/tokens/base.tokens.json"].parsed`.
- `analysis.nodes: readonly TokenNodeSummary[]` holds, per token, `path`, `declaredType`,
  `effectiveType`, `typeOrigin`, `typeSourcePath`, `kind` (`concrete|alias`), `aliasTarget`,
  `aliasState` (`valid|missing|to-group|cyclic|malformed|n/a`), `description`, `depth`, `trust`.
  **It does NOT carry `$extensions` nor group provenance.**
- `analysis.statistics: InspectionStatistics` (`total/groups/concreteValues/aliases/byType/maxDepth/
  aliasIssues`); `analysis.errors|warnings: AnalysisIssue[]`; `analysis.limits: AnalysisLimitsResult`;
  `analysis.structuralState`; `analysis.host`.
- [`createBoundAnalyze()`](../../src/cli/composition.ts) returns an `AnalyzeUseCase`
  `(input) => Promise<DesignSystemAnalysis>` already bound to real adapters; reused by validate/inspect.
- [`AnalysisIssue`](../../src/domain/analysis/analysis-issue.ts) = `Issue` + `severity` + `document?`
  + `context?`; factories `analysisError`/`analysisWarning`; `code` stable.
- [`exitCodeForOutcome`](../../src/cli/exit-codes.ts) maps `valid→0, complete-invalid→3, partial→4,
  not-found→5, read-error→6`; `INTERNAL_ERROR_EXIT=70`.
- 003 JSON: [`serializeJsonV1(envelope)`](../../src/infrastructure/reporter/json-serializer.ts) =
  `JSON.stringify(envelope, null, 2) + "\n"`; `JSON_FORMAT_VERSION="1.0.0"`; reporters write once in
  `completed()`. The serializer is typed to the validate/inspect `JsonEnvelopeV1` union.

## 2. Integration strategy — decision: **Option C** (derive post-traversal)

| Option | Verdict |
|---|---|
| A — enrich every `TokenNodeSummary` with foundation fields | Rejected: widens 002 public model, impacts 002 tests, mixes DTCG inspection with foundation concepts. |
| B — parallel accumulator inside the traversal | Rejected (now): modifies 002 infra (`traverse-dtcg-tree.ts`), adds traversal complexity, risk to a closed feature. |
| **C — pure projection over the already-produced analysis** | **CHOSEN.** |
| D — second parse / second DTCG traversal | Rejected: violates single-analysis invariant. |

**Why C works without touching 002**: the foundations projection consumes two artifacts the single
pass already produced — (a) `analysis.nodes` (alias/type/trust/cycle data, joined by canonical
`path`) and (b) `analysis.documents[<tokens>].parsed` (the in-memory parsed object, for `$extensions`
foundation metadata + nearest-group inheritance). No file is re-read, no JSON re-parsed, no DTCG
re-analyzed, no alias re-resolved.

- **Where `$extensions` is read**: a shallow, single metadata pass over the **already-parsed** tokens
  object (`documents[<tokens>].parsed`) building a map `path → effective foundation level + source`.
  This is metadata extraction, **not** a DTCG analysis (no alias/type/stats recomputation).
- **Where Neuraz inheritance is resolved**: during that metadata pass — descending groups carry the
  nearest declared level; a token's own metadata overrides.
- **Where invalid metadata is detected**: during the same pass (shape checks on the namespace object).
- **Where category is determined**: pure function of the node's canonical `path` (first segment) — see §4.
- **Where states are computed**: a pure reducer over the per-token foundation view + reused analysis
  issues/limits.
- **How re-analysis is avoided**: the projection is `O(nodes + parsedNodes)` with no I/O and no alias
  graph work — it reuses `aliasTarget`/`aliasState`/`effectiveType`/`trust` already on each node.

Edge: if the tokens document was not parsed (absent / read-error / json-parse-error), `parsed` is
absent → foundations reports every category `absent`/limited and reuses the analysis outcome
(`not-found`/`partial`/`read-error`) — no crash.

## 3. Effective level resolution — decision

Per the clarification (session 2026-06-28): explicit DTCG `$extensions` under
`ar.neuraz.design-system-manager` → `foundation.level ∈ {primitive, semantic}`, on token or group.

Algorithm (deterministic): for each token path, walk its ancestor chain in the parsed tree:
1. token's own `$extensions…foundation.level` (if valid) → that level, source `token`.
2. else nearest ancestor **group** with valid metadata → that level, source `group`, with the group
   path recorded.
3. else `unclassified`, source `none`.
Invalid metadata at the resolving node → level `unclassified`, source `invalid` (see §5).

Carried provenance: `{ level, source: token|group|none|invalid, sourcePath: string|null, valid }`.
This `$extensions` inheritance is a **Neuraz foundation convention**, explicitly **not** standard DTCG
inheritance (DTCG only inherits `$type`). Alias targets, `$type`, names, paths, siblings, manifest,
and config never affect level (FR-041/FR-044/FR-045).

## 4. Category resolution — decision (no blocking clarification)

The spec fixes 9 categories (FR-001) but did not state a token→category rule. A **deterministic,
non-guessing** rule exists and is adopted:

- **category = the token's first canonical path segment** when it exactly equals a recognized category
  id (`color|spacing|typography|radius|border|shadow|opacity|sizing|motion`); **else `unresolved`**.
- No inference from `$type` (insufficient: `spacing/radius/sizing` all map to `dimension`), names
  beyond the exact top-level id, alias target, or role registry. Unmatched tokens are `unresolved`
  (preserved, surfaced as unmanaged-for-category), never guessed.
- Optional **informational** check: if a resolved category's expected `$type`(s) (§7 table) do not
  match the node's `effectiveType`, emit a stable non-fatal `foundation-type-mismatch` warning; the
  category stays resolved. `color` mismatches are still only reported (deep type validation stays in
  002; foundations does not re-validate types).

Why this is not the rejected "naming convention" of the clarification: that rejection targeted
**level** (an architectural role that must not be name-guessed). Category here is a **fixed bucket
id**: a token is in category `color` only if it is literally organized under the top-level group
`color`; anything else is `unresolved` (safe), not a guess. Rejected alternatives:
`$type`-derived (ambiguous), internal role registry (heuristic/unversionable), adding
`foundation.category` to `$extensions` now (FR-046 forbids duplicating category; a deterministic rule
exists, so metadata is unnecessary in v1 — left as a future extension for 005 if ever needed).

Consequence (honest): semantic tokens organized under non-category groups (e.g. `background.default`)
resolve to category `unresolved` in v1 until organized under a category group or a future explicit
mechanism is added. This matches the level story (init tokens are `unclassified`).

## 5. Invalid metadata — decision

Invalid when: the namespace value is not an object; `foundation` is not an object; `level` is not a
string; `level` ∉ {`primitive`,`semantic`}; or `"level":"unclassified"` is persisted. Behaviour:
- one stable-coded issue **per invalid declaration** (token or group), carrying the **logical path** of
  the declaring node — **never** one per descendant (a single invalid group declaration emits once;
  descendants resolve to `unclassified` via fall-through).
- `document: "tokens"`, `severity: error`, no stack, no raw library error, **no full `$extensions`
  dump** (only the offending key path + a short reason).
- derived level at/below the invalid declaration is `unclassified`; the owning category becomes
  `invalid`; global outcome contribution per §6.
- content is preserved; never auto-corrected/normalized.

## 6. States & outcomes — decision

**Per-category state** (derived, descriptive — not a second top-level classification):
- `absent` — no token resolves to the category.
- `partial` — has tokens, but at least one is `unclassified`/category-`unresolved`, or the analysis was
  limited (limits.partial) / the tokens document is incomplete.
- `complete` — every attributable token is classified (`primitive`/`semantic`) and its foundation
  relations are valid within the supported validation depth.
- `invalid` — any foundation rule violation in the category: invalid metadata, forbidden direction
  (`primitive→semantic`), cycle, missing reference, alias-to-group, or applicable type incompatibility.
- Precedence when multiple apply: **`invalid > partial > complete > absent`**.
- `complete` is **never** defined by a concrete token roster (values belong to presets).

**Global outcome** reuses the 002 vocabulary (no second table); precedence:
`not-found > read-error > structural-partial > foundations-invalid > foundations-partial > valid`.

| Condition | outcome | exit | result |
|---|---|---|---|
| Host/DS not located | `not-found` | 5 | null |
| Tokens unreadable / invalid UTF-8 / json-parse / budget | `read-error` | 6 | recoverable |
| DS structurally partial (missing managed docs / limits.partial) | `partial` | 4 | recoverable |
| Any category `invalid` (and structurally complete) | `complete-invalid` | 3 | full |
| Tokens present, no foundation errors, but some `unclassified`/`unresolved` | `partial` | 4 | full |
| All attributable tokens classified, no foundation errors | `valid` | 0 | full |
| Unexpected CLI exception | `internal-error` (CLI only) | 70 | n/a |

`unclassified` tokens and `foundation-type-mismatch`/`dtcg-type-not-deeply-inspected` are **warnings**;
they make a category `partial` and the global outcome `partial` (exit 4), **not** `complete-invalid`.
Invalid metadata / forbidden direction / cycle / missing-ref / alias-to-group are **errors** →
`complete-invalid` (exit 3) when the DS is otherwise structurally complete. This deliberately keeps
the historical meaning of `partial` (incomplete, recoverable) and `complete-invalid` (present but
contains errors). Warnings keep exit 0 only when no category is partial and nothing is unclassified;
otherwise the presence of `unclassified` is itself a "partial coverage" signal → exit 4. *(This
partial-on-unclassified rule is a 004 decision; it never changes validate/inspect behaviour.)*

## 7. Validation depth by category (no deep claims)

| Category | Related `$type`(s) | Depth today | Guarantee |
|---|---|---|---|
| color | `color` | **deep** | shape (sRGB object) + alias (via 002) |
| spacing | `dimension` | shallow | recognition + foundation relations |
| typography | `dimension`,`fontFamily`,`fontWeight`,`number`,`typography`(composite) | shallow | recognition |
| radius | `dimension` | shallow | recognition + relations |
| border | `dimension`,`strokeStyle`,`color`,`border`(composite) | shallow | recognition |
| shadow | `shadow`(composite) | shallow | recognition |
| opacity | `number` | shallow | recognition + relations |
| sizing | `dimension` | shallow | recognition + relations |
| motion | `duration`,`cubicBezier`,`transition`(composite) | shallow | recognition |

Only `color` is deeply inspected (existing 002 behaviour). Recognized-but-shallow types keep emitting
002's `dtcg-type-not-deeply-inspected` warning. Foundations claims no deep validation for the other
eight categories.

## 8. CLI & JSON — decisions

- **Dedicated command** `neuraz-ds foundations` (single read-only command; no subcommands needed — one
  view covers all 14 stories). Rejected: subcommands (premature surface), folding into
  validate/inspect (would pressure JSON v1).
- **`--json` is in scope** (serves US5/US12/US13 and the agent-integration constitution principle, at
  near-zero cost by reusing the deterministic serializer). It uses a **separate**
  `FoundationsJsonEnvelopeV1` with its own `FOUNDATIONS_JSON_FORMAT_VERSION = "1.0.0"`, serialized by a
  shared pure formatter (`JSON.stringify(env, null, 2) + "\n"`). It **does not** touch 003's
  `JsonEnvelopeV1`, `JSON_FORMAT_VERSION`, or the validate/inspect payloads — sharing the string
  "1.0.0" does not mean sharing the contract. Versioning is independent.

## 9. Reuse, preservation, determinism, security

- Reuses host resolution, presence, readers, parser output, DTCG traversal output, alias graph, type
  resolution, trust, limits, outcomes, exit-code mapper, IO, and the deterministic JSON formatter.
- **Read-only**: no writer is built; `$extensions` and unknown content are read, never mutated.
- **Determinism**: categories in canonical order; tokens in 002 insertion/traversal order (no
  re-sort); issues stable; `byType`/records preserved; no timestamps/UUID/locale/TTY/env.
- **Security**: reuses 002 limits (file/total bytes, depth, nodes, path, alias, issues), path guard,
  no symlink escape, no code execution; no stacks/env/raw errors/foreign paths exposed.

## 10. No new dependencies

`JSON.stringify` + existing analysis. No libraries added.
