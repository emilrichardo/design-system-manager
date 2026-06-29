# Research: Build and Export

All decisions are resolved for planning; no open clarification markers remain.

## 1. CSS Serialization by DTCG Type

**Decision**: CSS v1 is conservative. A type is supported only when the current analyzer-admitted value
shape gives enough information to serialize exact, deterministic CSS bytes. Unsupported CSS values
return `unsupported-value` with `format: "css"`, `tokenPath`, effective `type`, stable code, and
`wrote:false`; no partial CSS is emitted.

Classes:

- `SUPPORTED`: accepted whenever the runtime shape below matches.
- `CONDITIONALLY_SUPPORTED`: accepted only for the listed shape/restrictions.
- `UNSUPPORTED_IN_CSS_V1`: rejected even if JSON/TS can represent the value.

| DTCG type | CSS v1 class | Runtime shape admitted for CSS | Restrictions | Exact output | Example | Error when rejected |
|---|---|---|---|---|---|---|
| `color` | `CONDITIONALLY_SUPPORTED` | object `{ colorSpace: "srgb", components: [n,n,n], hex?: "#RRGGBB", alpha?: n }` accepted by current deep analyzer | v1 CSS supports only `hex` present and `alpha` absent or `1`; other analyzer-valid color objects are valid DS but not CSS v1 | lowercase `#rrggbb` | `#0066ff` | `css-color-unsupported-shape` |
| `dimension` | `CONDITIONALLY_SUPPORTED` | object `{ value: finite number, unit: "px" | "rem" | "em" | "%" }` | no whitespace in unit, exact lowercase units, finite value only | `<number><unit>` | `16px` | `css-dimension-unsupported-shape` |
| `number` | `SUPPORTED` | finite JSON number | `NaN`/infinity impossible in JSON but still rejected defensively; `-0` -> `0`; decimal `.`; no locale; no scientific output | shortest stable decimal without locale | `0.875` | `css-number-invalid` |
| `string` | `CONDITIONALLY_SUPPORTED` | string value with effective type `string` when admitted by future analyzer evolution | double-quoted CSS string; names are not escaped | escaped string | `"Primary"` | `css-string-unsupported-type` |
| `boolean` | `UNSUPPORTED_IN_CSS_V1` | any boolean | CSS has no unambiguous design-token boolean scalar | n/a | n/a | `css-boolean-unsupported` |
| `fontFamily` | `CONDITIONALLY_SUPPORTED` | nonempty string or nonempty string array | exact generic keywords `serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`, `system-ui` may be unquoted; all other families use CSS string escaping | comma+space joined family list | `"Inter", system-ui` | `css-font-family-unsupported-shape` |
| `fontWeight` | `CONDITIONALLY_SUPPORTED` | finite integer `1..1000` or string `normal`/`bold` | no other keywords in v1 | number or keyword | `700` | `css-font-weight-unsupported-shape` |
| `duration` | `CONDITIONALLY_SUPPORTED` | object `{ value: finite number, unit: "ms" | "s" }` | exact lowercase units, no whitespace | `<number><unit>` | `120ms` | `css-duration-unsupported-shape` |
| `cubicBezier` | `CONDITIONALLY_SUPPORTED` | array `[x1, y1, x2, y2]` finite numbers | `x1` and `x2` in `0..1`; `y1`/`y2` finite | `cubic-bezier(a, b, c, d)` | `cubic-bezier(0.4, 0, 0.2, 1)` | `css-cubic-bezier-unsupported-shape` |
| `strokeStyle` | `UNSUPPORTED_IN_CSS_V1` | any | Composite/semantic mapping is ambiguous in v1 | n/a | n/a | `css-type-unsupported` |
| `border` | `UNSUPPORTED_IN_CSS_V1` | any | Composite; could require multiple declarations | n/a | n/a | `css-type-unsupported` |
| `transition` | `UNSUPPORTED_IN_CSS_V1` | any | Composite ordering/alias semantics need separate design | n/a | n/a | `css-type-unsupported` |
| `shadow` | `UNSUPPORTED_IN_CSS_V1` | any | Composite lists are easy to misrepresent | n/a | n/a | `css-type-unsupported` |
| `gradient` | `UNSUPPORTED_IN_CSS_V1` | any | Complex CSS grammar not in scope | n/a | n/a | `css-type-unsupported` |
| `typography` | `UNSUPPORTED_IN_CSS_V1` | any | Composite; should not silently flatten | n/a | n/a | `css-type-unsupported` |

