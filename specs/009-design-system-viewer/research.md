# Research — Design System Viewer (Phase 0)

Decisions that ground the plan. Each: Decision · Rationale · Alternatives rejected. No code here.

## D1 — Rendering technology: thin local HTTP server + pre-built static SPA

**Decision**: The Viewer runs as (a) a thin local HTTP adapter, built on `node:http` only (no web
framework), that (a1) serves a **pre-built, static** UI bundle shipped inside the package, and (a2)
exposes a small read-only JSON API backed 1:1 by the viewer application layer's `ViewerXxxV1` projections;
and (b) a UI bundle that is **built once by the maintainers at package-build time** (part of `npm run
build`), not regenerated per user invocation. The user runs a future `neuraz-ds view` command; it starts
the local server (default `127.0.0.1`, ephemeral or fixed local port), opens/points the browser at it, and
the browser talks only to `localhost` over HTTP — never to `design-system/**` directly and never to the
network.

**Rationale**:
- Guardrail 2 (`Core → browser` forbidden) and guardrail 4 (UI is a client, not the authority) are
  satisfied structurally: the browser never imports Core code; it only fetches JSON from a local adapter
  that itself calls the viewer application layer.
- A **static-export-per-invocation** approach (regenerating an HTML/data bundle on every `neuraz-ds view`)
  would require **writing files** to render anything, directly violating the read-only/zero-writes
  invariant (spec FR-004). Shipping the UI bundle pre-built (like `dist/` today) avoids that: the only
  "build" that ever writes files is the maintainers' `npm run build`, identical in nature to how
  `dist/cli/index.js` is already built and shipped — not a new category of write.
  Serving the same pre-built bundle from an in-memory HTTP server (rather than `file://`) also avoids
  browser same-origin/`fetch` restrictions against `file://` URLs, which would otherwise block the JSON API
  calls entirely.
- A thin server keeps large-dataset search/filter/navigation responsive (FR-016/FR-018) without needing a
  full page reload or a second read per interaction — the server holds the one session load in memory and
  answers JSON queries against it.
- Fully offline (FR-021/SC-010): no CDN, no remote font/script, everything served from `localhost`.

**Alternatives rejected**:
- *Fully static export written to disk per run*: violates the zero-writes invariant (FR-004); rejected.
- *Embed the viewer directly as a Node-rendered TUI (no browser)*: cannot deliver swatches/visual
  typography previews/accessible rich contrast UI as well as a real browser rendering surface; rejected for
  this feature's visual requirements (though nothing here blocks a future companion TUI).
- *Full framework-based dev server (e.g. a bundler's live dev server) as the shipped runtime*: adds a
  runtime dependency footprint and moving parts to the installed CLI package that a maintainers-only build
  step doesn't need; rejected for v1 as the **shipped** runtime (the maintainers' build tooling may still
  use one, see D2).
- *Future Studio embedding as the only delivery*: the Studio (full product) does not exist yet
  (`docs/product/capability-map.md`: `planned`); this feature must be usable standalone today and simply
  be embeddable later — a thin local server is the natural thing Studio would also embed/iframe, so this
  choice does not foreclose that future.

## D2 — No new runtime dependency on the core package; UI stays vanilla TS/DOM

**Decision**: `package.json`'s `dependencies` gain **zero** new entries for the Viewer. The pre-built UI
bundle is written in TypeScript against the DOM (no React/Vue/Svelte runtime shipped to the browser). If a
bundler is needed to produce the static bundle (e.g. esbuild), it is added as a **devDependency**, used
only by the maintainers' build script, and produces static assets committed to `dist/viewer/**` at publish
time — it is never installed or invoked by an end user's `npm install`.

**Rationale**: Matches this repo's own established pattern across `004`–`008` ("sin nuevas dependencias")
and the constitution's independence-from-framework principle (V) — extended here to mean the Core's own
*packaging* doesn't gain a UI framework runtime dependency either, not just the domain/application code.
Keeps the installed package small and avoids forcing a framework choice on Studio's own future UI
direction (per `docs/product/vision.md` §4, the Studio's editor/importers are separate future efforts that
may make their own technology choices).

