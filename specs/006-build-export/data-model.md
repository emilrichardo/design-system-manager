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
| `aliasOf` | string \| null | null when concrete | from reused alias graph |
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
| `source` | `{ logicalPath, sourceHash }` | logical path only |
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
| `source` | `"design-system/tokens/base.tokens.json"` | logical path |
| `sourceHash` | SHA-256 hex | exact source bytes |
| `artifacts` | BuildManifestArtifactV1[] | css/json/typescript order |

- `manifest.json` does not list itself.
- No timestamp/environment/user/host/cwd/package manager data.
- Previous manifest is ownership authority only if parseable and supported.

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
| `manifest` | BuildManifestV1 + bytes/hash | candidate manifest |
| `previousManifest` | parsed/corrupt/absent/unsupported | ownership classification |
| `requiredPaths` | readonly string[] | artifacts + manifest |
| `unknownPolicy` | object | preserve/block rules |

- **Ownership**: application-level publication intent, no Node handles.
- **Invariant**: no partial candidate set.

## BuildSnapshot

| Field | Type | Rule |
|---|---|---|
| `source` | bytes/hash/node state | exact pre-publish source |
| `manifest` | absent/corrupt/unsupported/supported + bytes/hash | previous state |
| `managedArtifacts` | metadata + bytes/hash when trusted | from previous manifest |
| `requiredPathStates` | file/dir/symlink/absent/other | before publish |
| `unknownOccupancy` | readonly BuildConflict[] | blocking unknowns |
| `parents` | path state list | symlink/containment defense |

- **Serialization**: internal only; public results expose summarized conflicts.
- **Concurrency**: snapshot is re-read before publish; mismatches become conflict.

## BuildConflict

| Field | Type | Null policy | Rule |
|---|---|---|---|
| `code` | stable string | never null | e.g. `unknown-required-path`, `manifest-corrupt` |
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
| `artifacts` | BuildArtifactMetadata[] | candidates/written when safe |
| `manifest` | metadata/hash or null | public summary |
| `verification` | BuildVerification \| null | null before verification |
| `backup` | `{ relativePath: string } | null` | retained only on verification-error |
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
| `manifest` | bytes + contract | written last |
| `strategy` | `"staged-managed-set-v1"` | no dynamic plugin |
| `expectedHashes` | source/artifact/manifest hashes | concurrency and verification |

- Generic writer does not know tokens/renderers/CLI/presets/JSON public envelopes.

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

Fields: `wrote`, `publishedArtifacts`, `backupRelativePath`, `verification`, `conflicts`, `error`.
`unsafe-target` maps to public `conflict` unless caused by IO failure.

## BuildVerification

| Field | Type | Rule |
|---|---|---|
| `status` | `"passed" | "failed" | "skipped"` | skipped only when no write needed |
| `checks` | readonly VerificationCheck[] | deterministic order |
| `artifacts` | per artifact hash/contract status | no artifact bytes |
| `manifest` | hash/parse/contract status | no absolute paths |

Check kinds: `source`, `css`, `json`, `typescript`, `manifest`, `filesystem`.

## BuildJsonEnvelopeV1

| Field | Type | Rule |
|---|---|---|
| `formatVersion` | `"1.0.0"` | independent from 003/004/005 |
| `command` | `"build"` | exact command family |
| `outcome` | BuildResult outcome plus `internal-error` | semantic |
| `source` | object \| null | logical path/hash |
| `outputDirectory` | string \| null | logical only |
| `wrote` | boolean | mirrors result |
| `artifacts` | BuildArtifactMetadata[] | no bytes |
| `manifest` | object \| null | summary |
| `verification` | BuildVerification \| null | structured |
| `backup` | object \| null | relative path only |
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

Families: source validation, unsupported format/value, naming collision, output ownership, manifest,
unsafe path, concurrency, write, verification, internal.
