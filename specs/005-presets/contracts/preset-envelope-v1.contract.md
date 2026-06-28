# Contract — Preset Envelope v1

## Shape

```ts
interface PresetEnvelopeV1 {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly includedCategories: readonly string[];
  readonly tokens: Record<string, unknown>;
}
```

## Required Fields

All fields are required. `null`, `undefined`, `NaN`, `Infinity`, functions and symbols are invalid.
Unknown top-level fields are invalid in v1.

## Field Rules

- `id`: lowercase ASCII kebab-case, `[a-z][a-z0-9]*(?:-[a-z0-9]+)*`; exact unique catalog key.
- `name`: non-empty string for human output.
- `description`: non-empty string for human output.
- `version`: SemVer, independent of package version and JSON contract version.
- `includedCategories`: non-empty unique array of 004 foundation category ids in canonical order.
- `tokens`: DTCG-compatible object with at least one token under the declared categories.

## Token Rules

- Top-level token paths must be one of `includedCategories`.
- Component tokens, themes, dark/light variants, scripts, URLs, executable code and package
  dependencies are invalid.
- Aliases must resolve to tokens inside the same preset token block.
- Foundation level metadata uses `$extensions["ar.neuraz.design-system-manager"].foundation.level`
  with `primitive` or `semantic`.
- Unknown `$extensions` inside token data are allowed when they are inert JSON data.

## Example

```json
{
  "id": "neutral-base",
  "name": "Neutral Base",
  "description": "Portable neutral base.",
  "version": "1.0.0",
  "includedCategories": ["color", "spacing"],
  "tokens": {
    "color": {
      "$type": "color",
      "$extensions": {
        "ar.neuraz.design-system-manager": {
          "foundation": { "level": "primitive" }
        }
      },
      "gray": {
        "100": {
          "$value": {
            "colorSpace": "srgb",
            "components": [0.96, 0.96, 0.96],
            "hex": "#f5f5f5"
          }
        }
      }
    }
  }
}
```

This example is illustrative only; no real preset values are created by this planning phase.
