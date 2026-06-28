# Quickstart: Design System Presets

This is target behavior for `005-presets`; it is not implemented during `/speckit-plan`.

## Prerequisites

- Node >=22.
- A project initialized with `neuraz-ds init` for plan/apply.
- Package installed with bundled `presets/` assets.

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

## Validation Commands

During implementation and closure, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm pack --dry-run
```

The full regression baseline before implementation is `938/938` tests across `148` files.
