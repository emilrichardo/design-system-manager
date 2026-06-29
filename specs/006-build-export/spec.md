# Feature Specification: Build and export of Design System artifacts

**Feature Branch**: `006-build-export`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Transform the local, validated Design System (`design-system/tokens/base.tokens.json`) into
derived, deterministic, consumable artifacts — CSS Custom Properties, a resolved JSON document, a
TypeScript module, and a build manifest. `build` validates once, generates all formats and writes them
atomically to a fixed managed directory; `export <format>` validates once, generates a single format
and emits it to stdout without writing. The DTCG source remains the single source of truth; artifacts
are strictly downstream and never become an input. No themes, modes, component tokens, plugins, watch,
custom output/selectors/prefixes, viewer, editor, MCP or deployment. Reuses the `002`/`004` analysis
engine; introduces no second parser/alias-graph/type-engine/foundation-analyzer. Closed features
`001`–`005` and their contracts remain byte-stable.

---

## Concepts & Definitions *(mandatory context)*

This feature consumes the closed engine of `002-validate-inspect` and `004-foundations` and the token
content produced (optionally) by `005-presets`. Four concepts are kept strictly separate:

| Concept | Defines | Owns | In scope here? |
|---|---|---|---|
| **Source** | The editable DTCG document `design-system/tokens/base.tokens.json` (the single source of truth, incl. any tokens a preset previously added). | Authoritative token values & structure. | Consumed read-only, never modified. |
| **Build** (`006`) | An operation that validates the source once and writes *all* derived artifacts atomically to `design-system/build/`. | The managed artifact set. | **Yes — this feature.** |
| **Export** (`006`) | An operation that validates the source once and emits *one* derived artifact to stdout, writing nothing. | A single artifact on stdout. | **Yes — this feature.** |
| **Artifact** | A derived, regenerable output (`tokens.css`, `tokens.resolved.json`, `tokens.ts`, `manifest.json`). | Downstream representations. | **Produced, never an input.** |

**Product problem solved**: a project has a valid Design System but applications need it in concrete,
consumable shapes (CSS variables, a resolved JSON, a typed TS module). Doing this by hand is laborious,
drifts from the source, and is non-deterministic. `build`/`export` produce reproducible artifacts from
the single source, safely and without ever editing the source.

**Conceptual relationship (obligatory)**:

```text
foundations (004) → categories, levels, structure, rules
presets     (005) → contribute concrete values into the source
build/export(006) → consume the resulting source → derived artifacts   ← this feature
```

The build is **unidirectional**: `source → artifacts`. Artifacts never feed the next build, never
modify the source, never write foundation/preset metadata, never affect `foundations`.

---

## Decisions (v1) *(material choices, resolved at specification time; 0 NEEDS CLARIFICATION)*

Each decision favors the simplest, most reversible, preservation-by-default, deterministic option and
is consistent with `001`–`005` and the constitution. Revisitable in `/speckit-clarify`.

- **D1 — Two distinct operations.** `build` writes all supported formats to the fixed managed
  directory; `export <format>` emits exactly one format to stdout and writes nothing. `export` is never
  a second write path. Sub-syntax: `neuraz-ds build`, `neuraz-ds build --json`, `neuraz-ds export css`,
  `neuraz-ds export json`, `neuraz-ds export typescript`.
- **D2 — Single input.** The only token input in v1 is `design-system/tokens/base.tokens.json`. Tokens
  a preset previously applied are simply part of that file. No multiple token files, themes, modes,
  component tokens, remote tokens, or presets-as-direct-input.
- **D3 — Engine reuse, single analysis per operation.** `build`/`export` reuse host resolution, safe
  read, JSON parse, DTCG traversal, type resolution, the alias graph (missing/cycle/alias-to-group),
  trust, limits, and the `004` foundation projection. The source is read once, parsed once, analyzed
  once, foundation-projected once, then all formats are rendered from that in-memory model. No second
  parser, alias graph, resolved-type engine, or foundation analyzer is created.
- **D4 — Validity gate, all-or-nothing.** `build`/`export` proceed only when the Design System is
  valid and every required target can represent every token. Any blocking condition produces **zero**
  artifacts (no partial sets, no silently-skipped formats).
