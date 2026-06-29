# Data Model: Build and Export

All models are immutable unless marked as an infrastructure result. Public DTOs never expose
`undefined`: absent scalar fields use `null`, empty arrays use `[]`, empty records use `{}`.

## BuildFormat

- **Type**: `"css" | "json" | "typescript"`.
- **Order**: `css`, `json`, `typescript`.
- **Ownership**: domain value.
- **Invariant**: no user-defined formats in v1.
- **Serialization**: public strings exactly match CLI args except `json` maps to
  `tokens.resolved.json` as an artifact.

## BuildArtifact

| Field | Type | Null policy | Rule |
|---|---|---|---|
| `format` | BuildFormat | never null | registry key |
| `relativePath` | string | never null | one of `tokens.css`, `tokens.resolved.json`, `tokens.ts` |
| `bytes` | Uint8Array/string bytes | never null | exact UTF-8 bytes to write/emit |
| `contentHash` | SHA-256 hex | never null | hash of exact bytes |
| `byteLength` | number | never null | byte length of exact bytes |
| `contentType` | string | never null | CLI/export metadata |

- **Readonly**: yes; bytes are defensively copied.
- **Ordering**: registry order.
- **Ownership**: produced by renderers, consumed by manifest/writer/export.
- **Validation**: path must be relative, controlled by application, and contain no separators in v1.

## BuildArtifactMetadata

- Same as `BuildArtifact` without `bytes`.
- Used in results, manifest and reports.
- Does not include absolute path, cwd, mtime, environment or source excerpts.

## AnalyzedSourceSnapshot

Internal model produced by the single semantic source read.

| Field | Type | Public? | Rule |
|---|---|---:|---|
| `logicalSourcePath` | `"design-system/tokens/base.tokens.json"` | yes | logical only |
| `sourceByteSnapshot` / `rawBytes` | readonly bytes | no | exact bytes read once |
| `sourceHash` | SHA-256 hex | yes | hash of initial raw bytes |
| `decodedText` | string | no | UTF-8 validated once |
| `parsedDocument` | object | no | result of one `JSON.parse` |
| `analysis` | DesignSystemAnalysis | internal port | reused 002 analysis |
| `resolvedTokenView` | ResolvedTokenView | internal port | produced from same analysis |
| `foundationProjection` | FoundationsInspection/projection | internal port | one 004 projection |

- **Readonly**: all fields are immutable; bytes/objects are defensive copies or frozen references.
- **Invariant**: one semantic read means one raw-byte read, one decode, one parse, one DTCG traversal,
  one alias graph, one type resolution and one foundation projection.
- **Serialization**: never serialized directly. Public results expose only logical source path/hash.
- **Concurrency**: build may later do a byte-only reread to compare SHA-256 against `sourceHash`; that
  reread does not create a second snapshot.

## ResolvedTokenView

Readonly internal resolution view generated during the reused analysis, before renderers run.

| Field | Type | Rule |
|---|---|---|
| `tokens` | readonly ResolvedTokenRecord[] | canonical token order |
| `byPath` | TokenResolutionMap | readonly lookup |
| `sourceHash` | SHA-256 hex | same as AnalyzedSourceSnapshot |

- **Serialization**: internal only; not part of historical 002 JSON or public 006 JSON.
- **Ownership**: application model consumed by normalized projection and renderers.
- **Mutation**: none; arrays/maps return defensive copies or readonly views.

## TokenResolutionMap

- **Type**: `ReadonlyMap<string, ResolvedTokenRecord>`.
- **Ordering**: lookup map mirrors `ResolvedTokenView.tokens`; public serializers use the ordered array.
- **Null policy**: absent paths are map misses, not `null`.

## ResolvedTokenRecord

| Field | Type | Null policy | Rule |
|---|---|---|---|
| `path` | string | never null | canonical token path |
| `declaredValue` | JSON value | never null | source `$value` defensive copy |
| `resolvedValue` | JSON value | never null | final alias-resolved value |
| `immediateAliasTarget` | string \| null | null for concrete token | direct alias target only |
| `aliasChain` | readonly string[] | `[]` for concrete token | immediate-to-final path chain |
| `effectiveType` | string | never null | reused type resolution |
| `aliasState` | AliasState | never null | reused alias graph state |
| `trust` | `"valid" | "recovered" | "untrusted"` | never null | reused analysis trust |

