# Contract: ArtifactRendererV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: infrastructure renderer adapters
- **Consumers**: `buildDesignSystem`, `exportDesignSystemArtifact`, renderer unit tests

## Schema Concept

```text
ArtifactRenderer {
  format: "css" | "json" | "typescript"
  relativePath: controlled artifact path
  render(NormalizedTokenSet) -> RenderArtifactResult
}

RenderArtifactResult =
  | { outcome: "rendered"; artifact: BuildArtifact }
  | { outcome: "unsupported-value"; errors: SafeBuildError[] }
```

## Invariants

- Pure and deterministic.
- No filesystem, cwd, clock, random, process, streams, Commander or package asset lookup.
- Receives a readonly normalized token set derived from `ResolvedTokenView` and must not mutate it.
- CSS renderers consume immediate alias targets and alias chains from the shared resolution view; they
  must not rebuild alias graphs or fall back silently to final resolved values when an alias cannot be
  represented.
- Emits complete bytes or no bytes.
- Does not execute generated artifacts.

## Example

```json
{
  "format": "css",
  "relativePath": "tokens.css",
  "contentHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "byteLength": 42
}
```

## Errors

Renderer errors are expected, typed and safe. Supported codes include `unsupported-token-type`,
`unsupported-token-value`, `css-name-collision`, `css-name-invalid`,
`css-alias-target-unrenderable`, `css-color-unsupported-shape`, `css-number-invalid` and
`typescript-serialization-error`. CSS names use `"--" + segments.join("-")` after every segment
matches `^[A-Za-z0-9_][A-Za-z0-9_-]*$`; names are rejected, not escaped, in v1.

## Null Policy

Renderer inputs use the normalized model null policy. Renderer result arrays are `[]` when empty; no
`undefined`.

## Ordering

Renderers must preserve the incoming token order. Registry order is `css`, `json`, `typescript`.

## Compatibility

Adding a format is a new contract version. v1 has no dynamic plugins.

## Security

Renderers must not import user-controlled modules, execute generated code, fetch URLs, expose absolute
paths, or include raw `Error`/stack output.

## Evolution Policy

Minor changes may add safe error codes. Changing byte formats, paths or supported formats requires an
ADR and contract version change.
