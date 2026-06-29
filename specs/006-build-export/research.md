# Research: Build and Export

All decisions are resolved for planning; no `NEEDS CLARIFICATION` remains.

## 1. CSS Serialization by DTCG Type

**Decision**: CSS v1 admits `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`,
`cubicBezier`, and `number`. Composite types are rejected for CSS v1 with `unsupported-value`.

| DTCG type | CSS v1 | Representation | Reason |
|---|---:|---|---|
| `color` | yes | hex when available, otherwise deterministic `rgb()`/`rgba()` from sRGB components | Existing deep validation supports sRGB color; direct CSS value. |
| `dimension` | yes | number + unit from DTCG value object | Required by spacing/radius/sizing. |
| `fontFamily` | yes | comma-separated escaped font family list/string | Typography needs family tokens. |
| `fontWeight` | yes | number or known keyword string | CSS-native. |
| `duration` | yes | numeric value + `ms`/`s` unit | Motion primitive. |
| `cubicBezier` | yes | `cubic-bezier(n, n, n, n)` | CSS-native timing function. |
| `number` | yes | finite JSON number string | Opacity and unitless typography. |
| `strokeStyle` | no | n/a | Composite/semantic mapping is ambiguous in v1. |
| `border` | no | n/a | Composite; could require multiple CSS variables. |
| `transition` | no | n/a | Composite; aliases and ordering need separate design. |
| `shadow` | no | n/a | Composite lists are easy to misrepresent. |
| `gradient` | no | n/a | Complex CSS grammar not in scope. |
| `typography` | no | n/a | Composite; should not silently flatten. |

**Rationale**: The admitted set covers simple CSS-native primitives from the spec without inventing
lossy composite serialization.

**Alternatives considered**: Support all 13 recognized DTCG types; support only `color`.

**Rejected alternatives**: All 13 is too broad and risks incorrect CSS. Color-only would fail the
specified foundations categories such as spacing, radius, typography, opacity and motion.

**Impact**: `build` can fail with `unsupported-value` when any required CSS artifact cannot represent a
token; `export json` and `export typescript` may still succeed for JSON-safe values.

## 2. CSS Escaping

**Decision**: Implement small pure CSS serializers per value type. Custom property names are generated
by a separate typed function. String values use CSS string escaping; identifiers are emitted only after
validation.

**Rationale**: CSS escaping differs for identifiers, strings and raw numeric constructs. One helper
would be unsafe.

**Alternatives considered**: Inline escaping in the renderer; rely on raw DTCG strings.

**Rejected alternatives**: Inline escaping is hard to test exhaustively. Raw strings can break CSS or
allow malformed declarations.

**Impact**: Unit tests must cover quotes, backslashes, control characters, non-ASCII, `</style>`,
newline, invalid units and invalid identifiers.

## 3. CSS Naming and Collisions

**Decision**: `tokenPathToCssCustomPropertyName(path)` transforms segments to one custom property name
without locale folding, then a global collision map validates uniqueness before bytes are produced.

**Rationale**: The spec requires segment joining with `-` and collision detection, not silent
resolution.

**Alternatives considered**: Prefix every variable; append hashes to collisions.

**Rejected alternatives**: Prefixes are out of scope. Hash suffixes hide source ambiguity and produce
surprising public names.

**Impact**: `foo.bar-baz` and `foo-bar.baz` are a blocking `css-name-collision`. The error reports both
logical paths and the generated name, no absolute paths.

## 4. TypeScript Serialization Safety

**Decision**: Emit flat records using a TS-safe JSON literal serializer based on `JSON.stringify`,
quoted keys, `as const`, and post-processing for U+2028/U+2029 and `</script>`-safe text. No imports.

**Rationale**: JSON-safe values are a subset of TS literals and the flat shape avoids object nesting
collisions between token paths.

**Alternatives considered**: Handwritten TS AST printer; nested token objects.

**Rejected alternatives**: An AST printer is unnecessary without a dependency. Nested objects can
collide structurally and diverge from `ResolvedTokensV1`.

**Impact**: TS output stays deterministic and portable; `TokenPath = keyof typeof tokens` is exact.

