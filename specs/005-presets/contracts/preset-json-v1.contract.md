# Contract — Preset JSON v1

## Envelope

```ts
type PresetsJsonCommandV1 =
  | "preset-list"
  | "preset-inspect"
  | "preset-plan"
  | "preset-apply";

interface PresetsJsonEnvelopeV1<Result> {
  readonly formatVersion: "1.0.0";
  readonly command: PresetsJsonCommandV1;
  readonly outcome: string;
  readonly result: Result | null;
  readonly error?: { readonly code: string; readonly message: string } | null;
}
```

Top-level key order: `formatVersion`, `command`, `outcome`, `result`, `error` when present.

## Serialization

```ts
JSON.stringify(envelope, null, 2) + "\n"
```

No BOM, no ANSI, no extra text. Same input produces byte-identical JSON.

## Null Policy

- Stable absent scalar fields: `null`.
- Empty arrays: `[]`.
- Empty records: `{}`.
- No `undefined`, `NaN`, `Infinity`, functions, symbols or BigInt.

## Streams

Expected outcomes:

```text
stdout → exactly one JSON envelope + newline
stderr → empty
exit   → command outcome exit code
```

Internal CLI error:

```text
stdout → empty
stderr → exactly one JSON envelope + newline
exit   → 70
```

## Isolation

This contract does not extend or cast to `JsonEnvelopeV1` from 003 or `FoundationsJsonEnvelopeV1` from
004. It has independent DTOs, mappers, format-version constant and serializer.
