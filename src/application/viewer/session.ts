// T001 (009) — Tipos de sesión del Viewer y el mapeo puro de outcomes de 002 → ViewerStateV1
// (data-model.md "Outcome mapping"). Capa de aplicación: sin Node/Commander/DOM/`node:http`.
import type { AnalysisOutcome } from "../analysis-ports.js";
import type { ViewerOverviewV1 } from "./overview.js";
import type { ViewerNavigationV1 } from "./navigation.js";

/**
 * Estado de la sesión del Viewer. `loading` solo existe en el límite adapter/UI (nunca dentro de un
 * `ViewerSessionV1` ya construido, porque el objeto de sesión existe únicamente tras resolver la carga).
 */
export type ViewerStateV1 =
  | "loading"
  | "ready"
  | "empty"
  | "invalid-design-system"
  | "not-found"
  | "read-error"
  | "partial";

/** Estado resuelto (sin `loading`); el único vocabulario que puede vivir dentro de una sesión ya cargada. */
export type ViewerResolvedStateV1 = Exclude<ViewerStateV1, "loading">;

/** Sesión única del Viewer (una por open/refresh); `overview`/`navigation` solo cuando hay algo que proyectar. */
export interface ViewerSessionV1 {
  readonly state: ViewerResolvedStateV1;
  readonly host: { readonly initialized: boolean };
  readonly overview: ViewerOverviewV1 | null;
  readonly navigation: ViewerNavigationV1 | null;
}

/**
 * Proyecta (nunca inventa) el `AnalysisOutcome` de 002 al `ViewerResolvedStateV1` correspondiente,
 * según la tabla de `contracts/viewer-session-outcomes-v1.contract.md`. `empty` es un juicio derivado
 * posterior (requiere conteos ya calculados) y NO se produce aquí — ver `deriveEmptyState`.
 */
export function mapAnalysisOutcomeToViewerState(outcome: AnalysisOutcome): ViewerResolvedStateV1 {
  switch (outcome) {
    case "valid":
      return "ready";
    case "complete-invalid":
      return "invalid-design-system";
    case "partial":
      return "partial";
    case "not-found":
      return "not-found";
    case "read-error":
      return "read-error";
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

/** Insumos mínimos, ya computados en la sesión, para el juicio derivado `empty` (nunca un outcome nuevo). */
export interface EmptyStateSignals {
  readonly tokensTotal: number;
  readonly assetsTotal: number;
  readonly presetsTotal: number;
}

/**
 * Deriva `empty` desde un estado `ready` cuando no hay ningún token/asset/preset (data-model.md,
 * espejo del patrón `FoundationCategoryState: "absent"` de 004). Para cualquier otro estado, se
 * devuelve el estado tal cual (nunca se reclasifica un estado inválido/parcial/de error).
 */
export function deriveEmptyState(
  state: ViewerResolvedStateV1,
  signals: EmptyStateSignals,
): ViewerResolvedStateV1 {
  if (state !== "ready") return state;
  const isEmpty = signals.tokensTotal === 0 && signals.assetsTotal === 0 && signals.presetsTotal === 0;
  return isEmpty ? "empty" : "ready";
}
