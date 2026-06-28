# Contract — Foundations issues v1 (004)

Stable-coded foundation findings, reusing the `AnalysisIssue` shape (`severity`, `code`, `message`,
`document`, `path`). No stack, no raw library error, no full `$extensions` dump.

## New stable codes

| code | severity | meaning | path | category effect |
|---|---|---|---|---|
| `foundation-level-invalid` | error | malformed Neuraz foundation metadata (see foundation-extension-v1) | declaring token/group | `invalid` |
| `foundation-forbidden-dependency` | error | `primitive → semantic` alias direction | source token | `invalid` |
| `foundation-token-unclassified` | warning | token has no effective level | token | `partial` |
| `foundation-category-unresolved` | warning | token not attributable to a category | token | n/a (in `unresolved`) |
| `foundation-type-mismatch` | warning | effective `$type` ∉ category.supportedTypes | token | `partial` |

## Reused (NOT re-emitted) from 002

Missing alias reference, alias cycle, alias-to-group, and `dtcg-type-not-deeply-inspected` are already
produced by the single analysis. Foundations **surfaces** these existing issues (by reference) and
maps them to category effects (missing/cycle/to-group → `invalid`; not-deeply-inspected → `partial`)
without creating duplicate codes.

## Emission rules

- One issue **per invalid declaration** (never one per descendant): a single invalid group declaration
  emits `foundation-level-invalid` once; descendants resolve to `unclassified` by fall-through.
- `document` ∈ {`tokens`, `structure`}; `path` = logical token/group path or `null`.
- Order is stable (token traversal order; issues within a token in fixed code order).

## Examples

```json
{ "severity": "error", "code": "foundation-forbidden-dependency", "message": "Un token primitive no puede depender de un token semantic.", "document": "tokens", "path": "color.base.alias" }
{ "severity": "warning", "code": "foundation-token-unclassified", "message": "El token no declara nivel foundation (primitive/semantic).", "document": "tokens", "path": "color.base.blue.500" }
{ "severity": "error", "code": "foundation-level-invalid", "message": "Metadata foundation inválida: level debe ser \"primitive\" o \"semantic\".", "document": "tokens", "path": "color.base" }
```
