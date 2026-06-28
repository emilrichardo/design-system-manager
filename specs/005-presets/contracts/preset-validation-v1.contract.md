# Contract — Preset Validation v1

## Validation Layers

Validation is ordered and stops write eligibility on the first blocking error class, while still
returning all safe issues collected within limits:

```text
envelope
→ metadata
→ DTCG token block
→ foundation metadata
→ aliases
→ type compatibility
→ declared categories
→ limits
```

## Result

```ts
interface PresetValidationV1 {
  readonly valid: boolean;
  readonly errors: readonly PresetConflictV1[];
  readonly warnings: readonly PresetConflictV1[];
  readonly limits: {
    readonly reached: boolean;
    readonly partial: boolean;
    readonly hits: readonly { readonly limit: string; readonly detail: string }[];
  };
}
```

## Required Checks

- invalid envelope shape;
- invalid id/version/category metadata;
- invalid DTCG structure;
- invalid Neuraz foundation metadata;
- alias missing, cyclic or external to the preset;
- unsupported type/category combination;
- category declared but no matching token path;
- token path under category not declared in `includedCategories`;
- component/theme/reserved paths;
- limits exceeded.

Validation produces sanitized conflicts/issues only. It never executes code, follows URLs, imports
modules from preset content, or exposes full token documents.
