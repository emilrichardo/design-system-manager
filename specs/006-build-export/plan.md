# Implementation Plan: Build and Export of Design System Artifacts

**Branch**: `main` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-build-export/spec.md`

## Summary

Add headless `build` and `export` use cases that consume the existing local source
`design-system/tokens/base.tokens.json`, reuse the closed `002`/`004` analysis/foundation pipeline in
one semantic pass per operation, project a readonly resolved token view and normalized token set, render
deterministic artifacts, and either publish a complete candidate `design-system/build/` directory as a
set or emit one artifact to stdout with zero writes.

The planned flow is:

```text
base.tokens.json
→ AnalyzedSourceSnapshot (one raw byte read + UTF-8 decode + JSON.parse + DTCG analyzer)
→ ResolvedTokenView / TokenResolutionMap (same analyzer execution)
→ projectFoundationMetadata
→ projectFoundations
→ NormalizedTokenSet
→ ArtifactRenderer registry
→ BuildArtifact bytes
→ BuildManifestV1
→ BuildPlan / BuildSnapshot / BuildOwnership
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

**Performance Goals**: One semantic source read, one UTF-8 decode, one `JSON.parse`, one DTCG traversal,
one alias graph, one type resolution, one foundation metadata pass, one foundation projection per
operation; `build` may add one byte-only source reread before publication to hash and compare
concurrency, with no decode/parse/analyze/render. Renderers are O(token count + byte length). No
quadratic collision checks beyond map/set indexing.

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
  `JSON.parse`, config/Design System host manifest validation, one DTCG analysis of tokens,
  cross-document checks, and returns `DesignSystemAnalysis`.
- `DesignSystemAnalysis.documents["design-system/tokens/base.tokens.json"].parsed` contains the parsed
  source document; `analysis.nodes` contains path/type/alias/description/trust, but not raw resolved
  values. 006 extends the internal analysis projection additively with a readonly `ResolvedTokenView`
  so renderers reuse declared value, resolved value, immediate alias target, alias chain, effective
  type, alias state and trust without a second alias traversal.
- The managed document reader may be extended additively to expose bytes+text from the same read for
  this feature. Raw bytes, decoded text and parsed document stay internal to `AnalyzedSourceSnapshot`
  and must not alter historical validate/inspect/foundations outputs.
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
  managed reader reuse / concrete renderers / SHA-256 / filesystem snapshot / candidate-directory
  staging / artifact-set writer / backup / rename / post-write verification / stream adapters
    ^
CLI
  commander commands / composition / human and JSON reporters / stdout-stderr discipline / exits
