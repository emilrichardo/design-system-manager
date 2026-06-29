import type { ApplicationConflict } from "./application-conflict.js";
import type { TokenChange, TokenChangeSet } from "./token-change.js";
import { tokenChangeSet } from "./token-change.js";
import type { ApplicationSummary } from "./application-summary.js";
import { applicationSummary } from "./application-summary.js";

export interface ApplicationPlan {
  readonly changeSet: TokenChangeSet;
  readonly conflicts: readonly ApplicationConflict[];
  readonly summary: ApplicationSummary;
  readonly writable: boolean;
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
