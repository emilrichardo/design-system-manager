# Contract — `neuraz-ds foundations` command & streams v1 (004)

A single, dedicated, **read-only** command. No subcommands, no edit actions. Leaves `init`,
`validate`, `inspect` and the 003 JSON v1 contract untouched.

## Invocation

```bash
neuraz-ds foundations          # human reporter (deterministic, no colors required)
neuraz-ds foundations --json   # one Foundations JSON v1 document (see foundations-json-* contracts)
```

`--json` is a **local** boolean option on `foundations` (default false); not global; not on other
commands. Unknown options follow the existing Commander usage-error policy (exit 3).

## Exit codes (reuse `exitCodeForOutcome`; no new table)

| outcome | exit |
|---|---|
| valid | 0 |
| complete-invalid | 3 |
| partial | 4 |
| not-found | 5 |
| read-error | 6 |
| internal-error (CLI only) | 70 |

`--json` never changes the exit code.

## Streams

| mode / case | stdout | stderr | exit |
|---|---|---|---|
| human, expected outcomes | human report | (existing reporter policy) | 0/3/4/5/6 |
| `--json`, expected outcomes | exactly one JSON document + `\n` | empty | 0/3/4/5/6 |
| `--json`, internal error | empty | one internal-error JSON envelope + `\n` | 70 |
| Commander usage error | (existing) | (existing) | 3 |

No TTY dependency; works with redirected streams; no prompts.

## Human report (deterministic)

Shows: summary; the 9 categories in canonical order with state + counts
(total/primitive/semantic/unclassified); `unresolved` count; relevant issues; limits. A presentation
cap MAY be applied to token listings (like inspect's 200), but the headless model and JSON keep ALL
tokens. No TUI/interaction.

## Composition

Reuses `createBoundAnalyze()` (one analysis), the foundations use case, `exitCodeForOutcome`, and the
`CliIO`/`OutputWriter` abstraction. Human vs JSON selects exactly one reporter (mirrors 003).