```

CLI must never contain transformation rules. Renderers are pure infrastructure adapters behind the
`ArtifactRenderer` contract because they know byte encodings but not filesystem or Commander.

### One-Pass Reuse Contract

`buildDesignSystem` and `exportDesignSystemArtifact` call the bound `AnalyzeUseCase` exactly once. The
single semantic read creates an `AnalyzedSourceSnapshot`:

```text
logicalSourcePath
sourceByteSnapshot/rawBytes (internal)
sourceHash (SHA-256 over the exact initial raw bytes)
decodedText (internal)
parsedDocument (internal)
analysis
resolvedTokenView
foundationProjection
```

The resulting `DesignSystemAnalysis` then feeds:

1. `classifyAnalysisOutcome` equivalent validity gate.
2. `projectFoundationMetadata(parsedTokens)`.
3. `projectFoundations(analysis, metadata)`.
4. `createNormalizedTokenSet(analysis, foundations, parsedTokens)`.
5. N renderers.

No second semantic source read, `JSON.parse`, DTCG traversal, alias graph, type resolver, or foundation
projection is allowed. `build` alone may perform a byte-only reread just before directory publication:
read current raw bytes, hash with SHA-256, compare to the initial `sourceHash`, and return `conflict` /
`source-modified` with `wrote:false` on mismatch. That reread must not decode, parse, analyze, inspect
foundations or render. `export` has only the initial semantic read. Tests will inject spies around
`analyze`, `projectMetadata`, `projectInspection`, alias graph creation and renderers to assert call
counts and will use child-process fixtures to prove one operation still writes/emits the same bytes.

### Normalized Projection

`NormalizedTokenSet` is a frozen, readonly application model with:

- ordered `tokens: readonly NormalizedBuildToken[]`;
- `byPath: ReadonlyMap<string, NormalizedBuildToken>` for application/internal lookup only;
- `source: { logicalPath, sourceHash }`;
- `issues: readonly BuildProjectionIssue[]`.

Each `NormalizedBuildToken` contains path, path segments, effective type, category, foundation level,
declared value, resolved value, immediate alias target, full alias chain, alias state, trust,
description, canonical order index, and serializer metadata. It is populated from `ResolvedTokenView`
and the foundation projection, contains no filesystem paths, streams, Commander, full host document,
raw `Error`, presets, viewer, or MCP data, and is constructed with defensive copies and frozen
objects/arrays. Public JSON is mapped from it, never cast, and does not leak historical analyzer
internals.

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
→ snapshot output and previous build manifest
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

- Names: token path segments joined with `-`, ASCII-safe validation defined by
  `tokenPathToCssCustomPropertyName`; exact formula is `"--" + segments.join("-")`. Every segment must
  match `^[A-Za-z0-9_][A-Za-z0-9_-]*$`; case is preserved; no lowercasing, Unicode normalization,
  identifier escaping or prefix exists in v1.
- Collision detection: build a global map of transformed names to source paths before serializing.
- Aliases: valid source aliases to in-scope tokens render as `var(--immediate-target-name)`. Alias
  chains keep each immediate hop in CSS when every hop generates a valid custom property; if any target
  is missing, a group, invalid, non-renderable or lacks a CSS declaration, CSS returns
  `unsupported-value` with no fallback to the final resolved value.
- String values: double quoted; escape `\`, `"`, LF, CR, form feed, NULL, C0 controls and DEL with
  deterministic CSS hex escapes plus a space terminator where needed. This is value escaping, not
  identifier escaping.
- Numbers: finite only, decimal point `.`, no locale formatting, no `toLocaleString`; `-0` serializes
  as `0`; scientific notation is not emitted.
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

`BuildManifestV1` file: `design-system/build/manifest.json`, independent contract, not listed in
`artifacts`. It is always called the build manifest. The Design System host manifest is
`design-system/design-system.json` and is only used to determine host initialization; it is not an
artifact ownership authority.

Artifact order is fixed: `css`, `json`, `typescript`. `sourceHash` is SHA-256 over the exact initial
raw source bytes. Each `contentHash` is SHA-256 over exact artifact bytes. No timestamp, cwd,
environment, Node version, user, hostname, UUID or absolute path.

## Publication Strategy

The chosen strategy is set-consistent transactional publication of a complete directory candidate:
`snapshot + sibling staging directory + full backup of the prior build directory + bounded rename
publish + verification`. It rejects artifact-by-artifact publication into the live
`design-system/build/` directory and does not promise absolute cross-platform filesystem atomicity.

Sibling layout:

```text
parent/
├── build/
├── .build-staging-<internal>
└── .build-backup-<internal>
```

Internal names are not public contract values.

Algorithm:

1. Build all candidate managed bytes in memory.
2. Inspect existing `design-system/build/`.
3. Validate output ownership from the previous build manifest.
4. Classify managed artifacts and unknown nodes.
5. Create a staging sibling containing the complete future `design-system/build/`.
6. Securely copy allowed unknown regular files/directories into staging, byte-for-byte, without
   following links or executing anything.
7. Write all new managed artifacts to staging.
8. Write the new build manifest into staging.
9. Verify staging bytes, hashes, contracts, node kinds and containment.
10. Revalidate concurrency: byte-only source hash compare, previous build manifest/artifact hashes,
    required path occupancy, parents and symlinks.
11. Publish the candidate directory as a set: rename current `build/` to backup, rename staging to
    `build/`, then verify the published build.
12. On success, delete backup best-effort. On `verification-error`, report `wrote:true`,
    `outputAvailable:true`, retain backup, set `recoveryRequired:true`, and do not attempt destructive
    rollback.

Commit point is successful rename of staging to `build/`; from that point `wrote:true`.

Failure states:

- Before moving `build/`: `write-error` or `conflict`, `wrote:false`, previous build intact, staging
  cleaned best-effort.
