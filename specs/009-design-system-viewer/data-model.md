# Data Model — Design System Viewer (Phase 1)

Conceptual entities, fields, invariants, layer and **provenance** (the existing use case/DTO each field
projects from). No implementation. Null policy: stable-but-absent → `null`; empty collection → `[]`; empty
record → `{}`; never `undefined`. All paths are logical, relative token/asset paths; no absolute paths,
cwd, hostname, raw bytes, `Error`/stack, or secrets in any public shape.

## Enumerations

### ViewerStateV1 (application)
`loading | ready | empty | invalid-design-system | not-found | read-error | partial`. `loading` exists only
at the adapter/UI boundary (never inside a `ViewerSessionV1`, since a session object exists only once the
load has resolved). See [Outcome mapping](#outcome-mapping-project-never-invent) below.

### ViewerSectionId (application)
`overview | colors | typography | spacing | radius | borders | shadows | motion | aliases | foundations |
assets | presets | issues | build`.

### ViewerContrastState (application)
`pass | fail | not-computable` (per [spec.md](spec.md) `Colors & contrast policy`).

### ViewerLicenseState (application)
`declared | unspecified | no-matching-asset` — the third value is Viewer-specific (Typography view only,
when no `007` font asset matches by family) and is a display state, not an `AssetLicense` field; it is
never persisted or written back to `007`'s data.

## Entities

### ViewerSessionV1 (application)
| Field | Type | Provenance |
|---|---|---|
| state | ViewerStateV1 | derived from `002`'s `AnalysisOutcome`, see mapping below |
| host | `{ initialized: boolean }` | `002` `AnalysisHost` presence |
| overview | ViewerOverviewV1 \| null | present when `state` is `ready`/`empty`/`partial` |
| navigation | ViewerNavigationV1 \| null | present when `state` is `ready`/`empty`/`partial` |
| loadedAt | never exposed | (internal only; timestamps are never in a public projection — see Exclusions) |

Invariants: exactly one `ViewerSessionV1` per session/refresh; building it invokes each reused use case at
most once (FR-003/SC-002); `overview`/`navigation` are `null` only for `not-found`/`read-error` (nothing to
project).

### Outcome mapping (project, never invent)

| Reused outcome (source) | ViewerStateV1 |
|---|---|
| `002` `AnalysisOutcome: "valid"` | `ready` (or `empty`, see below) |
| `002` `AnalysisOutcome: "complete-invalid"` | `invalid-design-system` |
| `002` `AnalysisOutcome: "partial"` | `partial` |
| `002` `AnalysisOutcome: "not-found"` | `not-found` |
| `002` `AnalysisOutcome: "read-error"` | `read-error` |
| (adapter boundary, before session promise resolves) | `loading` |
| `ready` **and** `statistics.total === 0` **and** zero assets/presets | `empty` (derived judgment, not a new Core outcome; mirrors `004`'s `FoundationCategoryState: "absent"` pattern) |

`empty` is computed by the viewer application layer from already-returned counts; it is never a value any
reused use case itself returns.

### ViewerOverviewV1 (application)
| Field | Type | Provenance |
|---|---|---|
| validation | `{ state: ViewerStateV1; errorCount: number; warningCount: number }` | `002` `ValidationReport`/`DesignSystemAnalysis.errors/warnings` |
| tokens | `{ total: number; primitive: number; semantic: number; unclassified: number }` | `004` `FoundationsSummary.tokens` |
| groups | `{ total: number }` | derived count of group nodes from `002`'s analysis (nodes with no `$value`) |
| aliases | `{ total: number; valid: number; broken: number }` | `002` `TokenNodeSummary.aliasState` tally |
| foundations | `{ categories: FoundationsSummary["categories"] }` | `004` `FoundationsSummary.categories` |
| assets | ViewerAssetsSummary | `007` `AssetsSummary` |
| presets | ViewerPresetSummaryV1 | `005` `PresetListResult` |
| issues | `{ total: number }` | sum of `ViewerIssueV1[]` (see Issues) |
| build | ViewerBuildStatusV1 | `006` build snapshot/manifest read |

Invariants: every number is a pass-through/tally of an already-computed count (FR-008/SC-003); no field
here recomputes anything `002`/`004`/`005`/`006`/`007` didn't already compute.

### ViewerNavigationV1 (application)
| Field | Type | Provenance |
|---|---|---|
| sections | `ViewerSectionSummary[]` | one entry per `ViewerSectionId`, in the fixed canonical order listed above |

`ViewerSectionSummary`: `{ id: ViewerSectionId; count: number; state: ViewerStateV1 }` — `count` is the
number of items the section would list (e.g. `foundations.categories.color` token count for `colors`); no
independent computation, always derived from the same overview/foundation counts.

### ViewerTokenV1 (application) — the shared token detail shape (FR-009)
| Field | Type | Provenance |
|---|---|---|
| path | string | `002` `TokenNodeSummary.path` |
| category | FoundationCategoryRef | `004` `FoundationTokenInspection.category` |
| level | FoundationLevel | `004` `FoundationTokenInspection.level` |
| levelSource | FoundationLevelSource | `004` `FoundationTokenInspection.levelSource` |
| declaredType | string \| null | `002` `TokenNodeSummary.declaredType` |
| effectiveType | string \| null | `002` `TokenNodeSummary.effectiveType` |
| typeOrigin | TypeOrigin | `002` `TokenNodeSummary.typeOrigin` |
| kind | NodeKind | `002` `TokenNodeSummary.kind` |
| declaredValue | safe JSON value | `006` `ResolvedTokenRecord.declaredValue` |
| resolvedValue | safe JSON value | `006` `ResolvedTokenRecord.resolvedValue` |
| immediateAliasTarget | string \| null | `006` `ResolvedTokenRecord.immediateAliasTarget` |
| aliasChain | string[] | `006` `ResolvedTokenRecord.aliasChain` |
| aliasState | AliasState | `002` `TokenNodeSummary.aliasState` |
| description | string \| null | `002` `TokenNodeSummary.description` |
| trust | NodeTrust | `002` `TokenNodeSummary.trust` |

Invariants: no field here is computed by a second pass — every value is a pass-through of the single
session's `002`/`004`/`006` projections (FR-009/SC-004).

### ViewerFoundationV1 (application) — one category (Spacing/Radius/Borders/Shadows/Motion; also the base
Foundations view)
| Field | Type | Provenance |
|---|---|---|
| id | FoundationCategoryId | `004` `FoundationCategoryInspection.id` |
| state | FoundationCategoryState | `004` `FoundationCategoryInspection.state` |
| counts | FoundationLevelCounts | `004` `FoundationCategoryInspection.counts` |
| tokens | ViewerTokenV1[] | derived per-token from `004` `FoundationCategoryInspection.tokens`, in document order |
| issues | ViewerIssueV1[] | `004` `FoundationCategoryInspection.issues`, mapped 1:1 |

### ViewerColorV1 (application) — extends the Colors view's per-token entries
| Field | Type | Provenance |
|---|---|---|
| token | ViewerTokenV1 | this entity's own color token |
| swatch | `{ resolvedValue: unknown; sRgb: { r: number; g: number; b: number } \| null }` | derived once from `resolvedValue`; `sRgb: null` when not reducible (never guessed) |
| contrast | `ViewerContrastResult \| null` | present only when the user picked a text/background pair; see below |

`ViewerContrastResult`: `{ textPath: string; backgroundPath: string; ratio: number \| null; level:
"AA-normal" | "AA-large"; state: ViewerContrastState }` — computed per the WCAG 2.1 AA policy in
[spec.md](spec.md); `ratio: null` iff `state === "not-computable"`.

### ViewerTypographyV1 (application) — extends the Typography view's per-token entries
| Field | Type | Provenance |
|---|---|---|
| token | ViewerTokenV1 | this entity's own typography token |
| family | string \| null | resolved `fontFamily`/`typography.fontFamily` sub-value |
| weight | string \| number \| null | resolved `fontWeight`/`typography.fontWeight` |
| style | string \| null | resolved `typography.fontStyle` when present in the DTCG value |
| size | unknown \| null | resolved `dimension`/`typography.fontSize` |
| lineHeight | unknown \| null | resolved `typography.lineHeight` |
| letterSpacing | unknown \| null | resolved `typography.letterSpacing` |
| linkedFontAsset | ViewerAssetV1 \| null | `007` `AssetRecord` whose `kind === "font"` and whose declared family metadata matches; `null` when no match (never inferred) |
| licenseState | ViewerLicenseState | `declared`/`unspecified` from the matched asset's `AssetLicense.status`, or `no-matching-asset` when `linkedFontAsset` is `null` |

All sub-fields are `null` when the underlying DTCG value does not declare that sub-field — never
defaulted/guessed.

### ViewerAliasV1 (application) — the Aliases view (FR-015)
| Field | Type | Provenance |
|---|---|---|
| path | string | `002` `TokenNodeSummary.path` |
| origin | `{ kind: NodeKind }` | `002` `TokenNodeSummary.kind` |
| immediateTarget | string \| null | `002` `TokenNodeSummary.aliasTarget` |
| chain | string[] | `006` `ResolvedTokenRecord.aliasChain` |
| dependents | string[] | `008` `AnalyzedTokenSource.dependentsOf(path)` |
| state | AliasState | `002` `TokenNodeSummary.aliasState` (`valid \| missing \| to-group \| cyclic \| malformed \| n/a`) |
| impactPreview | ViewerRenameMoveImpactV1 \| null | present only when the user requests it; see below |

`ViewerRenameMoveImpactV1`: `{ hypotheticalNewPath: string; wouldRewriteReferences: string[]; blocked:
boolean; blockingReason: MutationIssueCode \| null }` — sourced from a **discarded, in-memory-only**
synthetic `008` plan computation (research D7); `blocked`/`blockingReason` mirror `008`'s own
`invalid-command`/`conflict` classification (e.g. `rename-collision`) rather than a new Viewer-specific
error vocabulary.

### ViewerAssetV1 (application) — 1:1 from `007` (FR-014)
| Field | Type | Provenance |
|---|---|---|
| logicalPath | string | `007` `AssetRecord.logicalPath` |
| kind | AssetKind | `007` `AssetRecord.kind` |
| mimeType | AssetMimeType | `007` `AssetRecord.mimeType` |
| byteLength | number | `007` `AssetRecord.byteLength` |
| contentHash | string | `007` `AssetRecord.contentHash` |
| dimensions | AssetDimensions \| null | `007` `AssetRecord.dimensions` |
| provenance | AssetProvenance | `007` `AssetRecord.provenance` |
| license | AssetLicense | `007` `AssetRecord.license` |
| sanitization | SvgSanitizationPreview \| null | `007` `AssetInspection` (svg only; `null` for non-svg kinds) |
| ownership | `{ state: OwnershipState }` | `007` `AssetOwnership.state` |
| issues | ViewerIssueV1[] | `007` `AssetInspection.issues`, mapped 1:1 |

Invariants: **no raw bytes** are ever included (spec FR-006) — only metadata already public from `007`'s
own read-only results.

### ViewerIssueV1 (application) — the consolidated Issues view (FR-013)
| Field | Type | Provenance |
|---|---|---|
| source | `"validation" \| "foundations" \| "assets" \| "aliases" \| "build"` | which reused use case produced it |
| code | string | the source's own stable issue/conflict code (`AnalysisIssue.code` / `FoundationIssueCode` / `AssetIssueCode` / `AliasState` / `stale-build`) |
| path | string \| null | the source's own `path` |
| severity | `"error" \| "warning"` | the source's own severity (build staleness is always `warning`) |
| message | string | the source's own safe message |

`code: "stale-build"` (`source: "build"`) is the one Viewer-computed issue, and it is not a new domain
outcome: it is a boolean comparison of `006`'s existing recorded manifest source hash against the current
session's source hash — the same values `006` itself already stores and could compare.

### ViewerPresetSummaryV1 (application) — Overview rollup only (v1 scope, see spec.md Assumptions)
| Field | Type | Provenance |
|---|---|---|
| total | number | `005` `PresetListResult.presets.length` |
| outcome | `"success" \| "invalid-preset"` | `005` `PresetListResult.outcome` |

### ViewerBuildStatusV1 (application) — Overview rollup only
| Field | Type | Provenance |
|---|---|---|
| hasBuild | boolean | `006` previous-build-manifest presence |
| formats | BuildFormat[] | `006` manifest's recorded formats, when present |
| stale | boolean | source-hash comparison (see `ViewerIssueV1` above) |

## Relationships to existing models

- `ViewerTokenV1`/`ViewerFoundationV1`/`ViewerColorV1`/`ViewerTypographyV1` are pure projections over `002`
  `TokenNodeSummary` + `004` `FoundationTokenInspection`/`FoundationCategoryInspection` + `006`
  `ResolvedTokenRecord` — no second traversal or alias graph.
- `ViewerAliasV1` reuses `002`'s `AliasState`/`aliasTarget`, `006`'s `aliasChain`, and `008`'s
  `AnalyzedTokenSource.dependentsOf`/read-only plan shapes — no new alias-graph implementation.
- `ViewerAssetV1` is a 1:1 field mapping of `007`'s `AssetRecord`/`AssetInspection` — no second asset store
  observation, no re-detected MIME/dimensions/hash.
- `ViewerIssueV1` consolidates `002` `AnalysisIssue`, `004` `FoundationIssue`, `007` `AssetIssue`, and one
  Viewer-computed boolean (`stale-build`) derived from `006`'s existing manifest/source-hash fields — no
  second validation/conflict engine.
- `ViewerPresetSummaryV1`/`ViewerBuildStatusV1` are thin rollups of `005`/`006` results, matching the v1
  scope decision in spec.md Assumptions (deep preset/build detail views are future work, not a gap).
- Shares **nothing** with the write side of `005`/`006`/`007`/`008`: no writer port, no candidate builder,
  no apply path is ever imported by the viewer application layer.

## Exclusions (apply to every `ViewerXxxV1` contract; FR-006)

No raw asset bytes; no absolute paths, cwd, hostname, username; no internal parsed document (`unknown`
AST/DTCG document object); no `Error`/stack trace; no secrets; no filesystem timestamps/mtime/fd/inode; no
process/runtime details (PID, env vars).
