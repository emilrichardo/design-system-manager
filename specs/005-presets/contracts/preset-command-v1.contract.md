# Contract — Preset Command v1

## CLI Surface

```bash
neuraz-ds presets list [--json]
neuraz-ds presets inspect <id> [--json]
neuraz-ds presets plan <id> [--json]
neuraz-ds presets apply <id> [--json]
```

No prompts. No `--force`. No `--category`. No `--dry-run` alias in v1.

## Headless Use Cases

```ts
listPresets(input, deps)
inspectPreset({ id }, deps)
planPresetApplication({ id, executionDir }, deps)
applyPreset({ id, executionDir }, deps)
```

Use cases do not know Commander, ANSI, streams, numeric exit codes, JSON serialization, prompts or
TTY.

## Human Output

- `list`: preset id, name, version, included categories.
- `inspect`: metadata and contributed token summaries.
- `plan`: preset, target, counts, conflicts, `wouldWrite`.
- `apply`: outcome, wrote flag, target, summary, verification.

Human output must be deterministic and safe without TTY.

## Exit Codes

| Outcome | Exit |
|---|---:|
| `success` / `applied` | 0 |
| `unchanged` | 2 |
| `invalid-preset` | 3 |
| `conflict` | 4 |
| `not-found` | 5 |
| `read-error` / `write-error` | 6 |
| `verification-error` | 7 |
| `internal-error` | 70 |

Commander usage errors keep the existing policy: exit 3, no JSON conversion before arguments are
accepted.