- **Invariant**: invalid alias states do not reach successful build/export projection.
- **Security**: no raw source document, stack, filesystem path or environment data.

## NormalizedBuildToken

| Field | Type | Null policy | Rule |
|---|---|---|---|
| `path` | string | never null | canonical token path |
| `segments` | readonly string[] | `[]` allowed | defensive copy |
| `category` | FoundationCategoryId \| null | null if unresolved/non-foundation | from 004 projection |
| `foundationLevel` | `"primitive" | "semantic" | "unclassified"` | never null | from 004 projection |
| `effectiveType` | string | never null | from 002 type resolution |
| `sourceValue` | JSON value | never null | raw `$value` after defensive copy |
| `resolvedValue` | JSON value | never null | alias-resolved JSON-safe value |
| `aliasOf` | string \| null | null when concrete | immediate alias target from ResolvedTokenView |
| `aliasChain` | readonly string[] | `[]` when concrete | internal, not public v1 |
| `description` | string \| null | null when absent | from 002 summary |
| `trust` | `"valid" | "recovered" | "untrusted"` | never null | from 002 summary |
| `order` | number | never null | canonical order index |
| `compatibility` | object | never null | per-format representability flags/issues |

- **Invariants**: no token with unresolved type, invalid alias, alias-to-group or cycle enters a
  successful projection.
- **No raw AST mutation**: values are cloned and frozen.
- **Limits**: path/alias/node limits reuse `ANALYSIS_LIMITS`.
- **Groups**: groups are not emitted as tokens; inherited type/level information appears on tokens.

## NormalizedTokenSet

| Field | Type | Rule |
|---|---|---|
| `source` | `{ logicalPath, sourceHash }` | logical path and initial raw-byte hash only |
| `tokens` | readonly NormalizedBuildToken[] | canonical order |
| `byPath` | ReadonlyMap<string, NormalizedBuildToken> | internal lookup; not public JSON |
| `warnings` | readonly BuildProjectionIssue[] | safe, deterministic |

- **Readonly**: frozen top-level and nested collections.
- **Ordering**: category order then deterministic path order.
- **Serialization**: never serialized directly; mapped to contracts.
- **Exclusions**: no filesystem absolute paths, streams, Commander, host document, `Error`, presets,
  viewer, MCP.

## ResolvedTokensV1

| Field | Type | Rule |
|---|---|---|
| `formatVersion` | `"1.0.0"` | first key |
| `source` | `{ path: "design-system/tokens/base.tokens.json"; hash: string }` | logical only |
| `tokens` | Record<string, ResolvedTokenV1> | flat token-path keys |

- **Serializer**: JSON.stringify with 2-space indentation and final LF.
- **Ordering**: root keys as above; token keys in canonical order; token fields in contract order.
- **Compatibility**: additive fields require new minor/major policy in contract, not silent leakage.

## ResolvedTokenV1

| Field | Type | Null policy |
|---|---|---|
| `value` | JSON value | never undefined |
| `aliasOf` | string \| null | null when not alias |
| `type` | string | never null |
| `category` | FoundationCategoryId \| null | null if unresolved |
| `foundationLevel` | `"primitive" | "semantic" | "unclassified"` | never null |
| `description` | string \| null | null when absent |

- Does not include unknown `$extensions`, full source node, trust, stack, absolute paths or issues.

## BuildManifestV1

| Field | Type | Rule |
|---|---|---|
| `formatVersion` | `"1.0.0"` | first key |
| `source` | `"design-system/tokens/base.tokens.json"` | logical token source path, not host manifest |
| `sourceHash` | SHA-256 hex | exact initial source raw bytes |
| `artifacts` | BuildManifestArtifactV1[] | css/json/typescript order |

- This is the build manifest at `design-system/build/manifest.json`; the Design System host manifest
  is `design-system/design-system.json`.
- The build manifest does not list itself as an artifact.
- No timestamp/environment/user/host/cwd/package manager data.
- Previous build manifest is ownership authority only if parseable and supported.

## BuildManifestArtifactV1

| Field | Type | Rule |
|---|---|---|
| `format` | BuildFormat | registry order |
| `relativePath` | string | controlled relative artifact path |
| `contentHash` | SHA-256 hex | exact artifact bytes |
| `byteLength` | number | exact artifact bytes |

## BuildPlan

