# Quickstart: Asset Manager (planned behavior)

Describes the expected behavior of `007-asset-manager` once implemented. The commands are not
implemented by this planning phase. The Asset Manager manages files under `design-system/assets/`,
strictly separate from DTCG tokens.

## Prerequisites

- Node `>=22`.
- An initialized Design System host (created by `neuraz-ds init`).
- Local source files to import (fonts, logos, SVG, icons, images). External acquisition (Figma, URLs,
  scraping) is out of scope.

## Managed layout

```text
design-system/assets/
├── assets.json            # AssetManifestV1 (ownership authority)
├── fonts/                 # font/woff2|woff|ttf|otf
├── logos/                 # svg or supported raster
├── svg/                   # sanitized image/svg+xml
├── icons/                 # svg or small raster
└── images/                # png|jpeg|webp|gif|avif
```

## Reproducible flow (planned commands)

```bash
neuraz-ds asset list                          # listed / exit 0
neuraz-ds asset list --json                   # one AssetJsonEnvelopeV1 to stdout
neuraz-ds asset inspect images/hero.png       # inspected / exit 0
neuraz-ds asset import plan ./hero.png        # preview only — writes nothing
neuraz-ds asset import apply ./hero.png \
  --license "CC-BY-4.0"                        # transactional write; applied / exit 0
neuraz-ds asset import apply ./hero.png        # unchanged / exit 2 (idempotent)
neuraz-ds asset remove images/hero.png        # removed / exit 0 (ownership-bound)
```

(The CLI surface is an optional thin adapter; the same operations are available as headless use cases
for MCP and Studio.)

## List & inspect

- `asset list` returns every managed asset with kind, logical path, MIME, size and hash, deterministically
  ordered; an absent manifest yields an empty listing (exit 0), not an error.
- `asset inspect <logicalPath>` returns kind, MIME, size, dimensions, hash, provenance, license and
  ownership; an unknown path yields `not-found` (exit 5).

## Import plan (read-only)

`asset import plan <source…>` previews candidates without writing:

- resolves kind, destination logical path, MIME (by signature), size, hash and dimensions;
- marks `duplicate` when the content hash already exists;
- marks `blocked` for unsupported MIME, invalid fonts, unsafe/unsanitizable SVG, unsafe paths or
  oversize files, with stable reasons;
- for SVG, shows a sanitization preview (what would be stripped);
- flags `license-required` when no explicit license is supplied.

The asset store and manifest are byte-identical before and after planning.

## Import apply (transactional)

`asset import apply <source…> [--license …]` writes only `add` candidates plus the updated manifest as
**one set**:

- duplicates and blocked candidates are not written;
- SVG is written **sanitized**;
- the license recorded is exactly the one supplied (never assumed);
- re-applying an unchanged asset yields `unchanged` (exit 2) with no rewrite;
- a mid-write failure leaves the complete prior or complete new state (never partial); a
  post-publication mismatch yields `verification-error` (exit 7) with retained recovery state.

## Remove (ownership-bound)

`asset remove <logicalPath>` deletes the file and its manifest entry transactionally. A path not owned by
the manifest is refused (`conflict`/`not-found`) without touching the filesystem; unknown content is
never deleted.

## Safety

The Asset Manager must not:

- read, parse or write tokens, the host manifest, or build artifacts;
- follow symlinks (source, destination, or under the store);
- execute SVG or resolve external references;
- assume a license;
- write outside the asset store;
- include absolute paths, cwd, hostname, secrets or stack traces in any output;
- perform Figma/scraping/AI/optimization/conversion/editing (all out of scope).

## Outcomes & exit codes

| Operation | Outcome | Exit |
|---|---|---:|
| list/inspect/plan/apply/remove (success) | listed/inspected/planned/applied/removed | 0 |
| re-apply unchanged | unchanged | 2 |
| corrupt/untrusted manifest or invalid store | invalid-asset-store | 3 |
| unsupported asset / ownership conflict | unsupported-asset / conflict | 4 |
| missing asset / unknown path | not-found | 5 |
| read or write failure | read-error / write-error | 6 |
| post-publication verification failure | verification-error | 7 |

## Validation commands for the future implementation

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```
