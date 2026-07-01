# Quickstart: Design System Viewer (planned — not yet implemented)

`009-design-system-viewer` is currently a **specification only**; no code exists yet (see
[tasks.md](tasks.md)). This describes the intended, future reproducible flow once Checkpoints A–F are
implemented, so the shape of the eventual command/behavior is unambiguous now.

## Prerequisites (once implemented)

- Node `>=22`.
- An initialized Design System host (`neuraz-ds init`); the Viewer works against any structural state
  (`valid`/`partial`/`complete-invalid`/absent) and shows the matching state rather than failing silently.
- A local browser; no network access is required (research D1/FR-021).

## The intended flow

```text
neuraz-ds view                     # starts the local http server + opens the pre-built UI bundle
neuraz-ds view --port 4321         # fixed local port (default: ephemeral)
neuraz-ds view --json              # print the session's ViewerJsonEnvelopeV1 to stdout and exit
                                    # (headless/agent/CI use, no server, no browser)
```

`neuraz-ds view` never writes a file; it only starts a `node:http` server bound to `127.0.0.1` that serves
(a) the pre-built static UI bundle and (b) a read-only `GET`-only JSON API backed by the viewer application
layer's `ViewerXxxV1` projections (see `contracts/viewer-json-envelope-v1.contract.md`).

## The single session load

```text
open → analyze (002) → foundations projection (004, embedded in 006's snapshot) → presets list (005) →
build/manifest read (006) → assets list (007) → [on demand] alias impact preview (008, read-only) →
ViewerSessionV1 held in memory → every view/search/filter reads that session only
```

Each reused use case is invoked **at most once** per session/refresh (FR-003); opening a Design System
never writes a byte anywhere (FR-004).

## Reproducible flow (once implemented)

```bash
neuraz-ds init                          # from 001, unrelated closed feature
neuraz-ds view                          # → ready (or empty/invalid-design-system/not-found/read-error/
                                         #    partial, per the outcome mapping in contracts/)
# in the opened browser tab:
#   Overview → Colors → pick a text/background pair → contrast state
#   Typography → a token whose family matches a 007 font asset → license/provenance shown
#   Aliases → a referenced token → dependents listed; "preview rename" → read-only impact, discarded
#   Issues → one consolidated list across 002/004/007 + stale-build flag from 006
#   Search → filters the already-loaded session; no additional read is triggered
```

## Safety

The Viewer must not:

- write, delete or modify any file under the host root, ever (FR-004/SC-001/SC-007);
- parse `design-system/**` itself, or import a filesystem write port into the application layer (FR-002);
- add a second read/parse/analyze of any document another view already loaded in the same session
  (FR-003/SC-002);
- fabricate a state/outcome not backed by an existing `002`–`008` result (FR-007/SC-005);
- expose raw bytes, absolute paths, `Error`/stack traces or secrets in any projection (FR-006/SC-009);
- call `applyTokenMutation` or persist any command/plan from the alias impact preview (FR-015/D7);
- depend on Commander/a UI framework/a browser API in the Core or the viewer application layer
  (FR-019/FR-020/SC-011).

## States (once implemented)

| State | Meaning | Source |
|---|---|---|
| `loading` | session promise not yet resolved | adapter-only, never a stored value |
| `ready` | valid Design System, non-empty | `002` `valid` (+ non-zero counts) |
| `empty` | valid Design System, zero tokens/assets/presets | derived judgment over `002`/`004`/`005`/`007` counts |
| `invalid-design-system` | structurally invalid | `002` `complete-invalid` |
| `partial` | recoverable partial state | `002` `partial` |
| `not-found` | no Design System at the resolved root | `002` `not-found` |
| `read-error` | source unreadable | `002` `read-error` |

## Validation commands (once implemented)

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

No `npm pack`/tarball-smoke validation is defined here yet — that belongs to Checkpoint F once the Viewer
ships production code.
