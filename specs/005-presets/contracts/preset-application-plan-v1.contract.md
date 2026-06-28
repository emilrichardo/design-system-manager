# Contract — Preset Application Plan v1

## Operation Kinds

```ts
type PresetOperationKindV1 =
  | "create"
  | "update"
  | "unchanged"
  | "conflict"
  | "skip";
```

`delete` is out of scope.

## Change

```ts
interface PresetChangeV1 {
  readonly path: string;
  readonly nodeKind: "group" | "token";
  readonly category: string;
  readonly level: "primitive" | "semantic" | "unclassified";
  readonly operation: PresetOperationKindV1;
  readonly reason: string;
  readonly blocksWrite: boolean;
  readonly conflict: PresetConflictV1 | null;
}
```

`path` is a logical token/group path, never an absolute filesystem path. `nodeKind` distinguishes
required parent groups from final token nodes. `update` is limited to adding a missing `$description`
to an otherwise equivalent existing token; groups are not updated in v1.

## Conflict

```ts
interface PresetConflictV1 {
  readonly code: string;
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksWrite: boolean;
  readonly proposedAction: string;
}
```

Stable v1 codes:

```text
preset-value-differs
preset-type-differs
preset-level-differs
preset-alias-differs
preset-description-differs
preset-token-vs-group
preset-group-vs-token
preset-envelope-invalid
preset-foundation-metadata-invalid
preset-category-unsupported
preset-path-reserved
preset-reference-external
preset-limit-exceeded
preset-version-incompatible
preset-concurrent-modification
```

## Plan

```ts
interface PresetApplicationPlanV1 {
  readonly preset: PresetCatalogEntryV1;
  readonly targetFile: "design-system/tokens/base.tokens.json";
  readonly writable: boolean;
  readonly changes: readonly PresetChangeV1[];
  readonly conflicts: readonly PresetConflictV1[];
  readonly summary: {
    readonly create: number;
    readonly update: number;
    readonly unchanged: number;
    readonly conflict: number;
    readonly skip: number;
    readonly total: number;
    readonly blockingConflicts: number;
    readonly wouldWrite: boolean;
  };
}
```

## Ordering

Changes are ordered by canonical foundation category order, then preset insertion order. Conflicts use
the same order as their associated change, followed by global conflicts in stable code order.
