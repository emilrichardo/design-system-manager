# Feature Specification: Asset Manager for the local Design System

**Feature Branch**: `007-asset-manager`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Add a local, manual **Asset Manager** to the Design System: manage fonts, logos, SVG, icons
and images that live alongside the DTCG tokens but are kept strictly separate from them. The feature
provides headless listing/inspection, an import `plan`/`apply` flow (candidates are previewed and only
written on explicit apply), content hashing and deduplication, MIME type/size/dimensions/metadata,
provenance, ownership, license capture (never assumed), font validation, SVG sanitization, and safe
removal — all behind transactional, all-or-nothing writes and stable headless contracts intended for
later reuse from CLI, MCP and Studio. No Figma, web scraping, AI image analysis, preset inference,
visual editor, CDN, cloud storage, font conversion, image optimization or SVG editing. Closed features
`001`–`006` and their contracts remain byte-stable; tokens and assets never mix.

---

## Concepts & Definitions *(mandatory context)*

This feature introduces a second managed surface — **assets** — that coexists with, but is never
confused with, the DTCG **tokens**. The Asset Manager is local-first, Git-first and headless-first; it
follows the product architecture guardrails in [`docs/product/architecture-guardrails.md`](../../docs/product/architecture-guardrails.md).

| Concept | Defines | Owns | In scope here? |
|---|---|---|---|
| **Tokens (DTCG)** | `design-system/tokens/base.tokens.json` (single source of truth for tokens). | Token values & structure. | **Out of scope** — never read or written by assets. |
| **Asset store** | `design-system/assets/` directory holding asset files by kind. | The managed asset files on disk. | **Yes — this feature.** |
| **Asset manifest** | `design-system/assets/assets.json` (`AssetManifestV1`). | Ownership, logical paths, hashes, MIME, size, dimensions, metadata, provenance and license of each managed asset. | **Produced/maintained by this feature.** |
| **Asset** | A managed binary/text file (font, logo, SVG, icon, image) referenced by a logical relative path. | A single downstream resource. | **Yes — managed, never a token.** |
| **Import candidate** | A proposed asset produced by `import plan` from a local source file; not yet written. | A reviewable proposal (sanitized/validated/deduplicated). | **Yes — never written until `apply`.** |
| **Unknown content** | Any file under `design-system/assets/` not declared by the asset manifest. | Not managed. | Preserved or blocks; never silently deleted. |

**Product problem solved**: a Design System needs brand and UI resources (fonts, logos, SVG, icons,
images) versioned next to the tokens, with trustworthy metadata (hashes, sizes, dimensions, license,
provenance) and safe, auditable operations. Doing this by hand drifts, loses license/provenance, risks
unsafe SVG, and duplicates files. The Asset Manager makes these operations explicit, deterministic and
safe, while keeping tokens and assets cleanly separated.

### Separation invariant

Tokens and assets are independent managed surfaces. The Asset Manager MUST NOT read, parse, analyze or
write `design-system/tokens/**`, the host manifest `design-system/design-system.json`, or any build
artifact under `design-system/build/**`. Conversely, no token/build operation depends on assets.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List managed assets (Priority: P1)

A developer or agent wants to see every asset the Design System manages, grouped by kind, with logical
paths and key metadata, without modifying anything.

**Why this priority**: Listing is the read-only entry point for every other operation and the minimum
viable surface for CLI/MCP/Studio consumers.

**Independent Test**: On a project with a populated asset manifest, listing returns each managed asset
with kind, logical path, MIME, size and hash; no file is read for content beyond what is needed and
nothing is written.

**Acceptance Scenarios**:

1. **Given** an initialized project with managed assets, **When** the assets are listed, **Then** every
   asset appears once with kind, logical relative path, MIME type, byte size and content hash, in a
   deterministic order.
2. **Given** a project with no asset manifest, **When** the assets are listed, **Then** the result is an
   empty, valid listing (no error, exit success) and nothing is written.

---

### User Story 2 - Inspect a single asset (Priority: P1)

A user wants full, safe metadata for one asset: kind, MIME, size, dimensions (when applicable), content
hash, provenance, license and ownership state.

