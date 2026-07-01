# Quickstart: Design System Viewer (implemented)

`009-design-system-viewer` is implemented and closed. This describes the real, reproducible flow of
`neuraz-ds view`.

## Prerequisites

- Node `>=22`.
- An initialized Design System host (`neuraz-ds init`); the Viewer works against any structural state
  (`valid`/`partial`/`complete-invalid`/absent) and shows the matching state rather than failing silently.
- No network access is required (FR-021) — the server only listens on `127.0.0.1`.

## The real flow

```text
neuraz-ds view                     # starts the local http server on 127.0.0.1 (ephemeral port by
                                    # default) and prints "Viewer listening at http://127.0.0.1:<port>/";
                                    # it does NOT open a browser automatically — open that URL yourself
neuraz-ds view --port 4321         # fixed local port
neuraz-ds view --json              # print the session's ViewerJsonEnvelopeV1 to stdout and exit
                                    # (headless/agent/CI use, no server, no browser)
```

`neuraz-ds view` never writes a file; without `--json` it starts a `node:http` server bound to
`127.0.0.1` that serves (a) the pre-built static UI bundle
(`dist/infrastructure/viewer/ui/main.js`, compiled by the same `tsc`, no bundler) and (b) a read-only
`GET`-only JSON API (`GET /api/session`, `GET /api/section/:id`) backed by the viewer application layer's
`ViewerXxxV1` projections. Any non-`GET`/`HEAD` method receives `405`.

## The single session load

```text
GET /api/session or /api/section/:id
  → readBuildSnapshot (006, embeds 002's analysis + 004's foundations projection + 006's resolved token view)
  → classifyAnalysisOutcome (002, pure) → ViewerStateV1
  → listPresets (005) + listAssets (007) + readBuildManifest (006), each at most once
  → ViewerOverviewV1 / ViewerNavigationV1 / section detail
```

Each HTTP request is its own single-load "session" (FR-003): every reused use case is invoked at most
once per request; opening or refreshing the Viewer never writes a byte anywhere (FR-004). A known,
documented boundary: `readBuildSnapshot` requires the tokens document to exist to produce a snapshot; a
host with no tokens document (even with `neuraz-ds.config.json` present) surfaces as `not-found` rather
than the `partial` a raw `002` classification might otherwise report — see
`src/application/viewer/build-session.ts`.

## Reproducible flow

```bash
neuraz-ds init                          # from 001, unrelated closed feature
neuraz-ds view --json                   # → {"formatVersion":"1.0.0","section":"session","state":"ready", ...}
                                         #    (the init fixture's two color tokens are structurally valid;
                                         #    "unclassified" only affects the Foundations category view)
neuraz-ds view                          # → "Viewer listening at http://127.0.0.1:<port>/"; open that URL:
#   Overview → Colors (swatches + resolved value; contrast computed on demand for a chosen text/bg pair)
#   Typography → a token whose family matches a 007 font asset → license/provenance shown
#   Aliases → a referenced token → dependents listed; rename/move preview → read-only impact, discarded
#   Issues → one consolidated list across 002/004/007/008 + stale-build flag from 006
#   Search → filters the already-loaded session (searchTokens/searchAssets); no additional read triggered
```

## Safety (verified by tests)

The Viewer does not:

- write, delete or modify any file under the host root, ever (FR-004/SC-001/SC-007 —
  `tests/integration/viewer/zero-write-full-session.test.ts` asserts byte- and mtime-identical);
- parse `design-system/**` itself, or import a filesystem write port into the application layer (FR-002 —
  `scripts/arch-guard.mjs` + `tests/architecture/viewer/forbidden-imports.test.ts`);
- add a second read/parse/analyze of any document another view already loaded in the same request
  (FR-003/SC-002 — `tests/application/viewer/build-session.test.ts` counts invocations);
- fabricate a state/outcome not backed by an existing `002`–`008` result (FR-007/SC-005);
- expose raw bytes, absolute paths, `Error`/stack traces or secrets in any projection (FR-006/SC-009);
- call `applyTokenMutation` or persist any command/plan from the alias impact preview (FR-015/D7 —
  `tests/application/viewer/aliases.test.ts`);
- depend on Commander/a UI framework/a browser API in the Core or the viewer application layer
  (FR-019/FR-020/SC-011).

## States

| State | Meaning | Source | Exit code (`--json`) |
|---|---|---|---:|
| `loading` | session promise not yet resolved | adapter-only, never a stored value | n/a |
| `ready` | valid Design System, non-empty | `002` `valid` (+ non-zero counts) | 0 |
| `empty` | valid Design System, zero tokens/assets/presets | derived judgment over `002`/`004`/`005`/`007` counts | 0 |
| `invalid-design-system` | structurally invalid | `002` `complete-invalid` | 3 |
| `partial` | recoverable partial state | `002` `partial` | 4 |
| `not-found` | no Design System at the resolved root | `002` `not-found` | 5 |
| `read-error` | source unreadable | `002` `read-error` | 6 |
| `internal-error` | unexpected exception (adapter-only, never a domain state) | — | 70 |

## Validation commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm pack --dry-run --json
git diff --check
```

## Packaging

`npm pack --dry-run --json` includes `dist/cli/commands/view.js`, `dist/application/viewer/**` and
`dist/infrastructure/viewer/**` (including the compiled static bundle `ui/main.js`); it excludes `src/`,
`tests/`, `specs/`, `.agents/`. A real `npm pack` + `npm install <tgz>` (no `npm link`) install was
verified to run `view --json` from a foreign cwd, offline, with no reference to the source repository —
see `tests/integration/viewer/tarball-smoke.test.ts`.