**Rationale**: The current analyzer deeply validates only sRGB color objects. Other primitive-ish DTCG
types are admitted only when a simple runtime shape can be checked locally without inventing composite
conversions. Composites stay unsupported to avoid lossy output.

**Alternatives considered**: Support all recognized DTCG types; support only color; invent full CSS
grammars for composites.

**Rejected alternatives**: All recognized types is too broad and risks incorrect CSS. Color-only would
make common spacing/typography/motion primitives unusable. Composite grammars need a separate product
contract.

**Impact**: `build` can fail with `unsupported-value` when CSS cannot represent a token; `export json`
and `export typescript` may still succeed for JSON-safe values.

## 2. CSS Escaping

**Decision**: Implement small pure CSS serializers per value type. Custom property names are generated
by a separate validator and are never escaped in v1. String values use double quotes and escape `\`,
`"`, LF, CR, form feed, NULL, C0 controls and DEL. Hex escapes use a trailing space terminator where a
following hex digit could be consumed.

Examples:

| Source string | CSS string bytes |
|---|---|
| `A "quote"` | `"A \"quote\""` |
| `line\nbreak` | `"line\A break"` |
| `nul\u0000x` | `"nul\0 x"` |
| `tab\t9` | `"tab\9 9"` |

Numeric serialization uses finite numbers only, decimal `.` only, no locale, no `toLocaleString`;
`-0` serializes as `0` and scientific notation is not emitted.

**Rationale**: CSS escaping differs for identifiers, strings and raw numeric constructs. Validating the
identifier subset and escaping only values keeps public names predictable and testable.

**Alternatives considered**: Inline escaping in the renderer; rely on raw DTCG strings; use CSS
identifier escaping for token paths.

**Rejected alternatives**: Inline escaping is hard to test exhaustively. Raw strings can break CSS or
allow malformed declarations. Identifier escaping would create surprising public names and collision
rules; v1 rejects invalid names instead.

**Impact**: Unit tests must cover quotes, backslashes, control characters, invalid units, invalid
identifiers and finite-number formatting.

## 3. CSS Naming, Aliases and Collisions

**Decision**: `tokenPathToCssCustomPropertyName(path)` transforms segments to one custom property name
exactly as `"--" + segments.join("-")`. A segment is nonempty and must match
`^[A-Za-z0-9_][A-Za-z0-9_-]*$`. Case is preserved; there is no lowercasing, Unicode normalization,
identifier escaping or configurable prefix. Dots are only token path separators.

**Collision rule**: Build a global map of transformed names to source paths before bytes are produced.
`foo.bar-baz` and `foo-bar.baz` both become `--foo-bar-baz` and therefore return
`unsupported-value` / `css-name-collision`.

**Alias rule**: CSS aliases emit `var(--<immediate-alias-target>)`. For
`semantic.a -> semantic.b -> primitive.c`, CSS can emit `--semantic-a: var(--semantic-b);` and
`--semantic-b: var(--primitive-c);`. Every target in the chain must exist, be a token, have a valid CSS
name, generate a declaration and be type-compatible. Otherwise CSS returns `unsupported-value` with a
stable alias code such as `css-alias-target-unrenderable`; it never falls back silently to the final
resolved value.

**Rationale**: The spec requires segment joining with `-`, collision detection, and alias preservation
without surprising public names.

**Alternatives considered**: Prefix every variable; append hashes to collisions; inline final resolved
values for invalid alias targets.

