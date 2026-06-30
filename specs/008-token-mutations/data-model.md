# Data Model — Token Mutation Commands and Safe Diff (Phase 1)

Conceptual entities, fields, invariants, layer and relationship to existing models. No implementation.
Null policy: stable-but-absent → `null`; empty collection → `[]`; empty record → `{}`; never `undefined`.
All paths are logical token paths (`a.b.c`); no absolute paths, cwd, hostname or raw bytes in public
shapes.

## Enumerations

### TokenMutationOperationKind (domain)
Token: `create-token | update-value | update-type | update-description | update-category | set-alias |
remove-alias | rename-token | move-token | duplicate-token | remove-token`.
Group: `create-group | rename-group | move-group | remove-empty-group`.

### TokenMutationDiffKind (domain)
`added | updated | renamed | moved | removed | alias-changed | metadata-changed | group-changed`.

### TokenMutationOutcome (domain)
`planned | applied | unchanged | invalid-command | invalid-design-system | conflict | not-found |
read-error | write-error | verification-error`. `internal-error` is adapter-only (never in the domain).

### MutationIssueCode (domain)
`invalid-path | token-exists | token-not-found | group-not-found | rename-collision | move-collision |
alias-not-found | alias-cycle | alias-to-group | type-mismatch | invalid-dtcg-value |
parent-descendant-conflict | removal-with-dependents | group-removal-non-empty |
concurrent-source-change`.

## Entities

### TokenMutationOperationV1 (domain) — discriminated by `kind`
Common: `kind: TokenMutationOperationKind`. Per-kind fields (logical paths + safe values):
| Kind | Fields |
|---|---|
| create-token | `path`, `value` (DTCG value), `type` (string), `description?`, `category?` |
| update-value | `path`, `value` |
| update-type | `path`, `type` |
| update-description | `path`, `description \| null` (DTCG `$description`; null clears) |
| update-category | `path`, `category \| null` (Neuraz `$extensions` classification; see invariants) |
| set-alias | `path`, `target` (logical path) |
| remove-alias | `path` (inlines the resolved concrete value; see invariants) |
| rename-token | `path`, `newName` (last segment) |
| move-token | `path`, `newParent` (group path) |
| duplicate-token | `path`, `destinationPath` |
| remove-token | `path` |
| create-group | `path`, `description?` |
| rename-group | `path`, `newName` |
| move-group | `path`, `newParent` |
| remove-empty-group | `path` |

Invariants: pure data; no bytes/Error; `path`/`target`/`newParent`/`destinationPath` are safe logical
token paths; `value` is a JSON-safe DTCG value. `remove-alias` requires the target currently be an alias
and **inlines its resolved concrete value** (the token never becomes value-less). `update-description`
edits DTCG `$description`. `update-category` edits the Neuraz classification metadata under
`$extensions["ar.neuraz.design-system-manager"]` (consistent with `004`/`005`); the *foundation category*
of `004` stays **path-derived and read-only** and is changed only by `move-token`/`move-group`.

### TokenMutationCommandV1 (domain)
| Field | Type | Notes |
|---|---|---|
| formatVersion | "1.0.0" | first key |
| operations | TokenMutationOperationV1[] | ordered; all-or-nothing |

Invariants: an empty `operations` is a no-op plan (`unchanged` on apply); operations apply in order to a
working model; a later operation may depend on an earlier one within the same command.

### TokenMutationDiffEntry (domain)
| Field | Type | Notes |
|---|---|---|
| kind | TokenMutationDiffKind | |
| path | string | logical path affected (post-state path for renamed/moved) |
| previousPath | string \| null | for `renamed`/`moved` |
| before | safe public value \| null | prior value/metadata/alias target (safe projection) |
| after | safe public value \| null | next value/metadata/alias target |
| references | string[] | logical paths of aliases rewritten because of this entry |

Invariants: safe public values only (no raw bytes, no internal parsed nodes); deterministic order
(by path, then kind).