**Why this priority**: Inspection is required to audit license/provenance and to drive Studio/CLI detail
views; it is the per-asset complement to listing.

**Independent Test**: Inspecting an existing managed asset returns its full safe metadata; inspecting an
absent asset returns a `not-found` outcome; neither writes anything.

**Acceptance Scenarios**:

1. **Given** a managed image asset, **When** it is inspected, **Then** the result includes its
   dimensions (width/height), MIME, size, hash, provenance, license and ownership state.
2. **Given** a logical path that is not in the manifest, **When** it is inspected, **Then** the outcome
   is `not-found` with a safe message and no absolute paths.

---

### User Story 3 - Preview an import (plan) (Priority: P1)

A user points the Asset Manager at one or more local source files and gets a **plan**: for each source,
the resolved kind, logical destination path, MIME, size, dimensions, content hash, deduplication
verdict, license requirement, validation result and (for SVG) a sanitization preview — **without writing
anything**.

**Why this priority**: `plan` is the safety gate: nothing enters the store without an explicit,
reviewable preview, per the candidate-review guardrail.

**Independent Test**: Planning an import of a known local file yields a candidate with correct
MIME/size/hash/dimensions and a clear add/duplicate/blocked verdict; the asset store and manifest are
byte-identical before and after.

**Acceptance Scenarios**:

1. **Given** a valid local PNG, **When** an import is planned, **Then** the candidate reports kind
   `image`, a logical destination path, MIME `image/png`, size, dimensions and a content hash, with
   verdict `add`.
2. **Given** a source whose content hash already exists in the manifest, **When** an import is planned,
   **Then** the candidate verdict is `duplicate` and references the existing managed asset.
3. **Given** a source with an unsupported MIME type, **When** an import is planned, **Then** the
   candidate verdict is `blocked` with a stable reason and nothing is written.

---

### User Story 4 - Apply an import transactionally (Priority: P1)

After reviewing a plan, the user applies it. Approved candidates are written to the asset store and the
asset manifest is updated **atomically** (all-or-nothing); duplicates and blocked candidates are not
written.

**Why this priority**: This is the only write path for adding assets and must be transactional and safe.

**Independent Test**: Applying a plan with one valid candidate writes exactly that file plus the updated
manifest as a set; a forced mid-write failure leaves either the complete prior state or the complete new
state, never a partial mix.

**Acceptance Scenarios**:

1. **Given** a reviewed plan with one `add` candidate, **When** it is applied, **Then** the asset file
   and the updated manifest are published as one set and the outcome is success with `wrote:true`.
2. **Given** an unchanged re-apply of an already-imported asset, **When** it is applied, **Then** the
   outcome is `unchanged` with `wrote:false` and no rewrite occurs.
3. **Given** a plan containing a `blocked` candidate, **When** it is applied, **Then** the blocked
   candidate is not written and the operation reports a conflict for it without partial publication.

---

### User Story 5 - Sanitize SVG before incorporation (Priority: P1)

When an SVG (as `svg` or `icon`) is imported, it is sanitized before it can be written: scripts, event
handlers, external references and other active content are removed.

**Why this priority**: Unsanitized SVG is an active-content risk; the guardrail requires sanitization
before any SVG enters the store.

**Independent Test**: Planning the import of an SVG containing a `<script>` and an `onload` handler
yields a sanitized preview with those removed; applying writes only the sanitized bytes; the original
malicious bytes never reach the store.

**Acceptance Scenarios**:

1. **Given** an SVG with `<script>`, `onload` and an external `href`, **When** it is planned, **Then**
   the sanitization preview removes them and reports what was stripped.
2. **Given** an SVG that cannot be safely sanitized into well-formed SVG, **When** it is planned,
   **Then** the candidate verdict is `blocked` with a stable reason.

---

### User Story 6 - Remove an owned asset safely (Priority: P1)

A user removes a managed asset. Only assets declared in the manifest are removable; the file and its
manifest entry are removed transactionally; unknown content is never touched.

**Why this priority**: Deletion is destructive and must be ownership-bound and transactional.

