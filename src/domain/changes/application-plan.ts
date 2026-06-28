import type { ApplicationConflict } from "./application-conflict.js";
import type { TokenChange, TokenChangeSet } from "./token-change.js";
import { tokenChangeSet } from "./token-change.js";

export interface ApplicationSummary {
  readonly create: number;
  readonly update: number;
  readonly unchanged: number;
  readonly conflict: number;
  readonly skip: number;
  readonly total: number;
  readonly blockingConflicts: number;
  readonly wouldWrite: boolean;
}

export interface ApplicationPlan {
  readonly changeSet: TokenChangeSet;
  readonly conflicts: readonly ApplicationConflict[];
  readonly summary: ApplicationSummary;
  readonly writable: boolean;
}

export function applicationSummary(changes: readonly TokenChange[]): ApplicationSummary {
  const summary = {
    create: 0,
    update: 0,
    unchanged: 0,
    conflict: 0,
    skip: 0,
    total: changes.length,
    blockingConflicts: 0,
    wouldWrite: false,
  };

  for (const change of changes) {
    summary[change.operation] += 1;
    if (change.blocksWrite) summary.blockingConflicts += 1;
  }
  summary.wouldWrite = summary.blockingConflicts === 0 && (summary.create > 0 || summary.update > 0);

  return summary;
}

export function applicationPlan(
  changes: readonly TokenChange[] = [],
  conflicts: readonly ApplicationConflict[] = [],
): ApplicationPlan {
  const changeSet = tokenChangeSet(changes);
  const summary = applicationSummary(changeSet.changes);
  const blockingConflicts = conflicts.filter((conflict) => conflict.blocksWrite).length;
  const effectiveSummary =
    blockingConflicts === summary.blockingConflicts
      ? summary
      : { ...summary, blockingConflicts, wouldWrite: blockingConflicts === 0 && summary.wouldWrite };

  return {
    changeSet,
    conflicts: [...conflicts],
    summary: effectiveSummary,
    writable: effectiveSummary.blockingConflicts === 0,
  };
}
