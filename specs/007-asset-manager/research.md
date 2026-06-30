# Research — Asset Manager (Phase 0)

Decisions that ground the plan. Each: Decision · Rationale · Alternatives rejected. No code here.

## D1 — Asset store layout and ownership manifest

**Decision**: Store managed asset files under `design-system/assets/<kind>/…` and maintain
`design-system/assets/assets.json` (`AssetManifestV1`) as the single ownership authority. Assets are
addressed by **logical relative paths** under the asset store.

**Rationale**: Mirrors the proven manifest-as-authority model of `006` build, keeps assets versioned in
the repo, and keeps them physically and logically separate from `design-system/tokens/**`.

**Alternatives rejected**: Embedding asset references in token files (violates token/asset separation,
guardrail 6); a global registry in `design-system.json` (couples host identity to assets, harder to
keep deterministic).

## D2 — Strict token/asset separation

**Decision**: The Asset Manager never reads, parses, analyzes or writes tokens, the host manifest, or
build artifacts. No shared mutable model with `002`/`004`/`006`.

**Rationale**: Guardrail 6 and FR-033; keeps `001`–`006` byte-stable and avoids cross-surface coupling.

**Alternatives rejected**: A unified "design-system resources" analyzer spanning tokens + assets
(over-couples two independent surfaces, risks regressions in closed features).

## D3 — Content-based MIME detection

**Decision**: Determine MIME from file content/signature (magic bytes), using the extension only as a
secondary hint. Supported families v1: fonts (`woff2`/`woff`/`ttf`/`otf`), raster
(`png`/`jpeg`/`webp`/`gif`/`avif`), vector (`svg`).

**Rationale**: Extensions are unreliable and a security risk; signature checks prevent mislabeled files
(FR-011, FR-019).

**Alternatives rejected**: Extension-only detection (spoofable); a third-party MIME library (new
dependency, unnecessary for a closed family).

## D4 — Header-only dimension extraction

**Decision**: Parse pixel dimensions from image headers (PNG IHDR, JPEG SOF markers, GIF logical screen,
WebP VP8/VP8L/VP8X, AVIF/ISO-BMFF `ispe`) and SVG `width`/`height`/`viewBox`. Report `null` when
undeterminable. No rendering, no native tools.

**Rationale**: Deterministic, dependency-free, offline; satisfies FR-013 without guessing.

**Alternatives rejected**: Image decoding libraries or headless browsers (heavy, non-deterministic,
out-of-scope image processing); guessing SVG sizes (forbidden — must be `null`).

## D5 — SVG sanitization by allowlist

**Decision**: Sanitize SVG with a conservative allowlist of elements/attributes; strip `<script>`,
event handlers (`on*`), external references (`href`/`xlink:href` to non-data URLs), `<foreignObject>`,
external entities/DOCTYPE, and any active content. If the result is not safe, well-formed SVG, the
candidate is `blocked`. Sanitization happens at `plan` (preview) and the sanitized bytes are what
`apply` writes.

**Rationale**: Guardrail 15 and FR-020; SVG is active content and must be neutralized before storage.

**Alternatives rejected**: Storing raw SVG and sanitizing on render (the store would hold unsafe bytes);
a denylist approach (fragile against novel vectors); a third-party sanitizer dependency (avoided for v1;
revisit only if the in-house allowlist proves insufficient).

## D6 — Font validation by signature/structure

**Decision**: Validate fonts by magic signatures and minimal structural checks: `wOF2` (woff2), `wOFF`
(woff), `0x00010000`/`true`/`OTTO` (ttf/otf sfnt). No conversion, no subsetting.

**Rationale**: FR-019; ensures only recognizable fonts enter the store; conversion is explicitly out of
scope.

**Alternatives rejected**: A font-parsing/conversion library (new dependency + out-of-scope conversion);
trusting the extension (spoofable).

## D7 — Deduplication by content hash

**Decision**: Compute SHA-256 (lowercase hex) over exact bytes; a source whose hash already exists in the
manifest is a `duplicate` referencing the existing asset and is not stored again.

