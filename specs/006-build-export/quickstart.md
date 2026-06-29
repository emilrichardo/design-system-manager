# Quickstart: Build and Export (planned behavior)

This document describes the expected behavior after `006-build-export` is implemented. The commands are
not implemented by this planning phase.

## Prerequisites

- Node `>=22`.
- A project with `@neuraz/design-system-manager` installed.
- A local Design System initialized with `design-system/tokens/base.tokens.json`.

## Planned Flow

```bash
neuraz-ds init
neuraz-ds presets apply neutral-base
neuraz-ds build
neuraz-ds build --json
neuraz-ds export css
neuraz-ds export json
neuraz-ds export typescript
```

## First Build

Planned command:

```bash
neuraz-ds build
```

Expected behavior:

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

## Validation Commands for the Future Implementation

Expected gates after implementation:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm pack --dry-run --json
git diff --check
```

The planning phase only requires documentation consistency and `git diff --check`.