**Independent Test**: Removing a managed asset deletes its file and manifest entry as a set; attempting
to remove a path not owned by the manifest is refused without touching the filesystem.

**Acceptance Scenarios**:

1. **Given** a managed asset, **When** it is removed, **Then** the file and its manifest entry are gone
   and the manifest remains valid, published as one set.
2. **Given** a path present on disk but not in the manifest, **When** removal is requested, **Then** the
   operation refuses with a `conflict`/`not-found` outcome and writes nothing.

---

### User Story 7 - Deduplicate by content hash (Priority: P2)

Identical content (same SHA-256) is detected so the same bytes are not stored twice.

**Why this priority**: Prevents store bloat and accidental divergence; foundational for trustworthy
listing.

**Independent Test**: Planning two sources with identical bytes yields one `add` and one `duplicate`
referencing the first.

**Acceptance Scenarios**:

1. **Given** an asset already managed, **When** an identical file is planned, **Then** the verdict is
   `duplicate` and no second copy is proposed.

---

### User Story 8 - Validate fonts on import (Priority: P2)

Font sources are validated by signature/structure (not converted) so only recognizable font files are
accepted.

**Why this priority**: Prevents corrupt or mislabeled fonts from entering the store; conversion is out
of scope.

**Independent Test**: Planning a valid `woff2` succeeds with kind `font`; planning a file with a `.woff2`
name but invalid signature is `blocked`.

**Acceptance Scenarios**:

1. **Given** a valid `woff2`/`woff`/`ttf`/`otf`, **When** planned, **Then** kind is `font` and validation
   passes.
2. **Given** a font-named file with an invalid signature, **When** planned, **Then** the verdict is
   `blocked` with a stable reason.

---

### User Story 9 - Capture and enforce license (never assumed) (Priority: P2)

Every imported asset must carry license information; the system never assumes a license. A candidate
without license information is surfaced and cannot be silently applied as licensed.

**Why this priority**: Fonts and brand assets carry legal constraints; the guardrail forbids assuming
licenses.

**Independent Test**: Planning an import without supplied license metadata reports a missing-license
requirement; the manifest never records an assumed license.

**Acceptance Scenarios**:

1. **Given** an import without license metadata, **When** planned, **Then** the candidate is flagged as
   requiring an explicit license and is not eligible for a "licensed" record.
2. **Given** an import with explicit license metadata, **When** applied, **Then** the manifest records
   exactly that license, never a guessed one.

---

### User Story 10 - Record provenance (Priority: P2)

Each managed asset records where it came from (a local import source and the import operation), so its
origin is auditable.

**Why this priority**: Auditability and reproducibility of the asset store.

**Independent Test**: After applying an import, the manifest entry records a provenance of kind
`local-import` with the logical source reference; no network or external provenance is invented.

**Acceptance Scenarios**:

1. **Given** an applied local import, **When** the asset is inspected, **Then** provenance is
   `local-import` with a safe, relative source reference.

---

### User Story 11 - Ownership & unknown-content preservation (Priority: P2)

The Asset Manager only manages assets declared in the manifest; unknown files under the asset store are
preserved (never deleted) and block operations that would collide with them.

**Why this priority**: Safety and trust; mirrors the ownership model proven in build/export.

**Independent Test**: An unknown file occupying a candidate's destination path blocks apply with a
conflict; the unknown file is left intact.

**Acceptance Scenarios**:

1. **Given** an unknown file at a candidate's destination, **When** apply runs, **Then** it blocks with
   `conflict` and the unknown file is unchanged.
2. **Given** an untrusted or corrupt asset manifest, **When** any operation runs, **Then** it blocks
   with a conflict and is not treated as "no assets".

---

### User Story 12 - Machine-readable JSON output (Priority: P2)

Every read and planning operation can emit a stable JSON envelope for CI, agents and Studio.

**Why this priority**: Headless consumers (MCP/Studio) need stable, parseable output.

**Independent Test**: The JSON form of list/inspect/plan parses, contains a `formatVersion`, logical
relative paths, hashes and no absolute paths/stack traces.

**Acceptance Scenarios**:

1. **Given** any read/plan operation, **When** JSON output is requested, **Then** stdout is exactly one
   envelope with `formatVersion: "1.0.0"` and only safe, logical fields.

---

### User Story 13 - Extract dimensions (Priority: P3)

For raster images and SVG, the manager extracts pixel/viewBox dimensions from the file structure (no
rendering, no external tools).

**Why this priority**: Dimensions are useful metadata for listing/inspection and Studio previews.

**Independent Test**: Planning a PNG/JPEG/WebP/GIF reports correct width/height parsed from headers; an
SVG reports its declared/viewBox dimensions or `null` when undeterminable.

**Acceptance Scenarios**:

1. **Given** a raster image, **When** planned, **Then** width/height are reported from the file header.
2. **Given** an SVG without explicit size, **When** planned, **Then** dimensions are `null` (not guessed).

---

### User Story 14 - Headless contracts reusable by CLI, MCP and Studio (Priority: P3)

The Asset Manager exposes its operations as headless use cases with stable contracts, so a future CLI,
MCP server and Studio reuse the same logic without duplicating it.

**Why this priority**: The product depends on a single source of truth for behavior across interfaces.

**Independent Test**: The use cases and contracts depend on no Commander/React/browser/network/IA and
expose results as plain data with logical paths, suitable for any adapter.

**Acceptance Scenarios**:

1. **Given** the asset use cases, **When** invoked from any adapter, **Then** they return the same
   structured results with logical paths and outcomes, without UI/CLI/IA coupling.

---

### Edge Cases

- A source file does not exist or is unreadable → `read-error`, nothing written.
- A symlink (source, destination, or under the asset store) → never followed; blocked as unsafe.
- A source exceeds the byte/size limits → `blocked` candidate with a stable reason.
- A destination logical path is unsafe (traversal, absolute, separators not allowed by policy) → blocked.
- The asset manifest is missing → treated as "no managed assets" (valid empty state), not an error.
- The asset manifest is present but corrupt/untrusted → blocks with conflict (never "no assets").
- An apply is interrupted mid-write → the store is left in the complete prior or complete new state.
- A post-publication verification mismatch → `verification-error` with retained recovery state.
- A removal targets the last asset → manifest becomes a valid empty manifest.
- Non-ASCII / spaces in logical names → handled via safe logical path rules; never leak absolute paths.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST manage assets of exactly these kinds: `font`, `logo`, `svg`, `icon`,
  `image`.
- **FR-002**: The system MUST store managed asset files under `design-system/assets/` and MUST NOT read
  or write `design-system/tokens/**`, `design-system/design-system.json` or `design-system/build/**`.
- **FR-003**: The system MUST maintain an asset manifest at `design-system/assets/assets.json`
  (`AssetManifestV1`) as the ownership authority for managed assets.
- **FR-004**: The system MUST list all managed assets with kind, logical relative path, MIME type, byte
  size and content hash, in a deterministic order.
- **FR-005**: The system MUST inspect a single asset by logical path, returning kind, MIME, size,
  dimensions, content hash, provenance, license and ownership state.
- **FR-006**: The system MUST provide an import `plan` operation that previews candidates **without
  writing anything**.
- **FR-007**: For each planned candidate, the system MUST resolve kind, a logical destination path, MIME
  type, byte size, content hash, dimensions (when applicable), a deduplication verdict, license
  requirement, validation result and (for SVG) a sanitization preview.
- **FR-008**: The system MUST provide an import `apply` operation that writes only approved `add`
  candidates and updates the manifest atomically (all-or-nothing).
- **FR-009**: The system MUST compute content hashes as SHA-256 over exact file bytes, lowercase hex.
- **FR-010**: The system MUST detect duplicates by content hash and mark identical content as
  `duplicate`, referencing the existing managed asset, without storing a second copy.
- **FR-011**: The system MUST determine the MIME type from file content/signature, not solely from the
  file extension.
- **FR-012**: The system MUST record the exact byte size of each managed asset.
- **FR-013**: The system MUST extract pixel dimensions for supported raster images and viewBox/declared
  dimensions for SVG, reporting `null` when undeterminable (never guessing).