**Alternatives rejected**: Adding React/Preact as a runtime dependency now (forces a framework choice
before Studio's broader UI direction is settled; adds installed weight to every CLI user, most of whom
never run `view`); a heavier meta-framework (Next.js/Remix) — massively out of proportion for a read-only
local viewer and would pull in a server runtime of its own, duplicating D1's thin server.

## D3 — Core boundary: `src/application/viewer/**` depends only on existing ports

**Decision**: The viewer application layer depends only on the application ports/domain types already
public from `002`–`008` (`AnalyzeUseCase`, `InspectFoundations`, `ListPresets`, build snapshot/status
reads, `AssetListResult`/`AssetInspectResult`, `008`'s `AnalyzedTokenSource`/plan shapes for the alias
impact preview). It introduces **new** projection types (`ViewerXxxV1`) but **zero** new analysis engines,
parsers, or filesystem ports. The HTTP adapter (D1) and the UI bundle are the only places that may know
about `node:http`/DOM.

**Rationale**: Direct enforcement of guardrail 3 (CLI/MCP/Studio reuse the same use cases) and guardrail 5
(filesystem behind ports) — the Viewer adds a *fourth* adapter (alongside CLI, and future MCP/Studio) over
the same use cases, not a parallel stack.

**Alternatives rejected**: A viewer-specific re-read of `design-system/tokens/base.tokens.json` for
convenience (would duplicate `002`'s parser/validator — forbidden by FR-002 and guardrail 3); a viewer-only
database/cache written to disk (violates FR-004 and constitution II).

## D4 — Single session load and view-level caching

**Decision**: A "viewer session" is built by calling each reused use case **exactly once**: `analyze`
(`002`), `inspectFoundations` (`004`, which itself already embeds one foundations metadata pass over the
same analysis — no second traversal), `listPresets`/`inspectPreset` as needed (`005`), a build-status read
reusing `006`'s existing manifest/source-hash comparison, `listAssets`/`inspectAsset` (`007`), and, only
when the user opens the Aliases view's impact preview, a read-only plan/diff computation (`008`) — itself
one call. The session result is held in memory by the HTTP adapter (D1) for the process's lifetime (or
until an explicit refresh); every view/search/filter reads that in-memory result only.

**Rationale**: Directly satisfies FR-003/FR-016/SC-002/SC-006. Because `002`'s `DesignSystemAnalysis` is
itself already the single shared analysis `004`/`006`/`008` build on, reusing `006`'s existing
`SourceSnapshotReader`/`AnalyzedSourceSnapshot` (which already bundles `analysis` +
`resolvedTokenView` + `foundationProjection` from one read) as the Viewer's own snapshot avoids even a
second call to `inspectFoundations` for the common case — the Viewer may consume the embedded
`foundationProjection` directly. Where a use case is genuinely independent (assets, presets, build
manifest), calling it once per session is still "single load" per FR-003's actual wording (at most one
invocation of *each* reused use case).

**Alternatives rejected**: Re-deriving the analysis on every view navigation (violates FR-003/SC-002);
building a bespoke merged analyzer across all seven features (duplicates `006`'s already-proven
single-source-snapshot construct; unnecessary new code).

## D5 — UI outcome vocabulary: project, never invent