**Rationale**: FR-009/FR-010; prevents store bloat and divergence; same hashing primitive as `006`.

**Alternatives rejected**: Name-based dedup (misses identical content under different names); fuzzy/visual
dedup (requires image analysis, out of scope).

## D8 — Transactional asset-set publication

**Decision**: `apply` and `remove` publish as a set via a staging→verify→backup→swap strategy analogous
to `006`'s artifact-set writer: write candidate files + updated manifest to a sibling staging area,
verify, move prior state to backup, swap staging in, then post-verify. Commit point after the swap;
explicit recovery state (`outputAvailable`/`backupRelativePath`/`recoveryRequired`) on failure; no
automatic destructive rollback after the commit point.

**Rationale**: FR-022/FR-035; all-or-nothing safety with recovery, reusing a proven pattern.

**Alternatives rejected**: File-by-file live writes (partial publication risk); a generic temp-then-move
of a single file only (insufficient when a write touches both an asset file and the manifest as a set).

## D9 — Explicit license model (never assumed)

**Decision**: `AssetLicense` is only populated from explicitly supplied metadata at import time. A
candidate without license metadata is flagged as requiring an explicit license; the manifest never
records a guessed license.

**Rationale**: Guardrail 14 and FR-018; legal correctness for fonts/brand assets.

**Alternatives rejected**: Defaulting to a permissive license (legally unsafe); inferring license from
file metadata (unreliable, effectively assuming).

## D10 — Provenance limited to local-import

**Decision**: Provenance is recorded as `local-import` with a safe, relative reference to the source the
user provided. No network/Figma/URL provenance exists in v1.

**Rationale**: FR-015 and scope; acquisition from external sources is out of scope.

**Alternatives rejected**: Rich provenance graph with remote origins (out of scope; would imply
importers that are explicitly excluded).

## D11 — Ownership & unknown-content handling

**Decision**: Only manifest-declared assets are managed. Unknown files under the asset store are
preserved; an unknown file colliding with a candidate destination blocks `apply` with a conflict; a
corrupt/untrusted manifest blocks operations (never "no assets"). Symlinks are never followed.

**Rationale**: FR-016/FR-017/FR-027/FR-034; mirrors the ownership safety of `006`.

**Alternatives rejected**: Treating any file under the store as managed (would delete/overwrite user
content); ignoring a corrupt manifest as empty (would mask data loss).

## D12 — Shared outcomes and exit codes; independent JSON envelope

**Decision**: Reuse the common outcome vocabulary and exit-code table of `001`–`006`
(success/`unchanged`/`invalid`/`conflict`/`unsupported`/`not-found`/`read-error`/`write-error`/
`verification-error`; `internal-error` adapter-only). Provide a **separate** `AssetJsonEnvelopeV1`
(`formatVersion: "1.0.0"`) rather than extending `003`'s envelope.

**Rationale**: FR-025/FR-029; consistency for consumers without changing closed JSON contracts
(byte-stability of `003`/`004`/`006`).

**Alternatives rejected**: Extending `JsonEnvelopeV1` of `003` (would alter a closed public contract);
inventing a new exit-code table (breaks consumer expectations).

## D13 — Limits and safety bounds

**Decision**: Enforce explicit per-file byte limits, total-store byte/count limits, and safe logical
path rules (no traversal/absolute/unsafe separators), surfacing blocked candidates with stable reasons.

**Rationale**: FR-028/FR-030; bounded, predictable, safe operations.

**Alternatives rejected**: Unbounded imports (DoS/store bloat); silently truncating (hides problems).

## D14 — Headless-first, adapters later

**Decision**: Deliver the headless use cases + contracts now; a thin CLI `asset` surface may be wired as
the last checkpoint. MCP and Studio are future adapters that reuse the same use cases.

**Rationale**: Guardrail 3; one source of behavior across interfaces.

**Alternatives rejected**: Building UI/MCP now (out of scope; would duplicate logic before the core is
proven).
