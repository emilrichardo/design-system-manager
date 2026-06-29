# Implementation Plan: Build and Export of Design System Artifacts

**Branch**: `main` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-build-export/spec.md`

## Summary

Add headless `build` and `export` use cases that consume the existing local source
`design-system/tokens/base.tokens.json`, reuse the closed `002`/`004` analysis/foundation pipeline
exactly once per operation, project a normalized readonly token set, render deterministic artifacts,
and either publish the complete managed artifact set to `design-system/build/` or emit one artifact to
stdout with zero writes.

The planned flow is:

```text
base.tokens.json
→ analyzeExistingDesignSystem (host + safe read + JSON.parse + DTCG analyzer)
→ projectFoundationMetadata
→ projectFoundations
→ NormalizedTokenSet
→ ArtifactRenderer registry
→ BuildArtifact bytes
→ BuildManifestV1
→ BuildPlan / BuildSnapshot
→ ArtifactSetWriter
→ BuildVerification
→ BuildResult / BuildJsonEnvelopeV1 / CLI report
```

For `export <format>` the flow stops after one renderer and returns artifact bytes; it does not build a
manifest, inspect output, create staging, touch mtimes, or write.

## Technical Context

**Language/Version**: TypeScript strict, ESM/NodeNext, Node `>=22`.

**Primary Dependencies**: Existing dependencies only (`commander`, `@clack/prompts`, `zod`, `ajv`,
`semver`, `vitest`, TypeScript). No new dependency is planned for 006.

**Storage**: Host local files. Source is read-only at `design-system/tokens/base.tokens.json`.
Successful build manages only `design-system/build/tokens.css`,
`design-system/build/tokens.resolved.json`, `design-system/build/tokens.ts`, and
`design-system/build/manifest.json`.

**Testing**: Vitest unit/integration/CLI/binary/tarball tests. Baseline from closed 005: `1264/1264`
tests in `208` test files.

**Target Platform**: Local-first CLI/library package on Node >=22, CI-safe with no TTY and stdin
closed. POSIX and Windows filesystem behavior must be handled conservatively.

**Project Type**: Single TypeScript package with the existing layer rule
`domain <- application <- infrastructure <- cli`.

**Performance Goals**: One safe source read, one `JSON.parse`, one DTCG traversal, one alias/type
resolution, one foundation metadata pass, one foundation projection per operation; renderers are O(token
count + byte length). No quadratic collision checks beyond map/set indexing.

**Constraints**: DTCG 2025.10 source of truth; no network; no generated-code execution; no dynamic
plugins/templates; no Style Dictionary dependency in v1 despite constitutional alignment with the
downstream pipeline concept; no changes to closed 001-005 contracts, bytes, reporters, or exits.

**Scale/Scope**: One source file, three artifact formats (`css`, `json`, `typescript`), fixed output
directory, fixed file names, no themes/modes/component tokens/watch/custom output.

## Constitution Check

*GATE: passed before Phase 0 research and re-checked after Phase 1 design.*

| # | Principle | Status | Justification | Planned evidence |
|---|---|---|---|---|
| I | One Design System per project | PASS | Reuses `resolveHostRoot`; one host root and one fixed DS source. | integration from subfolder and foreign cwd |
| II | Local files are source of truth | PASS | Artifacts are derived and never feed the source. | regression asserts source bytes unchanged by build/export |
| III | DTCG canonical tokens | PASS | Consumes DTCG via existing analyzer; no replacement format. | invalid DTCG blocks before render |
| IV | Style Dictionary pipeline | PASS | 006 creates deterministic downstream artifacts from DTCG without making artifacts authoritative; no SD dependency in v1 because the spec excludes new deps and fixed formats suffice. | ADR 0022 records renderer decision and future compatibility |
| V | Framework independence | PASS | Domain/application models are artifact contracts, not framework adapters. | no React/Astro/Tailwind imports |
| VI | Manager is tool, not DS | PASS | Build writes only derived files under host `design-system/build/`; package updates do not overwrite source. | path and unknown-file tests |
| VII | Visual editing transparency | PASS | Reports and JSON expose logical source/output/artifact paths and hashes. | reporter tests, no absolute paths |
| VIII | Validate before generation | PASS | Analysis/foundation validity gate precedes every renderer; unsupported values block before writes. | build invalid/unsupported zero-write tests |
| IX | Contracts before implementation | PASS | This plan creates independent contracts and ADRs before code. | contracts folder and ADR 0022-0025 |
| X | Accessibility structural | PASS (N/A) | No components/UI/a11y contracts are generated in 006. | scope review |
| XI | Pages as validation | PASS (N/A) | No pages, sections, viewer, or CMS. | scope review |
| XII | Content optional context | PASS (N/A) | No content ingestion. | scope review |
| XIII | Local-first | PASS | All operations are local file reads/writes with no cloud/network. | tests with network-free tarball install |
| XIV | Safe modifications | PASS | Fixed paths, containment, symlink rejection, optimistic concurrency, backup on verification failure, unknown preservation. | writer and concurrency tests |
| XV | Controlled agent integration | PASS | Headless use cases expose structured results and artifact bytes without separate source of truth. | application tests without CLI |
| XVI | Incremental/verifiable | PASS | Scope is fixed to build/export; implementation phases are checkpointed and testable. | future tasks from phases A-L |
| XVII | Portability/no lock-in | PASS | Artifacts are regenerable, source remains DTCG, TS output has no runtime package import. | uninstall/tarball smoke and artifact contract tests |

No constitutional violation or exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/006-build-export/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── artifact-renderer-v1.contract.md
│   ├── artifact-set-writer-v1.contract.md
│   ├── build-artifacts-v1.contract.md
│   ├── build-json-v1.contract.md
│   ├── build-manifest-v1.contract.md
│   ├── build-outcomes-v1.contract.md
│   ├── export-streams-v1.contract.md
│   └── resolved-tokens-v1.contract.md
└── checklists/requirements.md

docs/adr/
├── 0022-normalized-token-projection-and-renderers.md
├── 0023-deterministic-build-artifacts-and-manifests.md
├── 0024-transactional-artifact-set-publication.md
└── 0025-build-export-outcomes-and-stream-contracts.md
```

