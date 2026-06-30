# Data Model — Asset Manager (Phase 1)

Conceptual entities, fields, invariants, layer and relationship to existing models. No implementation.
Null policy: stable-but-absent → `null`; empty collection → `[]`; empty record → `{}`; never `undefined`.
All paths are logical and relative; no absolute paths, cwd, hostname or timestamps in persisted/public
shapes.

## Enumerations

### AssetKind (domain)
`font | logo | svg | icon | image`. Closed set (FR-001).

### AssetMimeType (domain)
Closed v1 families:
- font: `font/woff2`, `font/woff`, `font/ttf`, `font/otf`
- raster image: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/avif`
- vector: `image/svg+xml`

`icon`/`logo` may carry an SVG or a supported raster MIME; `font` only font MIMEs; `image` only raster.

### ImportVerdict (domain)
`add | duplicate | blocked`.

### ProvenanceKind (domain)
`local-import` (only value in v1).

### AssetOutcome (domain)
`listed | inspected | planned | applied | unchanged | removed | invalid-asset-store |
unsupported-asset | conflict | not-found | read-error | write-error | verification-error`.
`internal-error` is adapter-only (never in the domain).

## Entities

### AssetDimensions (domain)
| Field | Type | Notes |
|---|---|---|
| width | number \| null | pixels (raster) or declared/viewBox unit (svg); null if undeterminable |
| height | number \| null | as above |
| unit | "px" \| "user" \| null | `px` raster, `user` for SVG user units, null when unknown |

Invariants: never guessed; both null when the format does not declare a size.

### AssetProvenance (domain)
| Field | Type | Notes |
|---|---|---|
| kind | ProvenanceKind | `local-import` |
| sourceRef | string | safe, relative reference to the import source (no absolute path) |

### AssetLicense (domain)
| Field | Type | Notes |
|---|---|---|
| status | "declared" \| "unspecified" | `declared` only when explicitly supplied (FR-018) |
| identifier | string \| null | e.g. SPDX-like id, or null |
| notice | string \| null | short license notice/attribution, or null |

Invariants: `unspecified` ⇒ identifier and notice are null; the system never sets `declared` without an
explicit value.

### AssetRecord (domain) — a manifest entry
| Field | Type | Notes |
|---|---|---|
| logicalPath | string | relative under `design-system/assets/…`, safe (no traversal/absolute) |
| kind | AssetKind | |
| mimeType | AssetMimeType | content-derived |
| byteLength | number | exact size, ≥ 0 |
| contentHash | string | SHA-256 lowercase hex (64 chars) |
| dimensions | AssetDimensions \| null | null for fonts; populated for raster/svg when known |
| provenance | AssetProvenance | |
| license | AssetLicense | |

Invariants: immutable; logicalPath unique within the manifest; contentHash matches the stored bytes.

### AssetManifestV1 (domain) — ownership authority
| Field | Type | Notes |
|---|---|---|
| formatVersion | "1.0.0" | first key |
| assets | AssetRecord[] | deterministic order (by kind, then logicalPath, bytewise) |

Invariants: deterministic bytes for identical content; no duplicate logicalPaths; no
timestamps/cwd/absolute paths. A missing manifest = valid empty asset set; a corrupt/untrusted manifest
= blocking conflict (FR-034). Relationship: analogous in role to `BuildManifestV1` (`006`) but a distinct
contract; never shares a file with tokens or the host manifest.

### SvgSanitizationReport (domain)
| Field | Type | Notes |
|---|---|---|
| safe | boolean | true if the sanitized result is well-formed, safe SVG |
| removed | string[] | stable codes of stripped constructs (`script`, `event-handler`, `external-ref`, `foreign-object`, `doctype`, …) |
| reason | string \| null | why blocked when `safe:false` |

Invariants: sanitized bytes contain none of the removed active constructs; never executes SVG.

### ImportCandidate (application)
| Field | Type | Notes |
|---|---|---|
| sourceRef | string | safe relative source reference |
| kind | AssetKind \| null | null when undeterminable (→ blocked) |
| destinationPath | string \| null | proposed logical path, or null when blocked |
| mimeType | AssetMimeType \| null | content-derived |
| byteLength | number | exact source size |
| contentHash | string | SHA-256 of source bytes |
| dimensions | AssetDimensions \| null | |
| verdict | ImportVerdict | `add` / `duplicate` / `blocked` |
| duplicateOf | string \| null | logicalPath of the existing asset when `duplicate` |
| license | AssetLicense | reflects supplied metadata; `unspecified` when none |
| validation | { ok: boolean; code: string \| null; message: string \| null } | font/MIME/size/path validation |
| sanitization | SvgSanitizationReport \| null | present only for SVG inputs |
| issues | AssetIssue[] | stable, ordered reasons (esp. for `blocked`) |

Invariants: pure projection over the source bytes + manifest; computing a candidate writes nothing.

### ImportPlan (application)
| Field | Type | Notes |
|---|---|---|
| candidates | ImportCandidate[] | deterministic order following input order then logicalPath |
| summary | { add: number; duplicate: number; blocked: number } | counts |

### AssetIssue (domain)
| Field | Type | Notes |
|---|---|---|
| code | string | stable (`unsupported-mime`, `font-invalid`, `svg-unsafe`, `path-unsafe`, `too-large`, `license-required`, `owned-by-unknown`, `untrusted-asset-manifest`, `source-modified`, …) |
| path | string \| null | logical path or null (global) |
| severity | "error" \| "warning" | |
| message | string | safe, no absolute paths |
| blocksWrite | boolean | |

### AssetRecoveryState (domain)
| Field | Type | Notes |
|---|---|---|
| storeAvailable | boolean | the asset store remains usable |
| backupRelativePath | string \| null | retained backup (relative) or null |
| recoveryRequired | boolean | manual recovery needed |

Mirrors `BuildRecoveryState` semantics: write-error-before-move ⇒ available/no-backup/no-recovery;
catastrophic restore failure ⇒ unavailable/backup-retained/recovery; post-publication verification
failure ⇒ available/backup-retained/recovery, no auto rollback.

### AssetInspection / AssetsSummary (application)
- **AssetInspection**: one `AssetRecord` plus ownership state and any issues.
- **AssetsSummary**: totals — count by kind, total byteLength, number of assets, deterministic ordering;
  no recomputation of token statistics.

### AssetOperationResult (domain/application)
Discriminated by `outcome` (AssetOutcome). Common fields: `outcome`, `wrote` (boolean), `storeAvailable`
(boolean | null), `recovery` (AssetRecoveryState | null), `manifestSummary`
(`{ relativePath; contentHash; byteLength } | null`), `assets`/`candidates`/`inspection` as applicable,
`conflicts` (AssetIssue[]), `error` (SafeAssetError | null). Mapped to exit codes only at the adapter
boundary.

### SafeAssetError (domain)
`{ code: string; message: string; path: string | null; details: Record<string, unknown> | null }` —
never `Error`, stack, absolute path or secrets.

## Outcome → exit code mapping (shared with 001–006)

| Outcome | Exit |
|---|---:|
| listed / inspected / planned / applied / removed | 0 |
| unchanged | 2 |
| invalid-asset-store | 3 |
| unsupported-asset / conflict | 4 |
| not-found | 5 |
| read-error / write-error | 6 |
| verification-error | 7 |
| internal-error (adapter only) | 70 |

## Relationships to existing models

- Reuses the **hashing** primitive (SHA-256) and the **transactional/recovery** and **ownership** shapes
  proven in `005`/`006`, as independent asset-side analogues (no import of token/build code).
- Reuses the **outcome/exit-code** vocabulary of `001`–`006` (FR-029).
- Shares **nothing** with `NormalizedTokenSet`, `BuildManifestV1`, foundations or the host manifest.