- **D5 — `unsupported-value` is its own outcome.** When the DS is valid DTCG but a token's type/value
  cannot be represented in a requested target (e.g. a composite type in CSS v1), the result is
  `unsupported-value` (exit `4`), distinct from `invalid-design-system` (exit `3`). Rationale: the
  source is not invalid; the diagnosis is "valid source, not representable in this target", which
  consumers must distinguish.
- **D6 — Fixed output directory.** Artifacts are written only under `design-system/build/`. No
  `--output`, no custom file names, no directory configuration in v1. `neuraz-ds.config.json`,
  `design-system/design-system.json`, and the `init` byte output are never modified.
- **D7 — CSS: `:root`, kebab variable names, no prefix, collision detection.** The selector is
  `:root`. A token path maps to a custom property by joining segments with `-` after a defined,
  lossless-enough transform; **no** configurable prefix. After transformation, if two distinct token
  paths produce the same variable name, the build stops with a typed `css-name-collision` error (never
  picks one silently).
- **D8 — CSS supported-type policy.** v1 defines an exact admitted set; a token whose effective type is
  not admitted yields `unsupported-value` and blocks the whole build (per D4/D5). JSON and TypeScript
  may serialize any JSON-safe value even when CSS cannot.
- **D9 — CSS keeps alias relations.** Where the source token is an alias to another in-scope token, CSS
  emits `var(--target)` rather than the inlined value, preserving the relation. JSON and TypeScript
  emit the fully resolved value plus `aliasOf` metadata.
- **D10 — Separate, independent contracts.** `tokens.resolved.json` (`ResolvedTokensV1`),
  `manifest.json` (`BuildManifestV1`), and `build --json` (`BuildJsonEnvelopeV1`) are new, independent
  contracts. None reuses, casts, or extends `JsonEnvelopeV1` (003), `FoundationsJsonEnvelopeV1` (004)
  or `PresetsJsonEnvelopeV1` (005). All share the value `formatVersion: "1.0.0"` without sharing types.
- **D11 — Determinism & canonical order.** Identical source bytes + identical manager version produce
  byte-identical CSS, JSON, TS and manifest, and identical hashes. Ordering is: foundation canonical
  category order (`color, spacing, typography, radius, border, shadow, opacity, sizing, motion`), then
  tree path order with parents before descendants; tokens outside any canonical category follow in a
  defined deterministic order after the canonical ones. No timestamp, date, UUID, locale, timezone,
  hostname, OS, cwd, filesystem order, or randomness influences any artifact.
- **D12 — Idempotency by content.** First build → `built`/`wrote:true`. A second build whose rendered
  set is byte-equal to the on-disk managed set → `unchanged`/`wrote:false`, with no temporaries, no
  backup, no rename, no write, and identical bytes/mtimes. The comparison uses bytes/hashes, not mtime.
- **D13 — Safe multi-file publish.** All artifacts are rendered and validated in memory, written to a
  staging location in the same parent, concurrency-checked, then published as a complete set; finally
  the published set is re-verified. The managed set is always either fully updated or unchanged — never
  a mixed/partial set. On post-publish verification failure: `verification-error`/`wrote:true`, a backup
  is retained, and there is no automatic destructive rollback (aligned with `005`).
- **D14 — Managed vs unknown files.** The previous `manifest.json` distinguishes managed artifacts from
  unknown files in `design-system/build/`. The build replaces only artifacts declared by the previous
  manifest plus the artifacts of the current contract; it preserves unknown files, performs no global
  clean (no `--clean` in v1), never deletes unknown files, and blocks (typed conflict) if an unknown
  file occupies a required artifact path. Since v1 always emits the same formats, removal of obsolete
  formats is out of scope but the policy is defined (an old managed artifact no longer in the contract
  may be removed only if the previous manifest declared it).
- **D15 — `export` has no `--json`.** `export json` already yields the JSON artifact, so a `--json`
  flag on `export` would be ambiguous and redundant; it is intentionally absent. `build` has `--json`.
- **D16 — Hashes.** SHA-256, lowercase hexadecimal. `sourceHash` is computed over the exact bytes read
  from `base.tokens.json`. Each artifact `contentHash` is computed over the exact bytes written (build)
  or emitted (export). The manifest does not list itself as an artifact.

---