`tasks.md` and `audit.md` are intentionally not created by `/speckit-plan`.

### Source Code (planned, not created in this phase)

```text
src/domain/build-export/
├── artifact.ts
├── build-format.ts
├── build-manifest.ts
├── build-outcome.ts
├── build-plan.ts
├── build-snapshot.ts
├── css-name.ts
├── normalized-token.ts
└── verification.ts

src/application/build-export/
├── build-design-system.ts
├── build-json/
├── build-ports.ts
├── create-build-projection.ts
├── export-design-system-artifact.ts
├── manifest-builder.ts
└── verification.ts

src/infrastructure/build-export/
├── artifact-set-writer.ts
├── css-renderer.ts
├── hash.ts
├── json-renderer.ts
├── snapshot-reader.ts
├── ts-renderer.ts
└── verifier.ts

src/infrastructure/reporter/
├── build-json-reporter.ts
├── build-json-serializer.ts
├── build-terminal-reporter.ts
└── export-error-reporter.ts

src/cli/commands/
├── build.ts
└── export.ts
```

**Structure Decision**: Add a narrow `build-export` namespace in each layer. Domain owns immutable
value models and pure decisions; application owns orchestration and ports; infrastructure owns Node
filesystem/hash/rendering adapters and reporters; CLI only composes commands, streams and exit codes.

## Current Architecture Findings

- `analyzeExistingDesignSystem` already performs host resolution, presence, managed safe reads,
  `JSON.parse`, config/manifest validation, one DTCG analysis of tokens, cross-document checks, and
  returns `DesignSystemAnalysis`.
- `DesignSystemAnalysis.documents["design-system/tokens/base.tokens.json"].parsed` contains the parsed
  source document; `analysis.nodes` contains path/type/alias/description/trust, but not raw resolved
  values. 006 must read values from the parsed document by token path while using nodes as the
  authoritative index for token identity/type/alias.
- `projectFoundationMetadata` and `projectFoundations` provide the existing foundation level/category
  projection. 006 must reuse them rather than deriving categories or levels independently.
- `RECOGNIZED_DTCG_TYPES` contains the exact 13 DTCG 2025.10 types; CSS v1 support is a subset defined
  in research/contracts, while JSON/TS serialize JSON-safe resolved values.