## 5. TypeScript Validation without Execution

**Decision**: Use the existing `typescript` dependency in tests/infrastructure verification for syntax
diagnostics, e.g. `transpileModule`/compiler API or `tsc --noEmit` in integration. Never `eval`,
dynamic import, or execute generated TS.

**Rationale**: The package already depends on TypeScript for build/dev; syntax can be checked without
runtime side effects.

**Alternatives considered**: Dynamic import generated file; add parser dependency.

**Rejected alternatives**: Importing executes module code and violates FR-028/FR-063. A new parser
dependency is not justified.

**Impact**: Verification focuses on syntax, expected exports and absence of imports.

## 6. Hashing

**Decision**: SHA-256 lowercase hexadecimal over exact bytes. `sourceHash` hashes exact source bytes;
`contentHash` hashes exact artifact bytes after serialization.

**Rationale**: Existing preset writer already uses SHA-256; byte hashing is deterministic and avoids
object-order ambiguity.

**Alternatives considered**: Hash parsed JS objects; include timestamp/package environment.

**Rejected alternatives**: Object hashing is undefined until serialization. Environment data violates
determinism.

**Impact**: All hash tests compare encoded bytes, not in-memory objects.

## 7. Directory Publication Strategy

**Decision**: Use sibling staging, managed-file backup, optimistic snapshot re-check, per-file publish
and post-publication verification. Do not replace the whole `build/` directory.

**Rationale**: Whole-directory replacement conflicts with unknown-file preservation. A file-set writer
can replace only managed paths and leave unknown files untouched.

**Alternatives considered**: Atomic directory replacement; staging sibling + directory rename; backup +
rename; per-file journal; versioned directories + pointer; lockfile only.

**Rejected alternatives**: Directory replacement loses unknown files. Directory rename cannot merge
unknown files. Pointer directories are a larger product change. Locks alone do not protect external
edits.

**Impact**: The writer must honestly document that multi-file atomicity is best-effort by filesystem
capabilities, backed by verification and backup.

## 8. POSIX and Windows Rename Behavior

**Decision**: Stage in the same parent/volume and use rename only for individual files after
preconditions are rechecked. Treat rename failure as `write-error`, preserve prior output where
possible, and verify after success.

**Rationale**: Same-volume file rename is the strongest common primitive; directory replacement
semantics differ across platforms, especially when targets exist.

**Alternatives considered**: Cross-volume temp dir; non-empty directory rename.

**Rejected alternatives**: Cross-volume rename can fail or copy. Non-empty directory replacement is not
portable.

**Impact**: Tests inject rename failures and permissions rather than assuming OS-specific behavior.

## 9. Unknown File Preservation

**Decision**: Preserve unknown files always. Unknown means "not declared by a supported previous
manifest." Required path occupied by unknown file/directory blocks with `conflict`.

**Rationale**: Constitution XIV prohibits overwriting unknown files silently.

**Alternatives considered**: Clean build directory; trust fixed names as managed.

**Rejected alternatives**: Cleaning deletes user files. Fixed-name trust cannot distinguish manual
files from prior generated files when manifest is absent/corrupt.

**Impact**: First build with pre-existing `tokens.css` and no trusted manifest returns conflict.

## 10. Manifest Ownership

**Decision**: `manifest.json` is the only ownership authority for existing artifacts. Unsupported or
corrupt manifest is untrusted, not repaired during build.

**Rationale**: Ownership by manifest is auditable and deterministic.

**Alternatives considered**: Infer ownership from file names/hashes; overwrite known filenames.

**Rejected alternatives**: Inference can overwrite user-created files.

**Impact**: Manifest parsing/compatibility gets dedicated tests and public conflicts.

## 11. Optimistic Concurrency

**Decision**: Snapshot source, manifest, managed artifacts, required path node kinds and symlink state;
re-read/recheck immediately before publish. Any mismatch returns `conflict`, `wrote:false`.

**Rationale**: The CLI is local and short-lived; optimistic concurrency matches 005 without adding
complex locks.

**Alternatives considered**: Lockfiles; mtime-only checks.

**Rejected alternatives**: Lockfiles are advisory and not enough alone. Mtime/size can miss changes.