## User Scenarios & Testing *(mandatory)*

> `build` is the single managed write; `export <format>` and all queries are read-only. Both validate
> via the reused `002`/`004` engine and never introduce a parallel validator. All operations are
> headless-first and CI-safe (no TTY, stdin closed).

### User Story 1 — Build all artifacts (Priority: P1)

A developer with a valid Design System runs `neuraz-ds build` and obtains the complete artifact set in
`design-system/build/`.

**Why this priority**: it is the core deliverable of the feature.

**Independent Test**: run `build` on a valid DS; assert `tokens.css`, `tokens.resolved.json`,
`tokens.ts`, `manifest.json` all exist, are individually valid, and the manifest lists the three
artifacts (not itself).

**Acceptance Scenarios**:

1. **Given** a valid DS with no `design-system/build/`, **When** `build` runs, **Then** the directory
   and the four files are created, outcome is `built`, `wrote:true`, exit `0`.
2. **Given** a valid DS, **When** `build` runs, **Then** the manifest's `sourceHash` matches the exact
   source bytes and each artifact's `contentHash`/`byteLength` matches the written bytes.

---

### User Story 2 — Export CSS to stdout (Priority: P1)

**Why this priority**: read-only consumption (pipes, CI) is a primary use.

**Independent Test**: `neuraz-ds export css` prints `:root { … }` to stdout, writes nothing, exit `0`.

**Acceptance Scenarios**:

1. **Given** a valid DS, **When** `export css` runs, **Then** stdout is the exact CSS artifact, stderr
   is empty, no file or directory is created/modified.

---

### User Story 3 — Export resolved JSON to stdout (Priority: P1)

**Independent Test**: `neuraz-ds export json` prints a parseable `ResolvedTokensV1` document, no write.

**Acceptance Scenarios**:

1. **Given** a valid DS, **When** `export json` runs, **Then** stdout parses as JSON, equals the JSON
   the build would write byte-for-byte, stderr empty, nothing written.

---

### User Story 4 — Export TypeScript to stdout (Priority: P1)

**Independent Test**: `neuraz-ds export typescript` prints a self-contained TS module, no write.

**Acceptance Scenarios**:

1. **Given** a valid DS, **When** `export typescript` runs, **Then** stdout is syntactically valid TS,
   equals the TS the build would write, stderr empty, nothing written.

---

### User Story 5 — CSS preserves alias relations (Priority: P2)

**Independent Test**: a semantic token aliasing a primitive emits `var(--primitive)` in CSS.

**Acceptance Scenarios**:

1. **Given** `color.surface.default` = `{color.gray.100}`, **When** building/exporting CSS, **Then**
   `--color-surface-default: var(--color-gray-100);` appears (relation preserved, not inlined).

---

### User Story 6 — JSON & TypeScript resolve aliases with metadata (Priority: P2)

**Independent Test**: the same alias appears resolved with `aliasOf` set in JSON and TS metadata.

**Acceptance Scenarios**:

1. **Given** an aliased token, **When** exporting JSON/TS, **Then** its `value` is the fully resolved
   effective value and `aliasOf` records the target path.

---

### User Story 7 — Detect a CSS-unsupported type (Priority: P2)

**Independent Test**: a DS containing a token of a CSS-unsupported type yields `unsupported-value`.

**Acceptance Scenarios**:

1. **Given** a valid DS with a CSS-unsupported token type, **When** `build` runs, **Then** outcome is
   `unsupported-value`, exit `4`, zero artifacts written, the offending token path is reported.
2. **Given** the same DS, **When** `export json` runs, **Then** JSON still succeeds (JSON-safe).

---

### User Story 8 — Block partial builds (Priority: P1)

**Independent Test**: any failure of a required target blocks the entire build with zero writes.

**Acceptance Scenarios**:

1. **Given** a condition that prevents rendering any required artifact, **When** `build` runs, **Then**
   no file in `design-system/build/` is created or modified.

---

### User Story 9 — Idempotent build (Priority: P1)

**Independent Test**: re-running `build` on an unchanged source yields `unchanged` with no writes.

**Acceptance Scenarios**:

1. **Given** a build just produced, **When** `build` runs again unchanged, **Then** outcome is
   `unchanged`, `wrote:false`, exit `2`, and all artifact bytes and mtimes are identical.

