# Contract — Foundation level resolution v1 (004)

Deterministic resolution of a token's **effective level** from `$extensions` metadata (Neuraz
convention, NOT standard DTCG inheritance).

## Output

```ts
interface FoundationLevelResolution {
  level: "primitive" | "semantic" | "unclassified";
  source: "token" | "group" | "none" | "invalid";
  sourcePath: string | null;
  valid: boolean;
}
```

## Algorithm (precedence)

1. If the token's **own** metadata is present and valid → `{ level, source: "token", sourcePath: null, valid: true }`.
2. Else the **nearest ancestor group** with valid metadata → `{ level, source: "group", sourcePath: <group path>, valid: true }`.
3. Else → `{ level: "unclassified", source: "none", sourcePath: null, valid: true }`.
4. If the resolving declaration (token or nearest group) is **invalid** → `{ level: "unclassified",
   source: "invalid", sourcePath: <declaring node path>, valid: false }` and a
   `foundation-level-invalid` issue is emitted once for that declaration.

A token's own metadata overrides an inherited group level (e.g. `primitive` token inside a `semantic`
group → `primitive`). No inheritance from siblings, alias targets, manifest, config, or path/name.

## Examples

| Declarations | Token | Result |
|---|---|---|
| group `color.base` = primitive | `color.base.blue.500` | `primitive` / `group` / `color.base` |
| group `background` = semantic | `background.default` | `semantic` / `group` / `background` |
| group `g` = semantic; token `g.t` = primitive | `g.t` | `primitive` / `token` / `null` |
| none | `color.x.y` | `unclassified` / `none` / `null` |
| token `g.t` level = `core` (invalid) | `g.t` | `unclassified` / `invalid` / `g.t` (+issue) |

Determinism: identical parsed tree → identical resolutions.
