// T014 — Plan de inicialización (inmutable). Solo modela; no resuelve rutas ni escribe.
import type { Issue } from "../issue.js";
import type { Result } from "../errors.js";
import { err, ok } from "../errors.js";
import type { DesignSystemIdentity } from "../identity/design-system-identity.js";
import type { PreviousState } from "../state/previous-state.js";

export interface InitializationPlan {
  readonly identity: DesignSystemIdentity;
  /** Identificador conceptual de la raíz anfitriona (sin resolución de filesystem). */
  readonly hostRootId: string;
  /** Rutas relativas que se pretenden crear. */
  readonly filesToCreate: readonly string[];
  /** Rutas objetivo ya ocupadas (no se sobrescriben). */
  readonly conflicts: readonly string[];
  readonly warnings: readonly Issue[];
  readonly previousState: PreviousState;
  /** true solo si el estado previo es `none` y no hay conflictos. */
  readonly canProceed: boolean;
}

export interface PlanInput {
  readonly identity: DesignSystemIdentity;
  readonly hostRootId: string;
  readonly filesToCreate: readonly string[];
  readonly conflicts?: readonly string[];
  readonly warnings?: readonly Issue[];
  readonly previousState: PreviousState;
}

/** Crea un plan inmutable; rechaza rutas duplicadas. Calcula `canProceed` de forma determinista. */
export function createInitializationPlan(input: PlanInput): Result<InitializationPlan> {
  const conflicts = input.conflicts ?? [];
  const warnings = input.warnings ?? [];

  if (new Set(input.filesToCreate).size !== input.filesToCreate.length) {
    return err("plan-duplicate-files", "El plan contiene rutas de archivo duplicadas.", {
      filesToCreate: [...input.filesToCreate],
    });
  }

  const canProceed = input.previousState.kind === "none" && conflicts.length === 0;

  const plan: InitializationPlan = Object.freeze({
    identity: input.identity,
    hostRootId: input.hostRootId,
    filesToCreate: Object.freeze([...input.filesToCreate]),
    conflicts: Object.freeze([...conflicts]),
    warnings: Object.freeze([...warnings]),
    previousState: input.previousState,
    canProceed,
  });

  return ok(plan);
}

/** Exige un plan ejecutable; error si no puede proceder (estado previo no `none` o conflictos). */
export function ensureExecutable(plan: InitializationPlan): Result<InitializationPlan> {
  if (!plan.canProceed) {
    return err(
      "plan-not-executable",
      "El plan no es ejecutable: hay conflictos o un estado previo distinto de 'none'.",
      { conflicts: [...plan.conflicts], previousState: plan.previousState.kind },
    );
  }
  return ok(plan);
}