---

### User Story 10 — Protect unknown files (Priority: P2)

**Independent Test**: an unrelated file in `design-system/build/` survives a build.

**Acceptance Scenarios**:

1. **Given** `design-system/build/notes.txt` unknown to the previous manifest, **When** `build` runs,
   **Then** `notes.txt` is preserved untouched.
2. **Given** an unknown file occupying a required artifact path, **When** `build` runs, **Then** a
   typed conflict blocks the build with zero writes.

---

### User Story 11 — Detect CSS name collisions (Priority: P2)

**Independent Test**: two paths transforming to the same CSS variable name stop the build.

**Acceptance Scenarios**:

1. **Given** `foo.bar-baz` and `foo-bar.baz`, **When** `build`/`export css` runs, **Then** a typed
   `css-name-collision` error is reported and no CSS is emitted (zero writes for build).

---

### User Story 12 — Detect concurrency (Priority: P2)

**Independent Test**: a source/output change between analysis and publish blocks publication.

**Acceptance Scenarios**:

1. **Given** the source bytes change after analysis, **When** the build tries to publish, **Then**
   publication is blocked, `wrote:false`, prior output preserved.

---

### User Story 13 — Recover on verification-error (Priority: P2)

**Independent Test**: a post-publish verification failure retains a backup with no destructive rollback.

**Acceptance Scenarios**:

1. **Given** published artifacts that fail re-verification, **When** the build verifies, **Then**
   outcome is `verification-error`, exit `7`, a backup is retained, and the failure is reported safely.

---

### User Story 14 — Run from an installed package (Priority: P3)

**Independent Test**: the installed binary builds/exports from a project that did not install from source.

**Acceptance Scenarios**:

1. **Given** the package installed from a tarball, **When** `build`/`export` run, **Then** they behave
   identically to the source checkout.

---

### User Story 15 — Run independent of cwd (Priority: P3)

**Independent Test**: build/export resolve the host from the project, not the process cwd.

**Acceptance Scenarios**:

1. **Given** the binary invoked from a different cwd, **When** `build` runs against the project root,
   **Then** artifacts land under that project's `design-system/build/`.

---

### User Story 16 — Human-readable build report (Priority: P3)

**Independent Test**: `neuraz-ds build` prints a deterministic human summary.

**Acceptance Scenarios**:

1. **Given** a valid DS, **When** `build` runs without `--json`, **Then** stdout reports outcome,
   source, logical output directory, formats, files, summarized hashes, `wrote`, and verification.

---

### User Story 17 — Machine-readable build output (Priority: P2)

**Independent Test**: `neuraz-ds build --json` emits exactly one `BuildJsonEnvelopeV1`.

**Acceptance Scenarios**:

1. **Given** a valid DS, **When** `build --json` runs, **Then** stdout is one parseable envelope,
   stderr empty, no absolute paths, no stack, deterministic bytes.

---

### User Story 18 — Headless consumption (Priority: P2)

**Independent Test**: the build/export use cases run without CLI, ANSI, exit codes or stdout coupling.

**Acceptance Scenarios**:

1. **Given** a test harness calling the use case directly, **When** it requests a build, **Then** it
   receives a structured result with artifacts, hashes and outcome, without any terminal dependency.

---

### User Story 19 — Preserve compatibility with 001–005 (Priority: P1)

**Independent Test**: existing commands and JSON contracts are byte-stable after `006` is added.

**Acceptance Scenarios**:

1. **Given** `006` present, **When** `init`/`validate`/`inspect`/`foundations`/`presets` run, **Then**
   their behavior, JSON bytes and exit codes are unchanged.

---

### User Story 20 — Deterministic outputs (Priority: P1)

**Independent Test**: repeated builds of an unchanged source are byte-identical across runs and machines.

**Acceptance Scenarios**:

1. **Given** the same source and manager version, **When** building twice, **Then** every artifact and
   every hash is byte-identical.

---

### Edge Cases

