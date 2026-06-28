# Audit — 004 Foundations

## Scope

Feature `004-foundations` adds the read-only `neuraz-ds foundations` command, human and JSON
presentation, metadata resolution through `$extensions`, deterministic category projection, and
integration coverage. It does not add presets, themes, CSS export, editing, migrations, MCP, or TUI.

## Coverage Matrix

| Area | Status | Evidence |
|---|---:|---|
| User stories | 14/14 | tasks T001-T057 completed in dependency order |
| Functional requirements | 47/47 | domain/application/CLI/integration tests cover FR matrix in `tasks.md` |
| Success criteria | 11/11 | unit, integration, binary, packaging, determinism, and regression tests |
| Constitution gates | 17/17 | headless core, no hidden I/O, deterministic output, read-only foundations |

## Regression

- 001 `init` remains unchanged: `init -> foundations -> init` keeps managed files byte-identical and returns `unchanged` on the second init.
- 002 `validate`/`inspect` remain unchanged: exit codes, human reporters, inspection token cap, analysis pipeline, and traversal stay intact.
- 003 JSON v1 remains isolated: `validate --json` and `inspect --json` retain `JSON_FORMAT_VERSION`, command union, serializer, and envelope shape.

## Accepted Debt

- Foundation metadata projection is a single O(nodes) pass over the already parsed tokens document; it performs no I/O and no second DTCG traversal.
- Deep validation remains color-only; other recognized DTCG types are surface-inspected and can inherit `dtcg-type-not-deeply-inspected`.
- Fresh `init` intentionally yields `foundations` outcome `partial`/exit 4 because generated color tokens are `unclassified`.
- Categories are fixed and not user-configurable in 004.

## Final Gates

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm pack --dry-run`
- real tarball smoke (`neuraz-ds --help`, `foundations --help`, `foundations`, `foundations --json`)
