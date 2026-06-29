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
