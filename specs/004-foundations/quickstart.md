# Quickstart — Foundations (004)

> **Target behaviour of feature 004 (not yet implemented).** Read-only; never modifies the Design
> System. `neuraz-ds foundations` is not available until 004 ships.

## Requirements

- Node.js `>=22`.
- A host project with `package.json` and a Design System (`neuraz-ds init`). See
  [001-ds-init/quickstart.md](../001-ds-init/quickstart.md).

## Usage (target)

```bash
npm install -D @neuraz/design-system-manager
npx neuraz-ds init
npx neuraz-ds foundations          # human, read-only
npx neuraz-ds foundations --json   # one Foundations JSON v1 document
```

Rules: with `--json`, stdout is exactly one JSON document (2-space indent + trailing newline), stderr
empty, exit code by outcome (0/3/4/5/6). `validate`/`inspect` (and their `--json`) are unchanged.

## Declaring foundation level (in `base.tokens.json`)

Primitive **group** (applies to its branch):
```json
{ "color": { "base": {
  "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "primitive" } } },
  "blue": { "500": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.23,0.51,0.96], "alpha": 1, "hex": "#3b82f6" } } }
} } }
```

Semantic **token**:
```json
{ "color": { "primary": { "default": {
  "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "semantic" } } },
  "$type": "color", "$value": "{color.base.blue.500}"
} } } }
```

Token **override** (primitive token inside a semantic group):
```json
{ "color": { "roles": {
  "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "semantic" } } },
  "raw": { "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "primitive" } } },
           "$type": "color", "$value": { "colorSpace": "srgb", "components": [0,0,0], "alpha": 1, "hex": "#000000" } }
} } }
```

Token **without metadata** → `level: unclassified` (preserved, never guessed).

**Invalid** metadata → `foundation-level-invalid` issue, level `unclassified`, content preserved:
```json
{ "color": { "x": { "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "core" } } } } } }
```

## Conceptual results (no preset values)

- Freshly `init`ed DS (no foundation metadata): `color` → **partial** (two `unclassified` tokens),
  all other categories → **absent**; global **partial**, exit 4.
- After labelling the color primitives/semantics correctly: `color` → **complete** (if no errors);
  others still **absent**; global **partial** (others absent/unclassified) until populated.
- `spacing` with no tokens → **absent**.
- A `primitive → semantic` alias → `color` **invalid**; global **complete-invalid**, exit 3.
- Tokens under a non-category top-level group (e.g. `background.*`) → category **unresolved**
  (listed under `unresolved`, preserved).

## Consuming JSON (optional `jq`)

```bash
npx neuraz-ds foundations --json | jq -r '.outcome'
npx neuraz-ds foundations --json | jq '.result.summary.tokens'
```

## Compatibility

`init`, `validate`, `inspect`, and `validate --json` / `inspect --json` are unchanged; the 003 JSON v1
(`formatVersion: "1.0.0"`) stays byte-stable. Out of scope: preset values, themes, component tokens,
CSS/SCSS, Style Dictionary, export, editing, migrations.
