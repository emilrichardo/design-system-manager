# Contract — Foundation `$extensions` metadata v1 (004)

Declares a foundation **level** on a DTCG token or group. Single source of truth:
`design-system/tokens/base.tokens.json`. Read-only in 004 (never written).

## Shape

```json
{
  "$extensions": {
    "ar.neuraz.design-system-manager": {
      "foundation": { "level": "primitive" }
    }
  }
}
```

- Namespace: `ar.neuraz.design-system-manager` (vendor-specific, stable).
- `foundation` MUST be an object.
- `level` MUST be a string ∈ {`primitive`, `semantic`} (v1). No other value is accepted
  (`component`, `alias`, `base`, `core`, `reference`, `theme`, `preset`, …).
- May appear on a **token** or a **group** (group = default level for its branch).
- `unclassified` is a derived state; persisting `"level":"unclassified"` is **invalid**.
- `foundation.category` MUST NOT be persisted (category is derived; see
  [foundation-category-definition-v1](foundation-category-definition-v1.contract.md)).

## Rules

- Level is determined ONLY by this metadata. Names, paths, prefixes, `$type`, alias targets, and any
  external/duplicated registry MUST NOT influence the level.
- Unknown keys inside the Neuraz namespace and other vendors' `$extensions` MUST be preserved and
  ignored for classification (forward-compatible).

## Valid examples

Primitive group:
```json
{ "color": { "base": {
  "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "primitive" } } },
  "blue": { "500": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.23,0.51,0.96], "alpha": 1, "hex": "#3b82f6" } } }
} } }
```

Semantic token overriding a group:
```json
{ "background": {
  "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "semantic" } } },
  "default": { "$type": "color", "$value": "{color.base.blue.500}" }
} }
```

## Invalid examples (→ `foundation-level-invalid`, derived level `unclassified`)

```json
{ "x": { "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "core" } } } } }
{ "x": { "$extensions": { "ar.neuraz.design-system-manager": { "foundation": "primitive" } } } }
{ "x": { "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": 1 } } } } }
{ "x": { "$extensions": { "ar.neuraz.design-system-manager": { "foundation": { "level": "unclassified" } } } } }
```
