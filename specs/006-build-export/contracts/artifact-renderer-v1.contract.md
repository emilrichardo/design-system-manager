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
- Receives a readonly normalized token set and must not mutate it.
- Emits complete bytes or no bytes.
- Does not execute generated artifacts.

## Example

```json
{
  "format": "css",
  "relativePath": "tokens.css",
  "contentHash": "0".repeat(64),
  "byteLength": 42
}
```

## Errors

Renderer errors are expected, typed and safe. Supported codes include `unsupported-token-type`,
`unsupported-token-value`, `css-name-collision`, `css-name-invalid`, `alias-target-unrenderable` and
`typescript-serialization-error`.

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