**Rejected alternatives**: Prefixes are out of scope. Hash suffixes hide source ambiguity. Inlining on
alias failure hides a source/rendering problem and weakens design-token semantics.

**Impact**: Name and alias validation happen before CSS serialization; errors report logical paths and
generated names only, no absolute paths.

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

**Decision**: SHA-256 lowercase hexadecimal over exact bytes. `sourceHash` hashes the exact raw bytes
from the initial semantic source snapshot; the optional pre-publish source reread for build hashes
current raw bytes only for comparison. `contentHash` hashes exact artifact bytes after serialization.

**Rationale**: Existing preset writer already uses SHA-256; byte hashing is deterministic and avoids
object-order ambiguity.

**Alternatives considered**: Hash parsed JS objects; include timestamp/package environment.

**Rejected alternatives**: Object hashing is undefined until serialization. Environment data violates
determinism.

**Impact**: All hash tests compare encoded bytes, not in-memory objects.

## 7. Directory Publication Strategy

**Decision**: Use set-consistent transactional publication with a complete candidate directory. The
writer inspects existing `build/`, validates ownership, classifies managed/unknown nodes, creates a
sibling staging directory, securely copies allowed unknown regular files/directories into it, writes
all new managed artifacts and the new build manifest there, verifies staging, revalidates concurrency,
then publishes the candidate directory as a set by renaming prior `build/` to backup and staging to
`build/`.

**Rationale**: Artifact-by-artifact publication can expose mixed managed sets. A complete candidate
directory lets the future `design-system/build/` be verified before it becomes visible while preserving
allowed unknown files.

**Alternatives considered**: Artifact-by-artifact managed-file publish; atomic directory replacement;
versioned directories + pointer; lockfile only.

**Rejected alternatives**: Artifact-by-artifact publication violates set consistency. Blind directory
replacement loses unknown files. Pointer directories are a larger product change. Locks alone do not
protect external edits.

**Impact**: Valid states are complete prior directory, complete candidate directory, or prior directory
temporarily moved with a full backup retained. A mixed managed artifact set is forbidden. The plan does
not promise absolute atomicity on every filesystem.

## 8. POSIX and Windows Rename Behavior

**Decision**: Stage and backup under the same parent/volume. POSIX flow uses sibling directory renames,
with the known limitation that replacing a non-empty directory requires two renames and may create a
short availability window. Windows flow expects open directories/files, antivirus scanners and handles
to block rename; it uses bounded retry, restoration before commit where possible, and retained backup
with recovery metadata when restoration fails.

**Rationale**: Same-volume sibling rename is the strongest shared primitive, but it is not a portable
cross-platform transaction. The contract must describe recovery states honestly.

**Alternatives considered**: Cross-volume temp dir; assume non-empty directory replacement; hide rename
failure as unchanged.

**Rejected alternatives**: Cross-volume rename can fail or copy. Non-empty replacement semantics vary by
platform. Reporting unchanged after a failed restore would be false.

**Impact**: Tests inject rename failure, open-handle failure, restore success/failure and permissions
rather than assuming OS-specific behavior.

## 9. Unknown File Preservation

**Decision**: Preserve unknown nodes only when they are regular files or regular directories, contained
under `design-system/build/`, within documented count/depth/byte limits, and copyable byte-for-byte.
The writer never follows symlinks, assumes hard-link safety, executes files or accepts sockets, FIFOs,
devices, special node kinds or path escapes. Unsupported unknown nodes block with `conflict` /
`unsupported-unknown-node`; unknown occupancy of a required path blocks with
`required-path-owned-by-unknown`.

Limits reuse repo limits when available: unknown file count <= `ANALYSIS_LIMITS.maxNodes`, directory
depth <= `ANALYSIS_LIMITS.maxDepth`, total copied bytes <= `ANALYSIS_LIMITS.maxTotalBytes` if present
in the limit set, and per-file size <= the same byte budget. If the repo lacks a byte limit, the future
task must add a named 006 limit in the same domain limit style before implementation.

