// T005 — Estado estructural público de la inspección/validación. Mapeo puro desde el `PreviousState`
// reutilizable de `001` (mismo criterio de estado; la clasificación con filesystem llega en fases
// posteriores). Dominio puro.
import type { PreviousStateKind } from "../state/previous-state.js";

/** Estado estructural canónico de 002 (semántica pública de validate/inspect). */
export type StructuralState =
  | "not-initialized"
  | "partial"
  | "complete-invalid"
  | "complete-valid";

/**
 * Deriva el estado estructural de 002 desde el `kind` de `PreviousState` de `001`.
 * `none → not-initialized`; el resto conserva su nombre. Función total y determinista.
 */
export function structuralStateFromPrevious(kind: PreviousStateKind): StructuralState {
  switch (kind) {
    case "none":
      return "not-initialized";
    case "partial":
      return "partial";
    case "complete-invalid":
      return "complete-invalid";
    case "complete-valid":
      return "complete-valid";
  }
}