- Project not initialized → `not-found` (5), nothing written.
- Token source absent / manifest absent → blocked before rendering; build creates nothing partial.
- Corrupt JSON / invalid UTF-8 in source → `read-error` (6), nothing written.
- DTCG invalid / token with no resolvable type → `invalid-design-system` (3), nothing written.
- Alias missing / cycle / alias-to-group → `invalid-design-system` (3), nothing written.
- Limits exceeded → blocked deterministically; no partial artifacts.
- Token path collides into one CSS variable → `unsupported-value`/typed `css-name-collision` (4).
- String requiring CSS escaping / string requiring TypeScript escaping → escaped safely, deterministic.
- CSS-unsupported value type → `unsupported-value` (4); JSON/TS still represent it.
- Output dir inexistent → created; output dir present with valid manifest → managed replace.
- Manifest corrupt / unknown version → treated as no trusted prior manifest; unknown-file protection
  applies; required paths occupied by unknown files block with a typed conflict.
- Unknown file occupying `tokens.css` / directory occupying `tokens.ts` → typed conflict, zero writes.
- Output symlink / parent symlink / path escape → rejected (no unsafe symlink follow, path containment).
- Insufficient permissions → `write-error` (6), prior output preserved.
- Concurrent modification of source or managed output → publication blocked, `wrote:false`.
- Staging failure / rename failure → `write-error` (6), prior output preserved, no partial set.
- Verification failure → `verification-error` (7), backup retained, no destructive rollback.
- Second run unchanged → `unchanged` (2), zero writes.
- Different cwd / path with spaces / Unicode path / no TTY / stdin closed → behave identically.

## Requirements *(mandatory)*

### Functional Requirements

#### Inputs & reuse

- **FR-001**: The system MUST treat `design-system/tokens/base.tokens.json` as the only token input
  for build/export in v1.
- **FR-002**: The system MUST treat the artifacts in `design-system/build/` as derived outputs only,
  never as build inputs.
- **FR-003**: The system MUST reuse the `002`/`004` engine (host resolution, safe read, JSON parse,
  DTCG traversal, types, alias graph, trust, limits, foundation projection) and MUST NOT create a
  second parser, alias graph, resolved-type engine, or foundation analyzer.
- **FR-004**: For each operation the system MUST read the source at most once, parse it once, analyze
  DTCG once, and project foundations once, rendering all formats from that single model.

#### Validity gate

- **FR-005**: The system MUST block build/export when the project is not initialized, the manifest or
  token file is missing, the JSON is invalid, the UTF-8 is invalid, or the DTCG is invalid.
- **FR-006**: The system MUST block build/export on alias-missing, alias-cycle, alias-to-group,
  exceeded limits, or any token with no resolvable effective type.
- **FR-007**: The system MUST NOT produce partial artifact sets and MUST NOT silently skip a requested
  format.
- **FR-008**: When the source is valid DTCG but a token cannot be represented in a requested target,
  the system MUST report `unsupported-value` (distinct from `invalid-design-system`) and write nothing.

#### Alias resolution

- **FR-009**: In CSS, where the source token is an alias to another in-scope token, the system MUST
  emit a `var(--target)` reference rather than the inlined value.
- **FR-010**: In resolved JSON and TypeScript, the system MUST emit the fully resolved effective value
  and record the alias origin (`aliasOf`), or `null` when the token is not an alias.
- **FR-011**: The system MUST determine alias relations solely from the reused alias graph and MUST NOT
  re-resolve aliases independently.

#### CSS format

- **FR-012**: CSS output MUST use the `:root` selector and MUST NOT support a configurable prefix.
- **FR-013**: The system MUST map a token path to a custom property by a defined transform (segments
  joined with `-`) and MUST NOT apply case/Unicode folding that could merge two distinct paths silently.
- **FR-014**: The system MUST detect, after transformation, two distinct paths producing the same CSS
  variable name and MUST stop with a typed `css-name-collision` error (zero CSS emitted).
- **FR-015**: The system MUST define the exact set of DTCG effective types admitted in CSS v1 and their
  exact serialization, and MUST return a typed error for any non-admitted type.
- **FR-016**: CSS output MUST be deterministic in order, whitespace, newlines, and encoding (UTF-8, no
  BOM), independent of locale/time/host/cwd.
- **FR-017**: The system MUST escape any CSS value/string content that requires escaping, safely and
  deterministically.
- **FR-018**: CSS variable ordering MUST follow the canonical order in D11.

#### Resolved JSON (`tokens.resolved.json`, `ResolvedTokensV1`)