- `serializeJson` and existing JSON reporters establish `JSON.stringify(value, null, 2) + "\n"` as the
  deterministic serializer pattern.
- `createSingleFileAtomicWriter` gives a proven path-containment/symlink/concurrency/backup pattern for
  one existing file, but 006 needs a new artifact-set writer because the target is a directory set with
  unknown-file preservation.
- `package.json.files` already includes `dist` and `presets`; 006 should not need package assets or
  templates, so no packaging entry is planned.
- No production implementation of 006 exists today: there is no `build` or `export` command, no
  `build-export` application namespace, and no artifact-set writer.

## Architecture

### Layer Flow

```text
domain
  BuildFormat / logical paths / normalized tokens / artifacts / hashes / manifest / outcomes /
  conflicts / deterministic ordering / typed errors / publication plan
    ^
application
  analyze once / project once / render all or one / build manifest / compare unchanged /
  coordinate writer / verify / structured results
    ^
infrastructure
  managed reader reuse / concrete renderers / SHA-256 / filesystem snapshot / staging /
  artifact-set writer / backup / rename / post-write verification / stream adapters
    ^
CLI
  commander commands / composition / human and JSON reporters / stdout-stderr discipline / exits
```

CLI must never contain transformation rules. Renderers are pure infrastructure adapters behind the
`ArtifactRenderer` contract because they know byte encodings but not filesystem or Commander.

### One-Pass Reuse Contract

`buildDesignSystem` and `exportDesignSystemArtifact` call the bound `AnalyzeUseCase` exactly once. The
single `DesignSystemAnalysis` then feeds:

1. `classifyAnalysisOutcome` equivalent validity gate.
2. `projectFoundationMetadata(parsedTokens)`.
3. `projectFoundations(analysis, metadata)`.
4. `createNormalizedTokenSet(analysis, foundations, parsedTokens)`.
5. N renderers.

No second source read, `JSON.parse`, DTCG traversal, alias graph, type resolver, or foundation
projection is allowed. Tests will inject spies around `analyze`, `projectMetadata`, `projectInspection`
and renderers to assert call counts and will use child-process fixtures to prove one operation still
writes/emits the same bytes.

### Normalized Projection

`NormalizedTokenSet` is a frozen, readonly application model with:

- ordered `tokens: readonly NormalizedBuildToken[]`;
- `byPath: ReadonlyMap<string, NormalizedBuildToken>` for application/internal lookup only;
- `source: { logicalPath, sourceHash }`;
- `issues: readonly BuildProjectionIssue[]`.

Each `NormalizedBuildToken` contains path, path segments, effective type, category, foundation level,
source value, resolved value, alias target, description, trust, canonical order index, and serializer
metadata. It contains no filesystem paths, streams, Commander, full host document, raw `Error`, presets,
viewer, or MCP data. It is constructed with defensive copies and frozen objects/arrays; public JSON is
mapped from it, never cast.

Tokens with invalid alias/type or unresolved effective type never reach normal renderers; they are
blocked by analysis/foundation validity. Tokens with values unsupported by a target produce
`unsupported-value` from the target renderer and block build before write.

### Renderers

`ArtifactRenderer` is pure and deterministic:

```text
render(input: NormalizedTokenSet) -> RenderArtifactResult
```

It receives no filesystem, cwd, clock, random, process, Commander, or stream. The explicit registry is
fixed in v1:

| Format | Relative path | Renderer |
|---|---|---|
| `css` | `tokens.css` | `CssTokensRenderer` |
| `json` | `tokens.resolved.json` | `ResolvedJsonRenderer` |
| `typescript` | `tokens.ts` | `TypeScriptTokensRenderer` |

No dynamic plugins, user-controlled imports, or execution of generated artifacts are allowed.

### Build Headless Use Case

```text
resolve/analyze source
→ validate analysis + foundation projection
→ normalized projection
→ render css/json/typescript in registry order
→ verify candidate artifacts in memory
→ create BuildManifestV1
→ snapshot output and previous manifest
→ compare unchanged
→ ArtifactSetWriter.publish(...)
→ post-publication verification
→ BuildResult
```

