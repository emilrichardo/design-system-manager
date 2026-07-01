# Contract: EditorValueControlV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: token detail/value editor
- **Consumers**: command draft builder, accessible forms, tests

## Shape

```text
EditorValueControlV1 {
  tokenPath: string
  type: "color" | "number" | "dimension" | "fontFamily" | "fontWeight" | "duration" | "cubicBezier"
      | "string" | "boolean" | "readonly-composite" | "unsupported"
  declaredValue: SafeJsonValue
  resolvedValue: SafeJsonValue
  pendingValue: SafeJsonValue | null
  currentSource: string
  candidateSource: string | null
  readOnlyReason: string | null
}
```

## Supported Controls

| Type | Required visual control |
|---|---|
| `color` | text/structured color input preserving declared value and resolved preview |
| `number` | numeric input with invalid state |
| `dimension` | numeric value + unit control when structurally supported |
| `fontFamily` | text/list control, with current Viewer typography/asset context when available |
| `fontWeight` | numeric/common weight selector |
| `duration` | numeric value + time unit control when structurally supported |
| `cubicBezier` | four-number structured control |
| `string` | text input |
| `boolean` | boolean toggle/select |

## Invariants

- Unsupported or composite values are read-only or explicitly blocked unless an existing `006`/DTCG
  contract already supports structured editing.
- Controls produce structured operations only; they never write or patch source JSON.
- The UI must display declared value, resolved value, current value, pending value, current source and
  candidate source where relevant.
- Invalid local input blocks preview until converted to a valid `TokenMutationCommandV1`, or preview
  returns `invalid-command` from `008`.

## Exclusions

No silent type coercion, no hidden expansion of `006` support matrix, no generic raw JSON editor as the
default path.
