# Contract — Foundation category registry & resolution v1 (004)

Fixed category registry and the deterministic token→category rule.

## Registry (immutable, canonical order)

```ts
interface FoundationCategoryDefinition {
  id: FoundationCategoryId; displayOrder: number;
  supportedTypes: readonly string[]; validationDepth: "deep" | "shallow";
  allowsPrimitive: boolean; allowsSemantic: boolean;
}
```

| order | id | supportedTypes | depth |
|---|---|---|---|
| 0 | color | color | deep |
| 1 | spacing | dimension | shallow |
| 2 | typography | dimension, fontFamily, fontWeight, number, typography | shallow |
| 3 | radius | dimension | shallow |
| 4 | border | dimension, strokeStyle, color, border | shallow |
| 5 | shadow | shadow | shallow |
| 6 | opacity | number | shallow |
| 7 | sizing | dimension | shallow |
| 8 | motion | duration, cubicBezier, transition | shallow |

`allowsPrimitive = allowsSemantic = true` for all in v1. The registry contains **no** values, scales,
colors, sizes, presets, CSS, or component names.

## Token → category resolution (deterministic, no guessing)

- `category = firstPathSegment(token.path)` **iff** that segment exactly equals a registry `id`;
  **else `"unresolved"`**.
- No inference from `$type`, names beyond the exact top-level id, alias target, or any role registry.
- `unresolved` tokens are preserved and surfaced under `inspection.unresolved`; never guessed, never
  dropped.
- Informational only: if a resolved category's `supportedTypes` do not include the token's
  `effectiveType`, emit a non-fatal `foundation-type-mismatch` warning; category stays resolved.

## Resolution table (examples)

| Token path | First segment | Category |
|---|---|---|
| `color.base.blue.500` | color | color |
| `radius.200` | radius | radius |
| `spacing.100` | spacing | spacing |
| `background.default` | background | **unresolved** |
| `primary.default` | primary | **unresolved** |
| `motion.transition.default` | motion | motion |

Rationale & rejected alternatives: see
[ADR-0015](../../../docs/adr/0015-foundation-category-resolution.md). `foundation.category` is NOT
persisted in `$extensions` (FR-046): a deterministic rule exists, so metadata is unnecessary in v1.
