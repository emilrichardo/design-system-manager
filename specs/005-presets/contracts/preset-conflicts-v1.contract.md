# Contract — Preset Conflicts v1

## Shape

```ts
interface PresetConflictV1 {
  readonly code: string;
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksWrite: boolean;
  readonly proposedAction: string;
}
```

## Codes

| Code | Blocks write | Meaning |
|---|---:|---|
| `preset-value-differs` | yes | existing `$value` differs |
| `preset-type-differs` | yes | existing `$type`/effective type differs |
| `preset-level-differs` | yes | foundation level differs |
| `preset-alias-differs` | yes | alias target differs |
| `preset-token-vs-group` | yes | preset token collides with existing group |
| `preset-group-vs-token` | yes | preset group collides with existing token |
| `preset-envelope-invalid` | yes | envelope or metadata invalid |
| `preset-foundation-metadata-invalid` | yes | Neuraz foundation metadata invalid |
| `preset-category-unsupported` | yes | category unsupported or undeclared |
| `preset-path-reserved` | yes | reserved or unsafe logical path |
| `preset-reference-external` | yes | preset alias references outside preset |
| `preset-limit-exceeded` | yes | size/depth/token/conflict limit exceeded |
| `preset-version-incompatible` | yes | unsupported preset contract/version |
| `preset-concurrent-modification` | yes | target changed between plan and write |

## Safety

Messages and actions must not include stack traces, absolute host paths, environment variables, full
token values or full token documents.
