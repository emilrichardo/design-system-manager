# Contract: ViewerTokenV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectToken`)
- **Consumers**: every token-listing view (Colors/Typography/Spacing/Radius/Borders/Shadows/Motion/
  Foundations/Aliases/search results), UI token detail screen, HTTP JSON API

## Shape

```text
ViewerTokenV1 {
  path: string
  category: FoundationCategoryRef        // one of 9 categories, or "unresolved"
  level: FoundationLevel                 // primitive | semantic | unclassified
  levelSource: FoundationLevelSource     // token | group | none | invalid
  declaredType: string | null
  effectiveType: string | null
  typeOrigin: TypeOrigin                 // own | alias | group | none
  kind: NodeKind                         // concrete | alias
  declaredValue: SafeJsonValue
  resolvedValue: SafeJsonValue
  immediateAliasTarget: string | null
  aliasChain: string[]
  aliasState: AliasState                 // valid | missing | to-group | cyclic | malformed | n/a
  description: string | null
  trust: NodeTrust                       // valid | recovered | untrusted
}
```

## Provenance (field → source; FR-005/FR-009)

| Field | Source |
|---|---|
| `path`, `declaredType`, `effectiveType`, `typeOrigin`, `kind`, `aliasState` (target-independent parts), `description`, `trust` | `002` `TokenNodeSummary` |
| `category`, `level`, `levelSource` | `004` `FoundationTokenInspection` |
| `declaredValue`, `resolvedValue`, `immediateAliasTarget`, `aliasChain` | `006` `ResolvedTokenRecord` |

## Null policy

`declaredType`/`effectiveType`/`immediateAliasTarget`/`description` are `null` when absent/indeterminable
(never `undefined`, never an empty string standing in for "no value"). `aliasChain` is `[]` for a concrete
token (never `null`).

## Invariants (SC-004)

- Every field is a direct pass-through of the named source field for the **same session load** — no field
  is recomputed by a second engine.
- `kind === "alias"` ⇒ `immediateAliasTarget !== null`; `kind === "concrete"` ⇒ `immediateAliasTarget ===
  null` and `aliasChain === []`.
- `aliasState === "cyclic" | "missing" | "to-group" | "malformed"` ⇒ `resolvedValue` reflects `006`'s own
  (safe) handling of that state — the Viewer never substitutes a guessed value.

## Exclusions

No raw bytes; `declaredValue`/`resolvedValue` are JSON-safe DTCG values only (no internal AST node, no
`Map`/`Set`); no absolute paths; no `Error`/stack; no secrets.