- **FR-014**: The system MUST store per-asset metadata (at least: kind, MIME, size, dimensions, hash,
  provenance, license) in the manifest, separate from token metadata.
- **FR-015**: The system MUST record provenance for each managed asset as a `local-import` with a safe,
  relative source reference; it MUST NOT invent network/external provenance.
- **FR-016**: The system MUST treat the asset manifest as the sole ownership authority and MUST NOT
  manage files it does not declare.
- **FR-017**: The system MUST preserve unknown files under the asset store (never delete them) and MUST
  block operations that would collide with unknown content.
- **FR-018**: The system MUST require explicit license information for each imported asset and MUST NOT
  assume or guess a license.
- **FR-019**: The system MUST validate font sources by signature/structure for `woff2`, `woff`, `ttf`
  and `otf`, blocking unrecognized or mislabeled files; it MUST NOT convert fonts.
- **FR-020**: The system MUST sanitize every SVG before it can be written, removing scripts, event
  handlers, external references and other active content, and MUST block SVG that cannot be safely
  sanitized.
- **FR-021**: The system MUST support safe removal of a managed asset, deleting the file and its
  manifest entry transactionally, and MUST refuse to remove paths not owned by the manifest.
- **FR-022**: All write operations (`apply`, `remove`) MUST be transactional and all-or-nothing, with
  verification, backup and explicit recovery state; partial publication is forbidden.
- **FR-023**: The system MUST expose every operation as a headless use case with no Commander, React,
  browser, network or AI dependency, returning plain structured results.
- **FR-024**: The system MUST expose stable contracts (asset manifest, asset record/probes, import plan,
  SVG sanitization, transactional asset-set writer, outcomes/exit codes, JSON envelope) versioned at
  `1.0.0`, reusable by CLI, MCP and Studio.
- **FR-025**: The system MUST provide a stable JSON envelope (`AssetJsonEnvelopeV1`,
  `formatVersion: "1.0.0"`) for read/plan operations, with logical relative paths only.
- **FR-026**: The system MUST use logical, relative paths in every public result, report and error, and
  MUST NOT expose absolute paths, cwd, hostname, username or stack traces.
- **FR-027**: The system MUST never follow symlinks for sources, destinations, or any node under the
  asset store, and MUST block unsafe symlinks.
- **FR-028**: The system MUST enforce safe destination logical paths (no traversal, no absolute paths)
  contained within the asset store.
- **FR-029**: The system MUST classify outcomes using the success literals
  (`listed`/`inspected`/`planned`/`applied`/`removed`) plus `unchanged`/`invalid-asset-store`/
  `unsupported-asset`/`conflict`/`not-found`/`read-error`/`write-error`/`verification-error`, mapped to
  the shared exit-code table of `001`–`006`, with `internal-error` only at the adapter boundary. The
  literals `partial`/`success`/`blocked` MUST NOT exist as public operation outcomes (`blocked` is only
  an import-candidate verdict).
- **FR-030**: The system MUST enforce byte-size and count limits for sources and the store, blocking
  candidates that exceed them with a stable reason.
- **FR-031**: The system MUST keep `apply` idempotent: re-applying an already-imported, unchanged asset
  yields `unchanged` with `wrote:false` and no rewrite.
- **FR-032**: The system MUST keep the asset manifest deterministic (stable key order, no timestamps,
  cwd, hostname or absolute paths) so identical inputs yield identical bytes.
- **FR-033**: The system MUST keep tokens and assets fully separated: no asset operation reads, parses or
  mutates token/host/build files, and closed features `001`–`006` remain byte-stable.
- **FR-034**: The system MUST treat a missing asset manifest as a valid empty asset set, and a corrupt or
  untrusted manifest as a blocking conflict (never "no assets").
- **FR-035**: The system MUST produce a post-publication verification of written assets and the manifest
  (re-read, re-hash, sizes, presence) and report `verification-error` with retained recovery state on
  mismatch, without automatic destructive rollback after the commit point.
- **FR-036**: The system MUST report a deterministic, ordered list of conflicts/issues for blocked
  candidates and ownership/concurrency problems, with stable codes and logical paths.