**Impact**: Tests need injected changes between render and publish.

## 12. Staging and fsync

**Decision**: Stage below the same parent as `build/`, write with exclusive creation, verify bytes, and
use fsync where Node/platform APIs permit without making fsync failure indistinguishable from content
failure. Cleanup is best-effort and reported internally.

**Rationale**: Same-parent staging maximizes rename safety and avoids cross-device moves.

**Alternatives considered**: OS temp dir; in-place writes.

**Rejected alternatives**: OS temp may be cross-volume. In-place writes can expose partial bytes.

**Impact**: Staging directories must never be public artifact paths and must be removed on success and
expected pre-publish failures.

## 13. Backup

**Decision**: Backup only previously managed files before replacement; remove backup after successful
post-verification; retain backup on `verification-error` and expose only a relative path.

**Rationale**: Mirrors 005's honest recovery model while avoiding destructive rollback.

**Alternatives considered**: No backup; automatic rollback.

**Rejected alternatives**: No backup weakens recovery. Rollback is another destructive write after an
already suspicious state.

**Impact**: `verification-error` has `wrote:true` and retained backup.

## 14. Verification Error

**Decision**: A failure after publish is `verification-error`, not `write-error`, because bytes may have
changed on disk. It reports safe diagnostics, retains backup and avoids rollback.

**Rationale**: The user needs a truthful state report.

**Alternatives considered**: Treat as internal error; rollback automatically.

**Rejected alternatives**: Internal error hides the disk state. Rollback can worsen corruption.

**Impact**: CLI exits 7 and JSON includes verification and backup fields.

## 15. Limits

**Decision**: Reuse analysis limits for input. Add artifact limits only where tied to existing values:
max token/path lengths from `ANALYSIS_LIMITS`, max issues from `ANALYSIS_LIMITS.maxIssues`, and a
candidate byte budget derived from `maxTotalBytes` unless implementation evidence shows a need for a
smaller documented cap.

**Rationale**: Avoid arbitrary product limits while preventing unbounded buffers.

**Alternatives considered**: No artifact caps; fixed small caps.

**Rejected alternatives**: No caps risks memory pressure. Small arbitrary caps surprise users.

**Impact**: Any cap produces deterministic typed errors and zero writes.

## 16. Deterministic Output

**Decision**: Use one canonical comparator: foundation category order, then parent-before-child token
path order, then bytewise code point comparison for non-foundation paths. Do not use locale-dependent
`localeCompare`.

**Rationale**: The spec requires machine-independent bytes.

**Alternatives considered**: Preserve source insertion order only; `localeCompare`.

**Rejected alternatives**: Source order can vary for equivalent inputs. Locale collation can drift.

**Impact**: Renderers consume already ordered tokens; serializers keep contractual property order.

## 17. Reusing the 005 Writer

**Decision**: Reuse 005 writer concepts and tests patterns, not the concrete `SingleFileAtomicWriter`
interface. Extract or duplicate small path-safety/hash helpers only if doing so reduces duplication
without coupling directory-set publishing to preset application.

**Rationale**: 005 replaces one existing file; 006 publishes multiple files while preserving unknowns.

**Alternatives considered**: Reuse `createSingleFileAtomicWriter` for each artifact; create one generic
writer immediately.

**Rejected alternatives**: Per-artifact writer cannot coordinate all-or-nothing set semantics. A broad
generic writer before 006 needs are proven risks over-abstraction.

**Impact**: `ArtifactSetWriter` is a new port with its own contract.

## 18. Package-Installed Behavior

**Decision**: Do not use external templates/assets in v1. Renderers generate bytes in code, so
`package.json.files` should not need changes beyond existing `dist` coverage.

**Rationale**: Package-installed failures in 005 centered on static assets; avoiding templates reduces
that class of bug.

**Alternatives considered**: Ship template files; resolve templates by cwd.

**Rejected alternatives**: Templates require packaging entries and `import.meta.url` resolution. Cwd
resolution breaks installed package behavior.

**Impact**: Tarball smoke still required to prove `build`/`export` work from installed package and
foreign cwd.
