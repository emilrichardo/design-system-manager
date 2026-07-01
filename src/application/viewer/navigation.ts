// T002 (009) — Tipos de `ViewerNavigationV1`/`ViewerSectionId` (data-model.md). Solo tipos en
// Checkpoint A; `projectNavigation` llega en Checkpoint B.
import type { ViewerResolvedStateV1 } from "./session.js";

/** Las 14 secciones canónicas del Viewer, en orden fijo de navegación. */
export type ViewerSectionId =
  | "overview"
  | "colors"
  | "typography"
  | "spacing"
  | "radius"
  | "borders"
  | "shadows"
  | "motion"
  | "aliases"
  | "foundations"
  | "assets"
  | "presets"
  | "issues"
  | "build";

/** Orden canónico fijo de las 14 secciones (nunca reordenado en tiempo de ejecución). */
export const VIEWER_SECTION_ORDER: readonly ViewerSectionId[] = [
  "overview",
  "colors",
  "typography",
  "spacing",
  "radius",
  "borders",
  "shadows",
  "motion",
  "aliases",
  "foundations",
  "assets",
  "presets",
  "issues",
  "build",
] as const;

export interface ViewerSectionSummary {
  readonly id: ViewerSectionId;
  readonly count: number;
  readonly state: ViewerResolvedStateV1;
}

export interface ViewerNavigationV1 {
  readonly sections: readonly ViewerSectionSummary[];
}