- **FR-037**: The system MUST NOT include any feature that is explicitly out of scope (Figma, web
  scraping, AI image analysis, preset inference, visual editor, CDN, cloud storage, font conversion,
  image optimization, SVG editing).

### Key Entities *(include if feature involves data)*

- **AssetKind**: One of `font | logo | svg | icon | image`.
- **AssetRecord**: A managed asset's manifest entry — logical path, kind, MIME, byte size, content hash,
  dimensions (or null), provenance, license, ownership.
- **AssetManifestV1**: The ownership authority — `formatVersion`, an ordered set of `AssetRecord`s, no
  timestamps/absolute paths.
- **AssetDimensions**: `{ width, height }` in pixels (raster) or declared/viewBox units (SVG), or `null`.
- **AssetProvenance**: Origin descriptor — kind `local-import` with a safe relative source reference.
- **AssetLicense**: Explicit license descriptor (identifier and/or notice); never assumed.
- **ImportCandidate**: A planned, not-yet-written asset with resolved metadata, dedup verdict
  (`add | duplicate | blocked`), validation result and (for SVG) sanitization report.
- **ImportPlan**: An ordered, deterministic set of `ImportCandidate`s for one or more sources.
- **SvgSanitizationReport**: What was stripped/kept and whether the SVG is safe to incorporate.
- **AssetInspection / AssetsSummary**: Per-asset detail and aggregate counts (by kind, totals, sizes).
- **AssetOperationResult**: Discriminated result carrying outcome, wrote flag, recovery state, conflicts
  and a safe error, mapped to exit codes by the adapter boundary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can list and inspect every managed asset and obtain its kind, MIME, size, hash,
  dimensions, provenance and license without any write occurring.
- **SC-002**: `import plan` never writes: the asset store and manifest are byte-identical before and
  after planning, in 100% of cases.
- **SC-003**: `import apply` is all-or-nothing: an induced mid-write failure always leaves either the
  complete prior state or the complete new state — never a partial set.
- **SC-004**: Identical content is stored at most once: duplicate sources are detected by hash in 100% of
  cases.
- **SC-005**: No SVG with active content (script/handler/external ref) is ever written; sanitization is
  applied or the candidate is blocked, in 100% of cases.
- **SC-006**: No license is ever assumed: every managed asset's license equals the explicitly supplied
  value, and license-less imports are flagged.
- **SC-007**: Only manifest-owned assets are removable; unknown content is never deleted, in 100% of
  attempts.
- **SC-008**: Tokens and build artifacts are untouched by every asset operation, and `001`–`006` outputs
  remain byte-identical.
- **SC-009**: Re-applying an unchanged import yields `unchanged` and writes nothing, in 100% of cases.
- **SC-010**: All public outputs are deterministic and contain no absolute paths, cwd, hostname or stack
  traces.
- **SC-011**: The JSON envelope for list/inspect/plan parses and carries `formatVersion: "1.0.0"` and
  only logical fields, in 100% of cases.
- **SC-012**: Outcomes map to the shared exit-code table identically to `001`–`006` for the equivalent
  conditions.

## Assumptions

- Assets are introduced **manually** from local files the user already possesses; acquisition from
  external sources (Figma, URLs, scraping) is out of scope.
- The asset store lives at `design-system/assets/` under the initialized host resolved by existing host
  resolution; no new host concept is introduced.
- Supported MIME families v1: fonts (`woff2`, `woff`, `ttf`, `otf`); raster images (`png`, `jpeg`,
  `webp`, `gif`, `avif`); vector (`svg`); icons/logos may be `svg` or supported raster. Anything else is
  blocked.
- Dimension extraction reads file structure/headers only; no rendering, no native/external tools, no new
  runtime dependencies beyond what the repo already uses.
- The transactional write strategy reuses the proven patterns of `005`/`006` (atomic single-file and
  set publication) without importing their token/build code.
- The CLI, MCP server and Studio are **future** adapters; this feature delivers the headless core and
  contracts and (optionally) a thin CLI surface, but not MCP/Studio implementations.
- The common outcome/exit-code vocabulary of `001`–`006` is reused as-is.