**Rationale**: Constitution XIV prohibits overwriting unknown files silently, but copying arbitrary
filesystem nodes into a candidate directory would be unsafe.

**Alternatives considered**: Clean build directory; trust fixed names as managed; preserve every node
kind.

**Rejected alternatives**: Cleaning deletes user files. Fixed-name trust cannot distinguish manual
files from prior generated files when build manifest is absent/corrupt. Preserving every node kind
introduces link/device/special-file risks.

**Impact**: First build with pre-existing `tokens.css` and no trusted build manifest returns
`required-path-owned-by-unknown`; allowed notes or subdirectories survive through candidate copy.

## 10. Manifest Ownership

**Decision**: The previous build manifest (`design-system/build/manifest.json`) is the only ownership
authority for generated artifacts. The Design System host manifest (`design-system/design-system.json`)
only proves the project is initialized and is never used for artifact ownership. Unsupported or corrupt
build manifest is untrusted and not repaired during build.

**Rationale**: Ownership by manifest is auditable and deterministic.

**Alternatives considered**: Infer ownership from file names/hashes; overwrite known filenames.

**Rejected alternatives**: Inference can overwrite user-created files.

**Impact**: Build manifest parsing/compatibility gets dedicated tests and public conflicts:
`untrusted-build-manifest`, `managed-artifact-modified`, `managed-artifact-missing` and
`required-path-owned-by-unknown`.

## 11. Optimistic Concurrency

**Decision**: The initial semantic read produces `sourceHash` from exact raw bytes. Immediately before
publication, `build` may perform one byte-only source reread, hash it, and compare it to `sourceHash`.
It also rechecks previous build manifest, managed artifacts, required path node kinds and symlink
state. Any mismatch returns `conflict`, `wrote:false`; source mismatch subtype is `source-modified`.
The reread never decodes, parses, analyzes, rebuilds aliases, projects foundations or renders.

**Rationale**: The CLI is local and short-lived; optimistic byte concurrency matches 005 without adding
complex locks while preserving the one semantic read guarantee.

**Alternatives considered**: Lockfiles; mtime-only checks.

**Rejected alternatives**: Lockfiles are advisory and not enough alone. Mtime/size can miss changes.

**Impact**: Tests need injected changes between render and publish and spies proving no second semantic
analysis occurs.

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

**Decision**: Backup the complete previous build directory before the commit point. Remove backup after
successful post-verification. Retain backup on `verification-error`, catastrophic restore failure, or
any state where recovery is required, exposing only a relative path.

**Rationale**: The publication unit is now the directory set, so recovery must preserve the whole prior
set, including unknown nodes.

**Alternatives considered**: No backup; backup only managed files; automatic rollback after commit.

**Rejected alternatives**: No backup weakens recovery. Managed-only backup cannot restore unknown
preservation. Rollback after commit is another destructive write after an already suspicious state.

**Impact**: `verification-error` has `wrote:true`, `outputAvailable:true`, retained backup and
`recoveryRequired:true`; catastrophic restore failure has `write-error`, `wrote:false`,
`outputAvailable:false`, retained backup and `recoveryRequired:true`.

## 14. Verification Error

**Decision**: A failure after the candidate directory becomes `build/` is `verification-error`, not
`write-error`, because the commit point has passed and bytes may have changed on disk. It reports safe
diagnostics, sets `wrote:true`, `outputAvailable:true`, retains backup and avoids rollback.

**Rationale**: The user needs a truthful state report.

**Alternatives considered**: Treat as internal error; rollback automatically.

**Rejected alternatives**: Internal error hides the disk state. Rollback can worsen corruption.

**Impact**: CLI exits 7 and JSON includes verification, `backupRelativePath`, `outputAvailable:true`
and `recoveryRequired:true`.

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

**Rejected alternatives**: Per-artifact writer cannot coordinate set-consistent publication semantics. A broad
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
