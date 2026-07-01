# Contract: ViewerFoundationV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer (`projectFoundationCategory`)
- **Consumers**: Foundations view, and the Spacing/Radius/Borders/Shadows/Motion views (each is this
  contract scoped to one `FoundationCategoryId`); Colors/Typography extend it (see their own contracts)

## Shape

```text
ViewerFoundationV1 {
  id: FoundationCategoryId          // color | spacing | typography | radius | border | shadow | opacity
                                     // | sizing | motion
  state: FoundationCategoryState    // absent | partial | complete | invalid
  counts: { total: number; primitive: number; semantic: number; unclassified: number }
  tokens: ViewerTokenV1[]
  issues: ViewerIssueV1[]
}
```

## Provenance (field → source; FR-012)

| Field | Source |
|---|---|
| `id`, `state`, `counts` | `004` `FoundationCategoryInspection` |
| `tokens` | `004` `FoundationCategoryInspection.tokens`, each mapped through `viewer-token-v1.contract.md` |
| `issues` | `004` `FoundationCategoryInspection.issues`, mapped 1:1 into `ViewerIssueV1` (`source: "foundations"`) |

## Ordering

`tokens` preserves the document order `004` already returns (insertion order of the DTCG source); the
Spacing/Radius/Borders/Shadows/Motion views each request exactly one `FoundationCategoryId` and render this
same shape — there is no separate, differently-shaped contract per category.

## Invariants

- `tokens.length === counts.total` for the same session load.
- `state === "absent"` ⇒ `tokens === []` and `issues === []`.
- This contract MUST NOT be produced by a second traversal of the token document; it is always derived
  from the single session's `004` `FoundationsInspection.categories` entry.

## Exclusions

No raw bytes, absolute paths, `Error`/stack, secrets — inherited from `viewer-token-v1.contract.md` and
`viewer-issue-v1.contract.md` for the nested arrays.