| Field | Type | Rule |
|---|---|---|
| `outputRoot` | `"design-system/build"` | logical root |
| `sourceHash` | string | from source bytes |
| `artifacts` | readonly BuildArtifact[] | complete candidate set |
| `manifest` | BuildManifestV1 + bytes/hash | candidate build manifest |
| `previousBuildManifest` | parsed/corrupt/absent/unsupported | ownership classification |
| `requiredPaths` | readonly string[] | artifacts + build manifest |
| `unknownPolicy` | object | preserve/block rules |

- **Ownership**: application-level publication intent, no Node handles.
- **Invariant**: no partial candidate set.

## BuildSnapshot

| Field | Type | Rule |
|---|---|---|
| `source` | initial hash + optional byte-only reread hash | exact source concurrency state |
| `buildManifest` | absent/corrupt/unsupported/supported + bytes/hash | previous state |
| `managedArtifacts` | metadata + bytes/hash when trusted | from previous build manifest |
| `requiredPathStates` | file/dir/symlink/absent/other | before publish |
| `unknownOccupancy` | readonly BuildConflict[] | blocking unknowns |
| `parents` | path state list | symlink/containment defense |

- **Serialization**: internal only; public results expose summarized conflicts.
- **Concurrency**: build performs only byte/hash/node-state rechecks before publish; source mismatch is
  `conflict` / `source-modified`.

## UnknownOutputNode

| Field | Type | Rule |
|---|---|---|
| `relativePath` | string | logical path under `design-system/build/` |
| `kind` | `"regular-file" | "regular-directory" | "unsupported"` | symlinks/special nodes unsupported |
| `byteLength` | number \| null | files only; null for dirs |
| `depth` | number | bounded by configured unknown depth limit |
| `copyAction` | `"copy" | "block"` | copy only allowed regular nodes |

- **Ownership**: unknown means not declared by a supported previous build manifest.
- **Security**: no absolute paths or link targets in public output.

## BuildOwnership

```text
empty
trusted
untrusted-build-manifest
required-path-owned-by-unknown
managed-artifact-modified
managed-artifact-missing
unsupported-unknown-node
```

- `empty`: build manifest absent and required artifact paths absent; first build allowed.
- `trusted`: supported build manifest and all declared artifact bytes match.
- All other states block publication with `conflict`, `wrote:false`.

## PublicationState

```text
not-started
staging-created
staging-verified
backup-created
prior-moved-to-backup
candidate-published
post-verified
recovery-required
```

- Internal only; no public absolute paths.
- Commit point is transition to `candidate-published`.

## BuildRecoveryState

| Field | Type | Rule |
|---|---|---|
| `outputAvailable` | boolean | whether `design-system/build/` is currently usable |
| `backupRelativePath` | string \| null | relative retained backup path only |
| `recoveryRequired` | boolean | true when human/tool recovery is required |

- `write-error` before moving build: `outputAvailable:true`, `backupRelativePath:null`,
  `recoveryRequired:false`.
- catastrophic restore failure: `outputAvailable:false`, backup retained, `recoveryRequired:true`.
- post-publish verification failure: `outputAvailable:true`, backup retained, `recoveryRequired:true`.

## BuildConflict

| Field | Type | Null policy | Rule |
|---|---|---|---|
| `code` | stable string | never null | e.g. `required-path-owned-by-unknown`, `untrusted-build-manifest` |
| `path` | string \| null | null when global | logical only |
| `format` | BuildFormat \| null | null if not format-specific |
| `severity` | `"error" | "warning"` | never null | blocking conflicts are errors |
| `message` | string | never null | sanitized |
| `blocksWrite` | boolean | never null | true prevents publish |

## BuildResult

Discriminated by `outcome`:

```text
built
unchanged
invalid-design-system
unsupported-value
conflict
not-found
read-error
write-error
verification-error
```

Common fields:

| Field | Type | Rule |
|---|---|---|
| `outcome` | string | semantic, no exit code |
| `wrote` | boolean | false except `built` and post-publish `verification-error` |
| `source` | logical path/hash or null | no absolute path |
| `outputDirectory` | `"design-system/build"` \| null | logical only |
| `outputAvailable` | boolean \| null | null when no output state applies |
| `artifacts` | BuildArtifactMetadata[] | candidates/written when safe |
| `manifest` | metadata/hash or null | public build manifest summary |
| `verification` | BuildVerification \| null | null before verification |
| `backupRelativePath` | string \| null | retained backup path only |
| `recoveryRequired` | boolean | true for retained backup requiring recovery |
| `conflict` | BuildConflict \| null | primary conflict |
| `error` | SafeBuildError \| null | sanitized |