Application owns orchestration and structured outcomes. Infrastructure owns Node filesystem snapshots,
staging, backup, rename/publication and post-write byte verification. Domain owns the discriminants and
logical contracts.

### Export Headless Use Case

```text
resolve/analyze source
→ validate analysis + foundation projection
→ normalized projection
→ render requested format only
→ verify candidate artifact in memory
→ ExportResult { outcome: exported, artifact bytes, contentType, logicalFilename }
```

Export performs no output-dir inspection, manifest work, staging, backup, temporary files, writes, or
mtime changes. It has no `--json`; `export json` means the JSON artifact.

## Artifact Decisions

### CSS

- File: `tokens.css`.
- Encoding: UTF-8, no BOM, LF newline, final newline.
- Shape:

```css
:root {
  --color-base-blue-500: #0066ff;
}
```

- Names: token path segments joined with `-`, ASCII-safe escaping/validation defined by
  `tokenPathToCssCustomPropertyName`; no locale folding, no prefix.
- Collision detection: build a global map of transformed names to source paths before serializing.
- Aliases: valid source aliases to in-scope tokens render as `var(--target-name)`.
- Comments: only an optional fixed generated header if ADR 0023 keeps it byte-stable; no token
  descriptions as comments in v1 to avoid escaping/leakage complexity.
- Unsupported values are typed `unsupported-value`; no partial CSS is emitted.

CSS v1 type matrix is in [research.md](research.md).

### Resolved JSON

`ResolvedTokensV1` is independent, `formatVersion: "1.0.0"`, 2-space JSON + final newline. Root keys
are `formatVersion`, `source`, `tokens`. `tokens` is a flat record keyed by token path in canonical
order. Every token has `value`, `aliasOf`, `type`, `category`, `foundationLevel`, `description`.
Unknown extensions, source document, absolute paths and `undefined` are excluded.

### TypeScript

`tokens.ts` uses flat records to match JSON and avoid structural collisions:

```ts
export const tokens = {
  "color.base.blue.500": "#0066ff",
} as const;

export const tokenMetadata = {
  "color.base.blue.500": {
    type: "color",
    aliasOf: null,
    category: "color",
    foundationLevel: "primitive",
    description: null,
  },
} as const;

export type TokenPath = keyof typeof tokens;
```

Values are JSON-safe literals emitted through a TS-safe serializer based on `JSON.stringify` with
explicit escaping for U+2028/U+2029 and `</script>`-safe substrings. No imports, no runtime package
dependency, no eval/dynamic import. Syntax validation uses the existing TypeScript dependency
(`typescript.transpileModule` with diagnostics or `tsc --noEmit` in integration), never execution.

### Manifest

`BuildManifestV1` file: `manifest.json`, independent contract, not listed in `artifacts`.

Artifact order is fixed: `css`, `json`, `typescript`. `sourceHash` is SHA-256 over exact source bytes.
Each `contentHash` is SHA-256 over exact artifact bytes. No timestamp, cwd, environment, Node version,
user, hostname, UUID or absolute path.

## Publication Strategy

The chosen strategy is "snapshot + sibling staging + backup of managed paths + per-path atomic rename
with journaled verification", not whole-directory replacement. It preserves unknown files by default
and does not require deleting/replacing the entire `design-system/build/` directory.

Algorithm:

1. Build all candidate bytes in memory.
2. Read a `BuildSnapshot`: source bytes/hash, previous manifest bytes/hash/parse result, existing
   managed artifacts, required paths, node kinds, symlink state, unknown occupancy.
3. If candidate manifest and managed artifacts equal existing bytes, return `unchanged` before staging.
4. Create staging sibling under `design-system/.build-staging-*` or the parent of `build/`, with random
   avoided in contract-level names and implementation using exclusive mkdir retry.
5. Write candidate files to staging, flush/fsync where Node/platform permits, verify bytes/hashes.
6. Re-check source, manifest, managed artifact bytes, required path occupancy, parents and symlinks.
7. Backup current managed files only to a sibling backup directory with relative path exposed if retained.
8. Publish each required artifact into `design-system/build/` by file rename/copy+rename discipline,
   preserving unknown files.
