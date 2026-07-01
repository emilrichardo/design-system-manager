# Quickstart: Token Mutation Commands and Safe Diff (implemented)

`008-token-mutations` is implemented and closed. This describes the real, reproducible behavior of
`neuraz-ds token …`. Mutations operate **only** on `design-system/tokens/base.tokens.json`, through
structured commands, never by direct file edits.

## Prerequisites

- Node `>=22`.
- An initialized Design System host (`neuraz-ds init`) with a valid token source.
- A `TokenMutationCommandV1` (built by an adapter: CLI flags, a declarative JSON command file, MCP or
  Studio).

## The mandatory flow

```text
command → read snapshot → analyze → validate command → build mutation plan → calculate diff →
validate candidate document → approval boundary → transactional apply → post-write verification
```

`plan` runs everything up to (and including) candidate validation, read-only. `apply` re-derives the
plan, re-checks concurrency at the approval boundary, then writes the single token file transactionally.

## Reproducible flow (planned commands)

```bash
# Plan is read-only: preview the diff, write nothing.
neuraz-ds token plan --file ./mutation.json          # → planned / exit 0 (+ diff)
neuraz-ds token plan --file ./mutation.json --json   # one TokenMutationJsonEnvelopeV1 to stdout

# Apply is explicit (the approval boundary): transactional single-file write.
neuraz-ds token apply --file ./mutation.json         # → applied / exit 0
neuraz-ds token apply --file ./mutation.json         # → unchanged / exit 2 (idempotent)

# Single-operation shorthands (thin CLI adapter over the same headless use case; write directly, no
# --json, no --force). Only create/update/rename/move/remove; set-alias/remove-alias/groups need --file.
neuraz-ds token create color.brand.500 --type color --value '{"colorSpace":"srgb","components":[0.2,0.5,0.9],"alpha":1,"hex":"#3b82f6"}'
neuraz-ds token update color.brand.500 --value '"#111111"'
neuraz-ds token rename color.brand.500 brand-500
neuraz-ds token move   color.brand.500 color.base
neuraz-ds token remove color.brand.500
```

`--value` accepts a JSON-encoded value (object/number/boolean/quoted string) or, if it fails to parse as
JSON, the raw string literal (e.g. `--value '#3b82f6'` works without quoting).

A declarative `mutation.json` is a `TokenMutationCommandV1` — the same shape MCP/Studio build:

```json
{
  "formatVersion": "1.0.0",
  "operations": [
    { "kind": "create-token", "path": "color.brand.500", "type": "color", "value": { "colorSpace": "srgb", "components": [0.2,0.5,0.9], "alpha": 1, "hex": "#3b82f6" } },
    { "kind": "set-alias", "path": "color.accent", "target": "color.brand.500" }
  ]
}
```

## Diff (deterministic, safe)

The diff represents `added | updated | renamed | moved | removed | alias-changed | metadata-changed |
group-changed`, with logical paths and safe public values, and lists every rewritten reference on
rename/move. Identical command + source ⇒ identical diff. No raw bytes, absolute paths, `Error` or stack
traces.

## Rename / move (reference policy v1: update all affected aliases)

Renaming or moving a token/group rewrites **every** alias that referenced an affected path, so no alias
breaks; the diff shows the `renamed`/`moved` entry plus an `alias-changed` entry per rewritten reference.
A destination collision (`rename-collision`/`move-collision`) blocks; nothing is written.

## Remove (safe by default)

- `remove-token` with dependents → blocked (`removal-with-dependents`, lists dependents). No `--force`.
- `remove-empty-group` only succeeds when the group has no descendants; a non-empty group →
  `group-removal-non-empty`.

## Apply (transactional, single file)

`apply` reuses the `005` single-file atomic write guarantees: snapshot-identity concurrency detection,
backup, atomic replace, restore on failure, and post-write verification. A concurrent source change
between plan and apply → `conflict` (`concurrent-source-change`); a mid-write failure leaves the prior or
the new document, never a partial file; a post-write verification mismatch → `verification-error` with
retained recovery state. Re-applying a no-op → `unchanged`.

## Safety

Token mutations must not:

- write any file other than `design-system/tokens/base.tokens.json`;
- modify `design-system/build/**`, `design-system/assets/**`, the host manifest or the asset manifest;
- leave broken aliases or silently change a value/type;
- expose absolute paths, raw bytes, `Error` or stack traces;
- provide a `--force` that bypasses dependency safety;
- depend on Commander/process/TTY/React/browser/Figma/AI in the core.

## Outcomes & exit codes

| Operation | Outcome | Exit |
|---|---|---:|
| plan/apply success | planned / applied | 0 |
| no-op re-apply | unchanged | 2 |
| malformed/illegal command or invalid DS | invalid-command / invalid-design-system | 3 |
| collision / dependents / non-empty group / concurrent change | conflict | 4 |
| missing token/group/source | not-found | 5 |
| read or write failure | read-error / write-error | 6 |
| post-write verification failure | verification-error | 7 |

## Headless reuse (MCP/Studio)

`planTokenMutation`/`applyTokenMutation` (`src/application/token-mutations/`) are pure, headless use
cases: no Commander, `process`, TTY, React, browser or AI dependency. The CLI (`src/cli/commands/token.ts`
+ `program.ts`) is a thin adapter that only reads `--file`/shorthand flags into a `TokenMutationCommandV1`
and renders the structured `TokenMutationResultV1` — it never reconstructs the planner, diff, validation,
alias rewriting or writer. A future MCP server or the Visual Token Editor can call the same use cases
directly and get the same structured, JSON-safe result.

## Validation commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```
