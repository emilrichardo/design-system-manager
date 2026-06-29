// T038 (005) — Derivación PURA del resumen genérico de una aplicación de cambios (dominio). El resumen
// SIEMPRE se calcula a partir de los cambios (nunca lo suministra un consumidor) para que no pueda
// desincronizarse: `total` = nº de cambios, conteo por operación, `blockingConflicts` = cambios con
// `blocksWrite`, `wouldWrite` ⇔ sin bloqueos y con al menos un create/update. Sin presets/CLI/JSON.
import type { TokenChange } from "./token-change.js";

/** Resumen agregado y determinista de un conjunto de cambios. */
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

/** Deriva el resumen a partir de los cambios (función pura; no muta la entrada). */
export function applicationSummary(changes: readonly TokenChange[]): ApplicationSummary {
  let create = 0;
  let update = 0;
  let unchanged = 0;
  let conflict = 0;
  let skip = 0;
  let blockingConflicts = 0;

  for (const change of changes) {
    switch (change.operation) {
      case "create":
        create += 1;
        break;
      case "update":
        update += 1;
        break;
      case "unchanged":
        unchanged += 1;
        break;
      case "conflict":
        conflict += 1;
        break;
      case "skip":
        skip += 1;
        break;
    }
    if (change.blocksWrite) blockingConflicts += 1;
  }

  return {
    create,
    update,
    unchanged,
    conflict,
    skip,
    total: changes.length,
    blockingConflicts,
    wouldWrite: blockingConflicts === 0 && (create > 0 || update > 0),
  };
}
