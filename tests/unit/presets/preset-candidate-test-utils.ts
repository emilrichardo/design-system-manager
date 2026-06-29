import { applicationPlan } from "../../../src/domain/changes/application-plan.js";
import { createTokenChangeSet } from "../../../src/domain/changes/token-change-set.js";
import type { ApplicationPlan } from "../../../src/domain/changes/application-plan.js";
import type { TokenChange } from "../../../src/domain/changes/token-change.js";

export function change(path: string, overrides: Partial<TokenChange> = {}): TokenChange {
  const category = path.split(".")[0] as TokenChange["category"];
  return {
    path,
    nodeKind: "token",
    category,
    level: "primitive",
    operation: "create",
    reason: "test",
    blocksWrite: false,
    conflict: null,
    proposedToken: { $value: path, $type: "color" },
    ...overrides,
  };
}

export function orderedPlan(changes: readonly TokenChange[]): ApplicationPlan {
  const ordered = createTokenChangeSet(changes);
  if (!ordered.ok) throw new Error(ordered.issues.map((issue) => issue.code).join(","));
  return applicationPlan(ordered.changeSet.changes, ordered.changeSet.changes.flatMap((item) => (item.conflict === null ? [] : [item.conflict])));
}

export function plan(changes: readonly TokenChange[]): ApplicationPlan {
  return applicationPlan(changes, changes.flatMap((item) => (item.conflict === null ? [] : [item.conflict])));
}
