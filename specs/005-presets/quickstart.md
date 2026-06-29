# Quickstart: Design System Presets

`005-presets` is implemented. This is the reproducible end-to-end flow against the installed package.

## Prerequisites

- Node >=22.
- A project initialized with `neuraz-ds init` for plan/apply.
- Package installed with bundled `presets/` assets.

## 0. Install and initialize

```bash
npm install -D @neuraz/design-system-manager

npx neuraz-ds init                          # interactive (TTY); creates the local Design System
npx neuraz-ds presets list
npx neuraz-ds presets inspect neutral-base
npx neuraz-ds presets plan neutral-base
npx neuraz-ds presets apply neutral-base    # first apply
npx neuraz-ds foundations
npx neuraz-ds presets apply neutral-base    # second apply (idempotent)
```

Outcomes and exit codes for the two applies:

```text
first apply  → outcome: applied   → wrote: true   → exit: 0
second apply → outcome: unchanged → wrote: false  → exit: 2
```

The bundled catalog is read from the package (`import.meta.url`), never from the host repository or
`process.cwd()`; the same flow works regardless of the current directory.

## 1. List bundled presets

```bash
neuraz-ds presets list
neuraz-ds presets list --json
```

Expected:

- stable catalog order;
- no network access;
- no host file writes;
- JSON stdout is one envelope with `command: "preset-list"`.

## 2. Inspect a preset

```bash
neuraz-ds presets inspect neutral-base
neuraz-ds presets inspect neutral-base --json
```

Expected:

- metadata (`id`, `name`, `description`, `version`, `includedCategories`);
- contributed token paths, categories, `$type`, foundation levels;
- unknown id returns `not-found`, no write.

## 3. Preview application

```bash
neuraz-ds presets plan neutral-base
neuraz-ds presets plan neutral-base --json
```

Expected:

- target file remains byte-identical;
- plan lists `create`, `update`, `unchanged`, `conflict`, `skip` counts;
- no `delete`;
- plan says whether apply would write.

## 4. Preview conflicts

If the host already has `color.gray.100` with a different value:

```bash
neuraz-ds presets plan neutral-base
```

Expected:

- outcome `conflict`;
- conflict code `preset-value-differs`;
- `blocksWrite: true`;
- no write.

## 5. Apply a preset

```bash
neuraz-ds presets apply neutral-base
```

Expected when no blocking conflicts exist:

- outcome `applied`;
- `wrote: true`;
- only `design-system/tokens/base.tokens.json` changes;
- unmanaged tokens, unknown `$extensions` and unrelated categories are preserved.

## 6. Reapply unchanged

```bash
neuraz-ds presets apply neutral-base
```

Expected:

- outcome `unchanged`;
- `wrote: false`;
- no mtime/content change required;
- JSON/human summary reports zero writes.

## 7. Verify via foundations

```bash
neuraz-ds foundations
neuraz-ds foundations --json
```

Expected:

- contributed foundation categories and primitive/semantic levels are observable;
- existing `foundations` JSON contract remains unchanged.

## 8. JSON outputs (headless)

Every subcommand accepts `--json` (local, not global). Example shapes (trimmed):

```jsonc
// neuraz-ds presets list --json
{ "formatVersion": "1.0.0", "command": "preset-list", "outcome": "success", "result": { "presets": [ { "id": "neutral-base", "name": "Neutral Base", "version": "1.0.0", "includedCategories": ["color", "spacing"] } ] } }

// neuraz-ds presets apply neutral-base --json (first apply)
{ "formatVersion": "1.0.0", "command": "preset-apply", "outcome": "applied", "result": { "wrote": true, "targetFile": "design-system/tokens/base.tokens.json" } }
```

## Options intentionally unavailable in v1

`presets` has no `--force`, no `--category`, no `--dry-run` (use `plan` as the read-only preview), no
`delete`, no themes/modes/dark/light, no component tokens, no external/local presets, no recommender,
and no `006` build/export.

## Validation Commands

During implementation and closure, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm pack --dry-run --json
```

The closure baseline for `005-presets` is `1264/1264` tests across `208` files.