### TokenMutationDiffV1 (domain)
| Field | Type | Notes |
|---|---|---|
| entries | TokenMutationDiffEntry[] | ordered, deterministic |
| summary | `{ added; updated; renamed; moved; removed; aliasChanged; metadataChanged; groupChanged }` | counts |

### SourceSnapshotIdentity (domain)
| Field | Type | Notes |
|---|---|---|
| logicalPath | string | `design-system/tokens/base.tokens.json` |
| contentHash | string | SHA-256 lowercase hex of the exact source bytes at plan time |

### TokenMutationPlanV1 (application)
| Field | Type | Notes |
|---|---|---|
| operations | TokenMutationOperationV1[] | the validated, ordered operations |
| diff | TokenMutationDiffV1 | the change set |
| candidateHash | string | SHA-256 of the serialized candidate document |
| source | SourceSnapshotIdentity | captured snapshot identity (for concurrency at apply) |
| writable | boolean | whether the plan can be applied (no blocking issues) |

Invariants: read-only and deterministic — identical command + source ⇒ identical plan and diff; computing
a plan writes nothing.

### MutationIssue / MutationConflict (domain)
| Field | Type | Notes |
|---|---|---|
| code | MutationIssueCode | stable |
| path | string \| null | logical path or null (global) |
| severity | "error" \| "warning" | |
| message | string | safe, no absolute paths |
| blocksApply | boolean | |
| dependents | string[] | for `removal-with-dependents` (logical paths) |

### TokenMutationResultV1 (domain/application) — discriminated by `outcome`
Common fields: `outcome: TokenMutationOutcome`, `wrote: boolean`, `diff: TokenMutationDiffV1 | null`,
`plan: TokenMutationPlanV1 | null`, `conflicts: MutationIssue[]`, `recovery: MutationRecoveryState | null`,
`source: SourceSnapshotIdentity | null`, `error: SafeMutationError | null`.

Invariants: `wrote:true` only for `applied`; `planned`/`unchanged`/blocked/read outcomes ⇒ `wrote:false`.

### MutationRecoveryState (domain)
`{ sourceAvailable: boolean; backupRelativePath: string | null; recoveryRequired: boolean }` — mirrors
the `005`/`006`/`007` recovery semantics (write-error before move vs post-write verification failure).

### SafeMutationError (domain)
`{ code: string; message: string; path: string | null; details: Record<string, unknown> | null }` —
never `Error`, stack, absolute path or secrets.

## Validation classification (data-level summary)

| Case (code) | Classification |
|---|---|
| invalid-path, token-not-found, group-not-found, alias-not-found, alias-cycle, alias-to-group, type-mismatch, invalid-dtcg-value, parent-descendant-conflict | blocking error → `invalid-command` |
| removal-with-dependents, group-removal-non-empty | blocking error → `conflict` |
| token-exists (create/duplicate), rename-collision, move-collision | blocking conflict → `conflict` |
| concurrent-source-change | blocking conflict at apply → `conflict` |
| alias-reference rewrite on rename/move | auto-resolved, shown in diff (`alias-changed`) |

Never silently resolved: type-mismatch, invalid-dtcg-value, broken aliases, concurrent-source-change.

## Outcome → exit code mapping (shared with 001–007)

| Outcome | Exit |
|---|---:|
| planned / applied | 0 |
| unchanged | 2 |
| invalid-command / invalid-design-system | 3 |
| conflict | 4 |
| not-found | 5 |
| read-error / write-error | 6 |
| verification-error | 7 |
| internal-error (adapter only) | 70 |

## Relationships to existing models

- Reuses the `002`/`004` analysis (alias graph, effective type, trust) to validate commands and rewrite
  references — no second engine.
- Reuses the `005` `SingleFileAtomicWriter` guarantees (snapshot identity, concurrency detection, backup,
  restore, verification) for the single-file apply; `006`/`007` provide the conceptual transactional model.
- Reuses the shared outcome/exit-code vocabulary; adds `invalid-command` only.
- Shares **nothing** with build artifacts, the asset manifest or the host manifest; mutations never touch
  `design-system/build/**` or `design-system/assets/**`.
