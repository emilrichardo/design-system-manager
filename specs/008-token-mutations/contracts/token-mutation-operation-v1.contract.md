# Contract: TokenMutationOperationV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: adapters (within a `TokenMutationCommandV1`)
- **Consumers**: command validator, mutation planner, reference-update engine

## Schema Concept

```text
TokenMutationOperationV1 = discriminated union on `kind`:

# Tokens
{ kind: "create-token";        path; value; type; description?; category? }
{ kind: "update-value";        path; value }
{ kind: "update-type";         path; type }
{ kind: "update-description";  path; description: string | null }   # DTCG `$description` (null clears)
{ kind: "update-category";     path; category: string | null }      # Neuraz classification metadata (see note)
{ kind: "set-alias";           path; target }            # target is a logical token path
{ kind: "remove-alias";        path }                    # inlines the resolved value (see note)
{ kind: "rename-token";        path; newName }           # newName = last segment
{ kind: "move-token";          path; newParent }         # newParent = group path
{ kind: "duplicate-token";     path; destinationPath }
{ kind: "remove-token";        path }

# Groups (DTCG groups are nested objects; see research D3)
{ kind: "create-group";        path; description? }
{ kind: "rename-group";        path; newName }
{ kind: "move-group";          path; newParent }
{ kind: "remove-empty-group";  path }                    # only when no descendants
```

## Invariants

- `path`, `target`, `newParent`, `destinationPath` are safe logical token paths (no traversal, no empty
  segment, no reserved `$` key as a segment).
- `value` is a JSON-safe DTCG value valid for the declared/effective `type`.
- `set-alias.target` must resolve to a concrete token (never a group); cycles are rejected.
- `rename-*`/`move-*` never overwrite an existing destination (collision blocks); they trigger the
  update-all-affected-aliases reference policy (see `token-mutation-diff-v1`).
- `remove-token` with dependents blocks; `remove-empty-group` blocks if the group has any descendant.
- Pure data; no bytes/Error/absolute paths.

## Notes on metadata and alias removal

- **`remove-alias`** does not leave the token value-less: it **inlines the resolved concrete value** of
  the alias (the token keeps its current effective value as a concrete `$value`) and clears the alias
  reference. It blocks (`alias-not-found`) if the path is not currently an alias. The diff entry is
  `alias-changed` (alias target → `null`) plus an `updated` value.
- **`update-description`** edits the DTCG standard `$description` (`null` clears it).
- **`update-category`** edits the token's **Neuraz classification metadata** under
  `$extensions["ar.neuraz.design-system-manager"]` (the same block `004`/`005` use, e.g.
  `foundation.level`); `null` clears it. It does **not** change the *foundation category* of `004`, which
  is **path-derived and read-only**; recategorizing by location is done via `move-token`. This keeps
  `008` consistent with `004` (no new persisted "category" field that contradicts the derived model).