## ExportResult

Discriminated by `outcome`:

```text
exported
invalid-design-system
unsupported-value
not-found
read-error
```

Success fields: `format`, `logicalFilename`, `contentType`, `bytes`, `contentHash`, `byteLength`.
Failure fields: `error`, `source`, optional offending token/format. No write/manifest/output-root data.

## ArtifactSetWriteRequest

| Field | Type | Rule |
|---|---|---|
| `rootDir` | host root | infrastructure receives absolute via application port |
| `outputRoot` | logical safe root | fixed `design-system/build` |
| `snapshot` | BuildSnapshot | expected preconditions |
| `artifacts` | readonly BuildArtifact[] | complete set |
| `manifest` | bytes + contract | build manifest in candidate directory |
| `strategy` | `"candidate-directory-set-v1"` | no dynamic plugin |
| `expectedHashes` | source/artifact/build-manifest hashes | concurrency and verification |

- Generic writer does not know tokens/renderers/CLI/presets/JSON public envelopes.
- Staging contains the complete future `design-system/build/`, not loose files.

## ArtifactSetWriteResult

Discriminated by:

```text
published
unchanged
conflict
unsafe-target
write-error
verification-error
```

Fields:

| Field | Rule |
|---|---|
| `wrote` | true only after candidate directory commit point or successful publish |
| `publishedArtifacts` | metadata in registry order when available |
| `outputAvailable` | boolean output availability after failure/success |
| `backupRelativePath` | retained relative backup path or null |
| `recoveryRequired` | true for catastrophic restore failure or verification-error |
| `verification` | post-publication or staging verification summary |
| `conflicts` | deterministic conflict list |
| `error` | safe write error or null |

`unsafe-target` maps to public `conflict` unless caused by IO failure.

- `write-error` before moving `build/`: `wrote:false`, `outputAvailable:true`,
  `backupRelativePath:null`, `recoveryRequired:false`.
- `write-error` after failed restore: `wrote:false`, `outputAvailable:false`, backup retained,
  `recoveryRequired:true`.
- `verification-error`: `wrote:true`, `outputAvailable:true`, backup retained,
  `recoveryRequired:true`.

## BuildVerification

| Field | Type | Rule |
|---|---|---|
| `status` | `"passed" | "failed" | "skipped"` | skipped only when no write needed |
| `checks` | readonly VerificationCheck[] | deterministic order |
| `artifacts` | per artifact hash/contract status | no artifact bytes |
| `manifest` | build manifest hash/parse/contract status | no absolute paths |

Check kinds: `source`, `css`, `json`, `typescript`, `build-manifest`, `filesystem`.

## BuildJsonEnvelopeV1

| Field | Type | Rule |
|---|---|---|
| `formatVersion` | `"1.0.0"` | independent from 003/004/005 |
| `command` | `"build"` | exact command family |
| `outcome` | BuildResult outcome plus `internal-error` | semantic |
| `source` | object \| null | logical path/hash |
| `outputDirectory` | string \| null | logical only |
| `wrote` | boolean | mirrors result |
| `outputAvailable` | boolean \| null | mirrors result when meaningful |
| `artifacts` | BuildArtifactMetadata[] | no bytes |
| `manifest` | object \| null | build manifest summary |
| `verification` | BuildVerification \| null | structured |
| `backupRelativePath` | string \| null | relative path only |
| `recoveryRequired` | boolean | mirrors result |
| `conflict` | BuildConflict \| null | primary conflict |
| `error` | SafeBuildError \| null | no Error/stack |

- **Serializer**: independent `serializeBuildJsonV1`, 2-space JSON + LF.
- **Streams**: stdout for expected build outcomes, stderr only for CLI internal error in JSON mode.

## SafeBuildError

| Field | Type | Rule |
|---|---|---|
| `code` | stable string | public safe |
| `message` | string | no stack/raw Error |
| `path` | string \| null | logical only |
| `details` | object \| null | bounded safe details |

Families: source validation, unsupported format/value, naming collision, output ownership, build
manifest, unsafe path, concurrency, write, verification, internal.