- **FR-019**: The resolved JSON MUST be a new contract independent of `JsonEnvelopeV1`,
  `FoundationsJsonEnvelopeV1` and `PresetsJsonEnvelopeV1`, with `formatVersion: "1.0.0"`.
- **FR-020**: Each token entry MUST include the token path key and, per token: `type`, resolved
  `value`, `aliasOf` (path or `null`), `category` (canonical id or `null`), `foundationLevel`
  (`primitive`/`semantic`/`unclassified`), and `description` (string or `null`).
- **FR-021**: The resolved JSON MUST NOT include the full source document, MUST NOT copy unknown
  `$extensions`, and MUST NOT contain absolute paths or `undefined`.
- **FR-022**: The resolved JSON MUST apply a defined null policy (stable-absent → `null`, empty
  collection → `[]`, empty record → `{}`) and a stable key order per D11.
- **FR-023**: The resolved JSON MUST be serialized with 2-space indentation and a single trailing
  newline, UTF-8, no BOM.

#### TypeScript (`tokens.ts`)

- **FR-024**: `tokens.ts` MUST be valid TypeScript with no external/library or manager runtime
  dependency and MUST NOT import the package manager.
- **FR-025**: `tokens.ts` MUST export `tokens` (resolved JSON-safe values), `tokenMetadata` (per-token
  metadata incl. `aliasOf`, `category`, `foundationLevel`, `type`, `description`), and a
  `TokenPath` type derived from the token keys, with `as const` where applicable.
- **FR-026**: `tokens.ts` MUST escape strings safely for TypeScript, represent numbers/objects/arrays
  faithfully, and MUST NOT emit dates, UUIDs, or machine information.
- **FR-027**: `tokens.ts` ordering MUST follow D11 and its bytes MUST be deterministic (encoding,
  newlines, generated comments).
- **FR-028**: The system MUST NOT dynamically import or `eval` `tokens.ts` to verify it.

#### Build manifest (`manifest.json`, `BuildManifestV1`)

- **FR-029**: The manifest MUST describe only the derived artifacts and MUST include `formatVersion`,
  `source` (logical relative path), `sourceHash`, and `artifacts`.
- **FR-030**: Each manifest artifact entry MUST include `format`, `relativePath`, `contentHash`, and
  `byteLength`.
- **FR-031**: The manifest MUST NOT include timestamp, date, user, hostname, cwd, absolute paths, Node
  version, or UUID, and MUST NOT list itself as an artifact.
- **FR-032**: The manifest MUST be the authority that distinguishes managed artifacts from unknown
  files on the next build.

#### Hashes

- **FR-033**: The system MUST compute hashes with SHA-256, lowercase hexadecimal.
- **FR-034**: `sourceHash` MUST be computed over the exact bytes read from `base.tokens.json`.
- **FR-035**: Each artifact `contentHash` MUST be computed over the exact bytes written (build) or
  emitted (export).

#### Build command, output dir, managed files

- **FR-036**: `neuraz-ds build` MUST generate all supported formats and write them under the fixed
  `design-system/build/` directory; no `--output`/`--clean`/`--force`/`--watch`/`--minify` in v1.
- **FR-037**: The system MUST create `design-system/build/` when absent and MUST NOT modify
  `neuraz-ds.config.json`, `design-system/design-system.json`, or the `init` byte output.
- **FR-038**: The build MUST replace only artifacts declared by the previous manifest plus the current
  contract's artifacts, and MUST preserve unknown files.
- **FR-039**: The build MUST block with a typed conflict if an unknown file (or a directory) occupies a
  required artifact path, writing nothing.
- **FR-040**: The build MUST NOT perform a global clean and MUST NOT delete unknown files; an obsolete
  managed artifact may be removed only if the previous manifest declared it and the current contract no
  longer emits it.
- **FR-041**: `build` MUST show a human summary (outcome, source, logical output dir, formats, files,
  summarized hashes, `wrote`, verification) when `--json` is absent.
- **FR-042**: `build --json` MUST emit exactly one `BuildJsonEnvelopeV1`, an independent contract not
  reused by cast from `003`/`004`/`005`.

#### Export command

- **FR-043**: `neuraz-ds export <format>` MUST resolve the project, read, validate, render exactly one
  format, and write that artifact's exact bytes to stdout.
