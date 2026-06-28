# Research: Design System Presets

## Decision: Package-root `presets/` catalog bundled with npm package

**Rationale**: `package.json` currently publishes only `dist`, while compiled ESM code runs from
`dist/**`. Keeping static assets at package root under `presets/` avoids relying on TypeScript to copy
JSON into `dist`; implementation will add `presets` to `package.json.files`. Runtime code can resolve
the assets relative to `import.meta.url` from compiled files and never depend on `process.cwd()`.

**Alternatives considered**:

- `src/presets/`: convenient source colocated with TS, but `tsc` does not copy JSON; requires an extra
  build-copy step and adds packaging risk.
- `dist/presets/`: matches current `files: ["dist"]`, but assets would be generated artifacts rather
  than source assets and easy to omit from source review.
- `assets/presets/`: acceptable but less direct; still requires a package `files` change.

## Decision: Envelope metadata + DTCG token block

**Rationale**: The envelope gives every preset a stable id, name, description, version and category
scope while preserving a DTCG-compatible `tokens` block. It can be validated before application and
listed without walking arbitrary token data.

**Alternatives considered**:

- Plain DTCG document: insufficient for stable catalog metadata.
- Manifest plus separate DTCG file: more files, more resolution and mismatch risk.

## Decision: Validate preset token block in memory

**Rationale**: Presets are package data, not host projects. The best fit is to parse the envelope,
validate metadata, pass `tokens` through the same pure DTCG traversal/type/alias functions used by
`002`, and then run `004` foundation metadata/category checks. This avoids materializing temporary
host files and avoids a second incompatible DTCG validator.

**Alternatives considered**:

- Materialize preset as a fake host project: expensive, filesystem-heavy, and misleading.
- Reuse `analyzeExistingDesignSystem` directly: it expects config/manifest/tokens paths and host
  presence semantics.
- Build a new DTCG validator: rejected; would drift from `002`.

## Decision: Generic change set below preset-specific wrappers

**Rationale**: Future importers (Figma/URL/image) should be able to produce candidate token changes
without depending on `PresetId`. A narrow `TokenChangeSet → ApplicationPlan` boundary is concrete and
testable; preset-specific models add catalog metadata around it.

**Alternatives considered**:

- Preset-only planner: simpler today but couples the safe merge engine to bundled presets.
- Fully generic importer plugin framework: too broad for 005 and explicitly out of scope.

## Decision: `update` is narrow and non-destructive

**Rationale**: The spec requires the diff vocabulary to include `update`, but also requires safe
merge/add-only and no overwrites. V1 resolves this by allowing `update` only to add a missing
`$description` from the preset to an otherwise equivalent existing token. All value, `$type`, alias
and foundation level differences are blocking conflicts.

**Alternatives considered**:

- Remove `update`: contradicts FR-014.
- Treat `update` as value replacement: violates safe merge and preservation.
- Add foundation metadata to existing tokens: risks changing effective levels and violates the spirit
  of add-only.

## Decision: Structural equivalence for managed fields

**Rationale**: Byte equality would make property order and numeric spelling (`1` vs `1.0`) produce
false conflicts after JSON parse. Structural equivalence of managed fields gives deterministic,
non-destructive behavior while preserving the original document bytes for unknown and unrelated
content.

**Alternatives considered**:

- Byte equality: too brittle.
- Broad semantic normalization: risks destructive rewrites and hidden behavior.

## Decision: New single-file atomic writer for preset application

**Rationale**: `commitTransaction` is designed for `init`: it stages and promotes three files that are
expected to be absent, with rollback of created files/dirs. Presets need to replace one existing file
without losing concurrent changes. Reusing the pattern is correct; reusing the implementation is not.

**Alternatives considered**:

- Reuse `commitTransaction` directly: wrong conflict model for existing target.
- Plain `writeFile`: not atomic and risks partial writes.
- Locking: unnecessary complexity; optimistic concurrency check is enough for local CLI v1.

## Decision: Verification failure reports `wrote: true`

**Rationale**: If rename succeeded but post-write analysis fails, the public result must be honest.
Automatic rollback would be another write after an uncertain state and could destroy useful evidence.
The safest v1 policy is to report `verification-error`, `wrote: true`, with sanitized details and no
further mutation.

**Alternatives considered**:

- Auto-restore original: potentially destructive and complex under concurrent filesystem changes.
- Hide failure as write-error: ambiguous and loses the distinction between persistence and validation.

## Decision: CLI group `neuraz-ds presets ...`

**Rationale**: A plural command group reads as a catalog operation and cleanly separates read-only
`plan` from write `apply`. It matches CI/headless usage better than `apply --dry-run`, and it leaves
room for list/inspect without overloading a singular command.

**Alternatives considered**:

- `neuraz-ds preset ...`: acceptable but less natural for catalog list.
- `apply --dry-run`: makes preview a flag on a write verb, weakening the safety boundary.

## Decision: Presets JSON contract is independent

**Rationale**: 003 and 004 already have isolated JSON envelopes. Presets have new commands and write
outcomes (`applied`, `unchanged`, `write-error`, `verification-error`), so they need their own DTOs,
mappers and serializer. Sharing only the low-level `JSON.stringify(envelope, null, 2) + "\n"` shape is
safe.

**Alternatives considered**:

- Extend `JsonEnvelopeV1`: breaks 003 isolation.
- Extend `FoundationsJsonEnvelopeV1`: wrong command/outcome domain.

## Decision: Preset outcomes reuse common exit meanings, not `partial`

**Rationale**: ADR-0006 already defines process-level meanings. Presets map `unchanged→2`,
`invalid-preset→3`, `conflict→4`, `not-found→5`, read/write filesystem failures→6,
verification→7, internal→70. `partial` remains an analysis concept from 002/004, not a preset command
outcome.

**Alternatives considered**:

- Reuse `partial`: ambiguous for writes and conflicts.
- New numeric exit codes: violates common table simplicity.