**Decision**: The Viewer's session/view state is the closed set `loading | ready | empty |
invalid-design-system | not-found | read-error | partial`, derived by a pure mapping (see
[data-model.md](data-model.md)) from `002`'s `AnalysisOutcome` (`valid → ready`, `complete-invalid →
invalid-design-system`, `partial → partial`, `not-found → not-found`, `read-error → read-error`), with
`empty` computed only from an already-`ready`/`valid` session whose counts (`statistics.total === 0` and
no assets/presets) are all zero, and `loading` existing only before the session promise resolves (a pure
UI/adapter concept, never a value stored in any reused use case's result).

**Rationale**: Matches spec FR-007/SC-005 literally: no fabricated domain outcome; `empty` is a UI-level
judgment over already-returned counts, not a new Core concept, exactly like how `004`'s
`FoundationCategoryState` "absent" is a similar derived-not-fabricated judgment over counts.

**Alternatives rejected**: A single flat `error` state (loses the useful distinction the Core already
computes between `not-found`/`read-error`/`invalid-design-system`/`partial`); inventing a `partial-data`
outcome not backed by any reused use case (explicitly forbidden by the task brief and FR-007).

## D6 — Contrast policy is specified now; computation is deferred

**Decision**: The WCAG 2.1 AA contrast policy (formula, thresholds, output shape) is fully specified in
[spec.md](spec.md) `Colors & contrast policy`. No `[NEEDS CLARIFICATION]` marker is left. The actual
relative-luminance/ratio **computation function** is a task in Checkpoint D of [tasks.md](tasks.md) — pure
domain/application code with no new dependency (WCAG's formula is closed-form arithmetic over sRGB
components already available from `002`'s resolved color values; no color-math library is required).

**Rationale**: The task brief explicitly requires the policy to be unambiguous now while allowing the
computation to be a future task; a closed-form WCAG formula needs no new dependency, keeping D2 intact.

**Alternatives rejected**: Deferring the policy itself to implementation (would leave a
`[NEEDS CLARIFICATION]`, forbidden by the consistency requirement); adopting a third-party contrast library
now (an unnecessary new dependency for a well-defined, small, closed-form formula).

## D7 — Aliases "potential impact" preview reuses `008`'s read-only shapes, never `apply`

**Decision**: The Aliases view's optional rename/move impact preview (FR-015) is computed by invoking
`008`'s existing **read-only** `planTokenMutation`-shaped computation with a synthetic, in-memory-only
`rename-token`/`move-token` command built from the user's hypothetical input, discarding the resulting
`TokenMutationPlanV1`/diff after rendering it — `applyTokenMutation` is never called, and the synthetic
command/plan is never persisted, cached to disk, or written anywhere (per FR-004/the Assumptions in
spec.md).

**Rationale**: Reuses `008`'s already-proven, already-tested reference-rewrite/diff logic instead of
re-implementing "what would this rename affect" in the Viewer — a second implementation of alias-impact
reasoning would violate guardrail 3 and risk drifting from `008`'s actual behavior.

**Alternatives rejected**: A viewer-only "dependents of X" walk reimplemented from scratch (duplicates
`008`'s/`002`'s alias graph traversal; the dependents-only case is already covered more simply by `008`'s
`AnalyzedTokenSource.dependentsOf`, which the Viewer uses directly for the simpler "list dependents" part
of FR-015, reserving the full plan/diff reuse for the richer "what would change" preview).

## D8 — Contracts versioning and JSON envelope for MCP/agent consumers

**Decision**: Every `ViewerXxxV1` contract is versioned `1.0.0`, following `003`/`006`/`007`/`008`'s
convention. A `ViewerJsonEnvelopeV1` (analogous to `BuildJsonEnvelopeV1`/`TokenMutationJsonEnvelopeV1`) is
defined for the HTTP JSON API/agent consumers, independent of `003`'s envelope (never extending a closed
contract).

**Rationale**: Consistency for MCP-style/agent consumers (User Story 13) without touching any closed JSON
contract; matches the pattern `008`'s D9 already established for exactly this situation.

**Alternatives rejected**: Reusing/extending `003`'s envelope (would change a closed contract); an
unversioned ad-hoc JSON shape (breaks agent consumers on any future change).

## D9 — No CLI command implemented in this phase

**Decision**: This feature documents (in `plan.md`/`tasks.md`) a future `neuraz-ds view` command as the
adapter that starts the local server, but implements **no code** in this specification phase, per the task
brief (documentation-only). The CLI command remains a thin adapter over the viewer application layer,
exactly like every other command (`002`–`008`).

**Rationale**: Matches the documentation-only scope of this task and the repository's own convention of
documenting the future CLI surface in `spec.md`/`plan.md` without wiring it during the specify phase.

**Alternatives rejected**: Speculatively wiring `src/cli/commands/view.ts` now (out of scope for this task
and would violate "do not write production code" instruction).