- **FR-044**: `export` MUST NOT create `design-system/build/`, MUST NOT modify mtimes, MUST NOT create
  temporaries/backups, and MUST NOT write a manifest.
- **FR-045**: `export` MUST support exactly `css`, `json`, and `typescript` in v1 and MUST send the
  artifact only to stdout and errors only to stderr.
- **FR-046**: `export` MUST NOT define a `--json` flag in v1 (D15).

#### Determinism & idempotency

- **FR-047**: Identical source bytes and manager version MUST produce byte-identical CSS, resolved
  JSON, TypeScript, and manifest, with identical hashes and order (D11).
- **FR-048**: No artifact MUST depend on locale, time, timezone, hostname, OS, cwd, filesystem order,
  object insertion accident, randomness, or UUID.
- **FR-049**: A first build MUST yield `built`/`wrote:true`; a second build whose rendered set is
  byte-equal to the on-disk managed set MUST yield `unchanged`/`wrote:false` with identical bytes and
  mtimes and no temporaries/backups/renames.
- **FR-050**: Idempotency MUST be decided by byte/hash comparison, not by mtime.

#### Safe multi-file publish, concurrency, verification

- **FR-051**: The build MUST render and validate all artifacts in memory before any write.
- **FR-052**: The build MUST write to a staging location within the same parent directory, then publish
  the complete set, leaving the managed set fully updated or unchanged — never partial.
- **FR-053**: Before publishing, the build MUST verify (by bytes/hashes, not mtime) that the source,
  the managed output, and the previous manifest did not change and that no target became a symlink or
  was replaced; on any change it MUST block publication with `wrote:false` and preserve prior output.
- **FR-054**: After publishing, the build MUST re-read and verify the artifact set (hashes, byte
  lengths, JSON parseability, structural CSS checks, manifest re-read, completeness).
- **FR-055**: On post-publish verification failure the build MUST report `verification-error`,
  `wrote:true`, retain a backup, and perform no automatic destructive rollback.
- **FR-056**: Staging/rename failures MUST yield `write-error` with the prior output preserved and no
  partial set published.

#### Streams, outcomes, exit codes

- **FR-057**: For expected outcomes, `build` human MUST write the report to stdout with empty stderr;
  `build --json` MUST write one envelope to stdout with empty stderr; `export` success MUST write only
  the artifact bytes to stdout with empty stderr.
- **FR-058**: Errors MUST go to stderr; internal errors MUST yield empty stdout, a safe stderr message,
  and exit `70`. The system MUST NOT mix a report and an artifact, nor emit logs around a JSON document.
- **FR-059**: The system MUST define stable outcomes: `built`, `exported`, `unchanged`,
  `invalid-design-system`, `unsupported-value`, `conflict`, `not-found`, `read-error`, `write-error`,
  `verification-error`, `internal-error`.
- **FR-060**: Exit codes MUST reuse the common table without changing historical codes: `built`/
  `exported` → 0, `unchanged` → 2, `invalid-design-system` → 3, `unsupported-value`/`conflict` → 4,
  `not-found` → 5, `read-error`/`write-error` → 6, `verification-error` → 7, `internal-error` → 70.

#### Security

- **FR-061**: All artifact paths MUST be application-controlled within the fixed output dir; no path
  MUST be derived from token content, and path containment MUST be enforced (no traversal).
- **FR-062**: The system MUST reject unsafe symlinks (output or parent) and MUST NOT follow them to
  write outside the managed directory.
- **FR-063**: The system MUST NOT execute or `eval` generated code, fetch URLs, or read assets/fonts/
  images during build/export.
- **FR-064**: Public output MUST NOT contain absolute paths, stacks, secrets, or raw library errors;
  strings MUST be handled safely (CSS/TS escaping, JSON-safe).

#### Packaging, headless, compatibility

- **FR-065**: `build`/`export` MUST work from an installed package and MUST resolve the host from the
  project rather than `process.cwd()`.
- **FR-066**: The core build/export logic MUST be headless use cases usable from CLI, a future viewer/
  editor/local server/MCP, and tests, with domain unaware of filesystem/Commander/stdout/npm and the
  application layer not importing infrastructure.