9. Write `manifest.json` last after artifact bytes are present.
10. Post-publish verify all artifacts and manifest.
11. On success, remove staging and backup. On `verification-error`, report `wrote:true`, retain backup,
    and do not attempt destructive rollback.

Atomicity limit: filesystems generally provide atomic rename for a single path on the same volume, not
for a directory set while preserving unknown files. The user-visible guarantee is "no partial set is
published on expected pre-publish failures; after a successful publish attempt, post-verification
detects and reports any inconsistency with retained backup." This limitation is explicitly captured in
ADR 0024.

## Unknown Files and Ownership

Previous `manifest.json` is the only ownership authority. If it is absent, corrupt or unsupported, no
existing required artifact path is trusted as managed; required-path occupancy blocks with `conflict`.
Unknown files are preserved and never globally cleaned. Unknown file or directory occupying
`tokens.css`, `tokens.resolved.json`, `tokens.ts` or `manifest.json` blocks with `wrote:false`.
Artifacts declared by an older supported manifest but no longer emitted may be removed only because the
previous manifest proves ownership; v1 emits a fixed set, so this is future-proofing.

Manual modification of a managed artifact is detected by comparing previous manifest hash/byte length
against actual bytes. It is a `conflict` unless the modified bytes exactly match the candidate set and
the manifest is also consistent.

## Verification

Pre-render validation: analysis valid, foundation projection usable, effective types resolved, aliases
valid, limits not partial.

Candidate verification: bytes match hashes/lengths, CSS has one `:root`, unique declarations and valid
`var(...)` targets, JSON parses and matches `ResolvedTokensV1`, TS has expected exports/no imports and
syntax diagnostics clean, manifest structure/hashes/paths valid.

Post-publication verification: re-read files from disk and repeat hash/length/contract checks. No
`eval`, no dynamic import of `tokens.ts`, no generated code execution.

## Outcomes and Exit Codes

Domain/application outcomes stay semantic. CLI maps them:

| Outcome | Exit |
|---|---:|
| `built` / `exported` | 0 |
| `unchanged` | 2 |
| `invalid-design-system` | 3 |
| `unsupported-value` / `conflict` | 4 |
| `not-found` | 5 |
| `read-error` / `write-error` | 6 |
| `verification-error` | 7 |
| `internal-error` | 70 |

`unsupported-value` and `conflict` share exit `4` for compatibility with "valid request cannot safely
proceed", while remaining distinct discriminants in structured results. `not-found` includes
`resource: "design-system" | "source"` where contracts require it.

## Streams

- `build`: stdout deterministic human report; stderr empty for expected outcomes.
- `build --json`: stdout exactly one `BuildJsonEnvelopeV1`; stderr empty for expected outcomes.
- `export css|json|typescript` success: stdout exact artifact bytes; stderr empty.
- `export` expected error: stdout empty; stderr safe human report.
- internal error: stdout empty; stderr safe message or JSON internal envelope for `build --json`; exit 70.

No logs may wrap JSON or artifact stdout.

## Testing Strategy

Unit:

- normalized projection, defensive copies, ordering, null policy;
- CSS name transform, escaping, collisions, serializer, unsupported types;
- resolved JSON mapper/serializer;
- TS serializer and syntax validation adapter;
- SHA-256 helpers, manifest builder, outcomes/exits;
- idempotence comparison and conflict classification.

Application:

- `buildDesignSystem` orchestration, all formats, no partial render, invalid input, unsupported value,
  unchanged, conflicts, verification-error mapping;
- `exportDesignSystemArtifact` one format, zero writer calls, no manifest;
- one-pass analysis/projection with spies.

Infrastructure:

- snapshots, path containment, symlinks, staging, unknown files, concurrency, backup, rename failures,
  cleanup, post-write verification.

Integration/CLI:

- real filesystem with spaces/Unicode, corrupted manifest, unknown files, first/second build, no TTY,
  stdin closed, stdout/stderr separation, exit matrix, binary from subfolder.

Packaging:

- `npm pack --dry-run --json`, real tarball install, generated artifacts from installed binary, no
  unlisted runtime assets.

Regression:

