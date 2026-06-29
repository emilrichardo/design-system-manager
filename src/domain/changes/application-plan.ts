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

/**
 * T049 — Regla de bloqueo total: cualquier conflicto bloqueante cancela TODAS las escrituras. Devuelve
 * los cambios que se aplicarían (`create`/`update`) solo si el plan es escribible; si está bloqueado,
 * devuelve `[]` (cero aplicación parcial). Los cambios seguros siguen presentes en el plan para
 * preview, pero no se aplican mientras `writable === false`. Función pura.
 */
export function appliedChanges(plan: ApplicationPlan): readonly TokenChange[] {
  if (!plan.writable) return [];
  return plan.changeSet.changes.filter(
    (change) => change.operation === "create" || change.operation === "update",
  );
}
