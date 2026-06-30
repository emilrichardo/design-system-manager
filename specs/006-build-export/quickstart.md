# Quickstart: Build and Export

This document describes the reproducible `build`/`export` flow now implemented by `006-build-export`,
with its outcomes and exit codes. The commands `neuraz-ds build`, `neuraz-ds build --json` and
`neuraz-ds export css|json|typescript` are available from the installed package.

## Prerequisites

- Node `>=22`.
- A project with `@neuraz/design-system-manager` installed.
- A local Design System initialized with `design-system/tokens/base.tokens.json`.

## Reproducible Flow

```bash
neuraz-ds init                      # crea el Design System local (interactivo)
neuraz-ds presets apply neutral-base # opcional: añade tokens de un preset
neuraz-ds build                     # → built / exit 0 (primera vez)
neuraz-ds build                     # → unchanged / exit 2 (idempotente)
neuraz-ds build --json              # un BuildJsonEnvelopeV1 a stdout
neuraz-ds export css                # bytes de tokens.css a stdout (read-only)
neuraz-ds export json               # bytes de tokens.resolved.json
neuraz-ds export typescript         # bytes de tokens.ts
```

## Outcomes and Exit Codes

| Command | Outcome | Exit |
|---|---|---:|
| `build` | `built` | 0 |
| `build` | `unchanged` | 2 |
| `build` | `invalid-design-system` | 3 |
| `build` | `unsupported-value` / `conflict` | 4 |
| `build` | `not-found` | 5 |
| `build` | `read-error` / `write-error` | 6 |
| `build` | `verification-error` | 7 |
| `export` | `exported` | 0 |
| `export` | `invalid-design-system` | 3 |
| `export` | `unsupported-value` | 4 |
| `export` | `not-found` | 5 |
| `export` | `read-error` | 6 |

## First Build

```bash
neuraz-ds build
```

Behavior:

- Performs one semantic read of `design-system/tokens/base.tokens.json`: raw bytes, UTF-8 decode,
  JSON parse, DTCG analysis, alias graph, type resolution and foundation projection happen once.
- Validates through the reused `002`/`004` analysis and foundation projection.
- Creates `design-system/build/` when absent.
- Writes:
  - `design-system/build/tokens.css`
  - `design-system/build/tokens.resolved.json`
  - `design-system/build/tokens.ts`
  - `design-system/build/manifest.json`
- Reports outcome `built`, `wrote:true`, exit `0`.
- Leaves `design-system/tokens/base.tokens.json`, `neuraz-ds.config.json`, and
  `design-system/design-system.json` unchanged.
- Immediately before publishing, build may reread only the source bytes to compare SHA-256 with the
  initial `sourceHash`; it does not parse or analyze a second time.

## Second Build

Planned command:

```bash
neuraz-ds build
```

Expected behavior when source and managed artifacts are unchanged:

- Reports `unchanged`, `wrote:false`, exit `2`.
- Creates no staging directory, backup, rename, or write.
- Leaves artifact bytes and mtimes intact.

## Machine-Readable Build

Planned command:

```bash
neuraz-ds build --json
```

Expected behavior:

- stdout is exactly one `BuildJsonEnvelopeV1`.
- stderr is empty for expected outcomes.
- JSON contains logical paths and hashes, no absolute paths or stacks.

## Export CSS

Planned command:

```bash
neuraz-ds export css > tokens.css
```

Expected behavior:

- stdout is exact CSS artifact bytes.
- stderr is empty on success.
- No `design-system/build/` directory is created or modified.
- No build manifest, staging, backup or mtime change occurs.

## Export Resolved JSON

Planned command:

```bash
neuraz-ds export json > tokens.resolved.json
```

Expected behavior:

- stdout parses as `ResolvedTokensV1`.
- Bytes equal the JSON artifact that `build` would write.
- This is not `--json`; it is the generated JSON artifact.

## Export TypeScript

Planned command:

```bash
neuraz-ds export typescript > tokens.ts
```

Expected behavior:

- stdout is a standalone TypeScript module.
- It exports `tokens`, `tokenMetadata`, and `TokenPath`.
- It imports nothing and does not depend on the manager at runtime.

## Conflicts and Unknown Files

Unknown files under `design-system/build/` are preserved. Example:

```text
design-system/build/notes.txt
```

remains untouched after build.

If an unknown file or directory occupies a required artifact path such as
`design-system/build/tokens.css`, build returns `conflict`, `wrote:false`, exit `4`.

The Design System host manifest is `design-system/design-system.json`; the build manifest is
`design-system/build/manifest.json`.

If the build manifest is missing and no required artifact paths exist, first build is allowed. If the
build manifest is missing while required artifact paths exist, those paths are unknown and block with
`required-path-owned-by-unknown`. Corrupt or unsupported build manifest blocks with
`untrusted-build-manifest`; it is not treated as "project not initialized".

Unknown regular files/directories are copied into the candidate directory when contained and within
limits. Symlinks, sockets, FIFOs, devices, special nodes, escapes, or limit excess block with
`unsupported-unknown-node`.

## Unsupported Values

If the Design System is valid DTCG but CSS v1 cannot represent one token, `build` returns
`unsupported-value`, writes nothing and exits `4`.

`export json` and `export typescript` may still succeed when the value is JSON-safe and the requested
format supports it.

## Manifest and Hashes

Build `manifest.json` is planned to contain:

- `formatVersion: "1.0.0"`;
- source logical path and SHA-256 hash of exact source bytes;
- ordered artifact metadata for CSS, JSON and TypeScript;
- no timestamp, cwd, hostname, username, Node version or absolute path.

The build manifest is the ownership authority for future builds. Its `source` is the logical token
source path, not the Design System host manifest.

## Publication and Recovery

Build stages a complete future `design-system/build/` directory as a sibling, verifies it, rechecks
concurrency, renames the prior `build/` to a backup, then renames staging to `build/`. It does not
publish artifact-by-artifact into the live directory and does not promise absolute atomicity on every
filesystem.

Normal success and expected pre-commit failures leave either the complete prior set or complete
candidate set. If restore fails after the prior directory was moved to backup, build reports
`write-error`, `wrote:false`, `outputAvailable:false`, a retained `backupRelativePath`, and
`recoveryRequired:true`. If verification fails after candidate publication, build reports
`verification-error`, `wrote:true`, `outputAvailable:true`, retained backup and
`recoveryRequired:true`.

## Safety

Build/export must not:

- write outside the host project;
- follow unsafe symlinks;
- execute generated TypeScript;
- fetch network resources;
- delete unknown files;
- print artifacts mixed with logs or reports;
- include source document contents, stack traces, secrets or absolute paths in public errors.

## Validation Commands

Gates exercised by the implementation (Checkpoint L):

```bash
npm run typecheck
npm run lint
npm test                 # incluye binario real, tarball instalado y regresión 001–005
npm run build
npm pack --dry-run --json
git diff --check
```