| Feature | Must remain stable |
|---|---|
| 001 init | generated initial bytes, config/manifest/source paths, exits |
| 002 validate/inspect | analyzer, aliases, types, states, reporters |
| 003 JSON | `JsonEnvelopeV1` bytes and internal-error behavior |
| 004 foundations | category registry, levels, projection, JSON bytes |
| 005 presets | catalog, plan/apply, single-file writer behavior, JSON bytes, packaging |

## Future Implementation Phases

| Phase | Scope | Depends on | Parallelism |
|---|---|---|---|
| A | domain models, formats, normalized projection | current analyzer/foundations | foundation for all |
| B | CSS naming, escaping, renderer | A | can start with C after projection |
| C | resolved JSON mapper/serializer | A | parallel with B/D |
| D | TypeScript renderer and syntax validation | A | parallel with B/C |
| E | manifest, hashes, artifact metadata | B/C/D | before writer |
| F | build/export headless use cases | A-E | before reporters |
| G | reporters, JSON envelope, outcomes | F | parallel with writer internals |
| H | snapshot, ownership, conflicts | E | before publication |
| I | artifact-set writer transactional publication | H | before CLI write path |
| J | verification and idempotence | E/I | after writer skeleton |
| K | CLI commands, streams, exits | F/G/I/J | late adapter |
| L | child processes, packaging, regression, audit | K | final closure |

## Risks

| Risk | Probability | Impact | Mitigation | Planned test |
|---|---|---|---|---|
| False directory-set atomicity | Medium | High | ADR states limits; verify and backup retained | injected post-publish failure |
| Windows rename behavior | Medium | High | same-parent staging; avoid replacing non-empty dirs | platform/adapter tests with failures |
| Unknown file loss | Low | Critical | previous manifest ownership only; no global clean | unknown preservation integration |
| Corrupt manifest ambiguity | Medium | Medium | treat as untrusted; block required occupancy | corrupt manifest test |
| Manual artifact edit | Medium | Medium | hash/byte conflict before publish | managed modified test |
| CSS collisions | Medium | Medium | global map before serialization | collision unit + CLI |
| Unsafe escaping | Medium | High | pure serializers and fixture matrix | CSS/TS escaping tests |
| Invalid TS | Low | Medium | TypeScript syntax diagnostics, no eval | syntax test |
| Unsupported values | Medium | Medium | typed `unsupported-value`, zero write | unsupported type tests |
| Large buffers | Low | Medium | reuse input limits; cap artifact bytes/issues | limit tests |
| Hash inconsistency | Low | High | hash exact bytes only after serialization | manifest hash tests |
| Concurrency race | Medium | High | snapshot and re-check immediately before publish | injected concurrent source/output change |
| Verification failure | Low | High | `wrote:true`, backup retained, no rollback | verification-error integration |
| Packaging missing runtime asset | Low | Medium | no templates/assets planned; tarball smoke | npm pack + install |
| Regression 001-005 | Medium | High | no contract changes; run regression suites | regression tests |

## Traceability

| Range | Architecture assignment |
|---|---|
| FR-001..004 | one-pass source/analyzer/foundation reuse in application |
| FR-005..008 | validity gate and renderer unsupported-value results |
| FR-009..011 | alias metadata from reused analysis plus normalized projection |
| FR-012..018 | CSS renderer/name contract |
| FR-019..023 | `ResolvedTokensV1` contract and serializer |
| FR-024..028 | TypeScript renderer and verifier |
| FR-029..035 | manifest/hash contracts |
| FR-036..042 | build use case, writer, reporters, JSON envelope |
| FR-043..046 | export use case and stream contract |
| FR-047..050 | deterministic ordering and unchanged comparison |
| FR-051..056 | artifact-set writer, snapshot, backup, verification |
| FR-057..060 | CLI streams/outcomes/exits |
| FR-061..064 | path safety, symlink defense, no execution, safe public errors |
| FR-065..068 | installed package, headless hooks, compatibility |

All 20 user stories are covered by the phases and testing strategy. SC-001..014 map to deterministic
artifact tests, idempotency tests, export zero-write tests, no-partial tests, JSON/TS/CSS validation,
alias tests, tarball/foreign-cwd tests, regression suites, public-output safety, audit, collision tests,
and concurrency tests respectively.

## Complexity Tracking

No constitutional violations are present; no complexity exception is required.
