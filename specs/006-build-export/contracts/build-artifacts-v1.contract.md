# Contract: BuildArtifactsV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: artifact renderers
- **Consumers**: build writer, export use case, manifest builder, verification

## Files

| Format | Relative path | Content type |
|---|---|---|
| `css` | `tokens.css` | `text/css; charset=utf-8` |
| `json` | `tokens.resolved.json` | `application/json; charset=utf-8` |
| `typescript` | `tokens.ts` | `text/typescript; charset=utf-8` |

## Schema Concept

```text
BuildArtifact =
  format
  relativePath
  contentType
  bytes
  contentHash
  byteLength
```

## Invariants

- UTF-8, no BOM, LF newline, final newline for text artifacts.
- Byte-identical output for identical source bytes and manager version.
- No timestamps, absolute paths, environment data, cwd, random IDs or host-specific ordering.
- Artifact relative paths are application-controlled; no token content becomes a path.

## Examples

CSS:

```css
:root {
  --color-base-blue-500: #0066ff;
  --color-surface-default: var(--color-base-blue-500);
}
```

TypeScript:

```ts
export const tokens = {
  "color.base.blue.500": "#0066ff",
} as const;
```

## Errors

Artifacts are absent when rendering fails. Build never writes a subset of this contract.
CSS rendering fails before bytes are emitted for invalid custom-property names, name collisions,
unrenderable aliases, unsupported effective types or values, non-finite numbers, unsupported color
shapes, unsupported composite types, or string escaping failures. JSON and TypeScript artifacts may
still be valid for JSON-safe values when CSS is unsupported.

## CSS V1 Rules

- Custom property name: `"--" + token path segments joined with "-"`.
- Segment regex: `^[A-Za-z0-9_][A-Za-z0-9_-]*$`; preserve case; no lowercasing, Unicode
  normalization, identifier escaping or prefix.
- Collision example: `foo.bar-baz` and `foo-bar.baz` both become `--foo-bar-baz` and fail with
  `css-name-collision`.
- Alias output uses the immediate alias target: `var(--target-name)`.
- Supported or conditional scalar types: `color`, `dimension`, `number`, `string`, `fontFamily`,
  `fontWeight`, `duration`, `cubicBezier`, subject to the matrix in `research.md`.
- Unsupported in CSS v1: `boolean`, `strokeStyle`, `border`, `transition`, `shadow`, `gradient`,
  `typography` and any analyzer-admitted shape without exact CSS bytes.

## Null Policy

Artifact metadata fields are never null except where a parent result omits the entire artifact list for
pre-analysis failures.

## Ordering

Artifacts are always ordered `css`, `json`, `typescript`.

## Compatibility

File names and byte formats are stable for v1. Adding SCSS, themes, minified variants or maps is out of
scope and requires new contracts.

## Security

Artifacts must not contain secrets, stacks, absolute paths, executable imports from the manager, or
unescaped user strings.

## Evolution Policy

Byte-level format changes require an ADR and versioned migration notes.