- After moving `build/` to backup but before candidate publish: immediately restore backup to `build`.
  If restore works, report `write-error`, `wrote:false`, previous build restored, staging cleaned. If
  restore fails, report `write-error`, `wrote:false`, `outputAvailable:false`, retain backup relative
  path, and set `recoveryRequired:true`.
- After commit point: `verification-error`, `wrote:true`, `outputAvailable:true`, backup retained,
  `recoveryRequired:true`; no automatic rollback.

POSIX expectation: same-filesystem sibling renames are the strongest primitive available, but replacing
non-empty directories still requires two renames and can create a short availability window. The backup
exists before the commit point and supports restore.

Windows expectation: open directories/files, antivirus scanners and handles may block rename. The
adapter uses bounded retry, then either restores before commit or retains backup with typed recovery
metadata. Best-effort cleanup is never reported as success-critical.

Shared guarantee: no artifact-by-artifact live publication, no mixed managed artifact set, complete
backup before commit point, and typed recoverable errors.

## Unknown Files and Ownership

Previous build manifest is the only ownership authority. If it is absent and required paths are absent,
ownership is `empty` and first build is allowed. If it is absent while required artifact paths exist,
those paths are unknown and block with `required-path-owned-by-unknown`. Corrupt or unsupported build
manifest blocks with `untrusted-build-manifest`; missing managed artifact blocks with
`managed-artifact-missing`; hash mismatch blocks with `managed-artifact-modified`.

Unknown nodes are preserved only when they are regular files or regular directories, remain contained
under `design-system/build/`, and fit documented limits: file count <= `ANALYSIS_LIMITS.maxNodes`,
depth <= `ANALYSIS_LIMITS.maxDepth`, total bytes <= `ANALYSIS_LIMITS.maxTotalBytes` when available for
the existing repo limit set, and per-file size <= the same total-byte budget. Symlinks, hard-link
assumptions, sockets, FIFOs, devices, special node kinds, path escapes and limit excess block with
`unsupported-unknown-node`. Unknown file or directory occupying `tokens.css`, `tokens.resolved.json`,
`tokens.ts` or build `manifest.json` blocks with `wrote:false`. Artifacts declared by an older
supported build manifest but no longer emitted may be removed only because the previous build manifest
proves ownership; v1 emits a fixed set, so this is future-proofing.

Manual modification of a managed artifact is detected by comparing previous build manifest hash/byte length
against actual bytes. It is a `conflict` unless the modified bytes exactly match the candidate set and
the build manifest is also consistent.

## Verification

Pre-render validation: analysis valid, foundation projection usable, effective types resolved, aliases
valid, limits not partial.

Candidate verification: bytes match hashes/lengths, CSS has one `:root`, unique declarations and valid
`var(...)` targets, JSON parses and matches `ResolvedTokensV1`, TS has expected exports/no imports and
syntax diagnostics clean, build manifest structure/hashes/paths valid.

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
| A | models, source snapshot and resolved token view | current analyzer/foundations | foundation for all |
| B | normalized projection and ordering | A | unblocks renderers |
| C | CSS naming, escaping and exact support matrix | A-B | parallel with D/E after projection |
| D | JSON renderer | A-B | parallel with C/E |
| E | TypeScript renderer | A-B | parallel with C/D |
| F | build manifest, hashes and ownership | C/D/E | before writer |
| G | build/export headless use cases | A-F | before reporters |
| H | reporters, public JSON and outcomes | G | parallel with I/J internals |
| I | snapshot, unknown nodes and concurrency | F-G | before directory writer |
| J | transactional directory writer | I | before CLI write path |
| K | candidate/post-publication verification and idempotency | F/J | after writer skeleton |
| L | CLI, child processes, packaging, regression and audit | G/H/J/K | final closure |

## Risks

| Risk | Probability | Impact | Mitigation | Planned test |
|---|---|---|---|---|
| False directory-set atomicity | Medium | High | ADR states limits; verify and backup retained | injected post-publish failure |
| Windows rename behavior | Medium | High | same-parent staging; avoid replacing non-empty dirs | platform/adapter tests with failures |
| Unknown file loss | Low | Critical | previous build manifest ownership only; no global clean | unknown preservation integration |
| Corrupt build manifest ambiguity | Medium | Medium | treat as untrusted; block required occupancy | corrupt build manifest test |
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