- **FR-067**: The feature MUST NOT change the behavior, JSON bytes, reporters, or exit codes of `init`,
  `validate`, `inspect`, `foundations`, or `presets`, nor the `JsonEnvelopeV1`/
  `FoundationsJsonEnvelopeV1`/`PresetsJsonEnvelopeV1` contracts, nor the `init` byte output, config,
  manifest structure, token source, or foundation namespace.
- **FR-068**: The feature MUST expose headless hooks sufficient for a future Studio (request a build,
  preview an artifact, read the manifest, detect `unchanged`, report per-format errors, obtain artifact
  bytes, regenerate after token edits) without implementing the Studio, HTTP, MCP, or browser download.

### Key Entities *(include if feature involves data)*

- **BuildTarget**: a supported output format (`css`, `json`, `typescript`) with its renderer identity.
- **TokenProjection**: the per-token model derived once from the reused analysis (path, effective type,
  resolved value, aliasOf, category, foundationLevel, description, trust).
- **BuildArtifact**: a rendered output (`format`, `relativePath`, exact bytes, `contentHash`,
  `byteLength`).
- **BuildManifest** (`BuildManifestV1`): `formatVersion`, `source`, `sourceHash`, ordered `artifacts`
  (excluding itself).
- **BuildPlan**: the in-memory set of artifacts to publish plus the managed/unknown classification from
  the previous manifest.
- **BuildResult / ExportResult**: structured outcome (`outcome`, `wrote`, artifacts/hashes, verification
  state) with no terminal/exit-code coupling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For the same source bytes and manager version, two builds produce byte-identical CSS,
  JSON, TS and manifest (100% of bytes equal).
- **SC-002**: A second build on an unchanged source reports `unchanged` and performs 0 file writes.
- **SC-003**: `export <format>` performs 0 filesystem writes and 0 mtime changes in 100% of runs.
- **SC-004**: A build with any required-target failure produces 0 partial artifacts (0 files created or
  modified).
- **SC-005**: `tokens.resolved.json` parses as JSON in 100% of successful builds.
- **SC-006**: `tokens.ts` is syntactically valid TypeScript in 100% of successful builds.
- **SC-007**: CSS output is byte-deterministic across runs and machines (0 ordering/whitespace diffs).
- **SC-008**: Aliases render as `var(--target)` in CSS and as resolved `value` + `aliasOf` in JSON/TS
  in 100% of aliased tokens.
- **SC-009**: The installed package runs `build`/`export` correctly from a cwd different from the
  project root.
- **SC-010**: Regression suites for `001`–`005` remain green (0 regressions); their JSON bytes and exit
  codes are unchanged.
- **SC-011**: Public artifacts and outputs contain 0 absolute paths and 0 stack traces.
- **SC-012**: The closure audit reports 0 findings of MEDIUM severity or higher and 0 contradictions.
- **SC-013**: A CSS name collision is detected and blocks the build in 100% of colliding inputs (never
  silently resolved).
- **SC-014**: A concurrent source/output modification blocks publication with `wrote:false` and the
  prior output preserved in 100% of detected cases.

## Assumptions

- One Design System per project; a single `design-system/tokens/base.tokens.json` source.
- Three artifact formats in v1 (CSS, resolved JSON, TypeScript) plus a build manifest.
- Fixed output directory `design-system/build/`; CSS selector `:root`; no configurable prefix.
- No themes, modes, dark/light, component tokens, assets, plugins, watch, or interaction.
- Tokens previously added by a preset are part of the source; presets are not a build input.
- The CSS-supported type set bounds buildability: a DS containing only CSS-unsupported types cannot be
  built in v1 but can still be exported as JSON/TypeScript.
- Node `>=22`; no network access during build/export.

## Out of Scope (v1)

SCSS, Sass maps, Less, Tailwind config, Style Dictionary, Android XML, iOS Swift, Flutter, Kotlin;
watch mode, dev server, hot reload, minification, sourcemaps; custom templates, plugins, hooks; custom
output directory, custom file names, custom CSS selector, custom prefix; themes, modes, dark mode,
component tokens; asset build, font copying, icon sprites, image optimization; Figma, URL/CSS import,
image analysis; viewer, editor, MCP; automatic Git commits, npm publication, deployment.
