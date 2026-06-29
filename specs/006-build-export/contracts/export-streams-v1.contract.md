# Contract: ExportStreamsV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: CLI `export` adapter
- **Consumers**: shell users, CI pipelines

## Commands

```bash
neuraz-ds export css
neuraz-ds export json
neuraz-ds export typescript
```

## Schema Concept

```text
export <format> success:
  stdout = exact artifact bytes
  stderr = empty
  exit = 0

export <format> expected error:
  stdout = empty
  stderr = safe human report
  exit = mapped outcome code
```

## Invariants

- Success stdout is exact artifact bytes only.
- Success stderr is empty.
- Expected error stdout is empty.
- Expected error stderr is a safe human report.
- No `--json` option exists for export v1.
- Export writes no files, creates no temporaries/backups/build manifest and changes no mtimes.
- Export performs only the initial semantic source read/analysis; it has no byte-only concurrency reread
  because it does not publish.

## Examples

```bash
neuraz-ds export css > tokens.css
neuraz-ds export json | node -e 'JSON.parse(require("fs").readFileSync(0, "utf8"))'
```

## Errors

Expected outcomes: `invalid-design-system`, `unsupported-value`, `not-found`, `read-error`.
Internal CLI failures exit 70 with safe stderr and empty stdout.

## Null Policy

Not a JSON contract. Structured `ExportResult` internally uses `null` for absent error/source fields.

## Ordering

Artifact bytes follow the artifact contract. Error issue order is deterministic.

## Compatibility

`export json` means "emit the JSON artifact"; it must never mean "wrap export result as JSON".

## Security

No logs, progress text, prompts, ANSI decorations or reports may be printed around artifact bytes.

## Evolution Policy

Adding flags that affect stdout requires a new contract because shell pipelines rely on exact bytes.
