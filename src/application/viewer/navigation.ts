// T002/T012 (009) — Tipos de `ViewerNavigationV1`/`ViewerSectionId` (data-model.md) y su proyección real
// (Checkpoint B): `projectNavigation` deriva cada `count`/`state` de valores ya calculados por
// `projectOverview`/`projectFoundationCategory` — nunca dispara una llamada adicional al Core (FR-016).
import type { ViewerResolvedStateV1 } from "./session.js";
import type { ViewerOverviewV1 } from "./overview.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";

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

/** `count`/`state` ya calculados por categoría foundation (spacing/radius/borders/shadows/motion y las
 * dos categorías que además tienen vista propia: colors/typography). `opacity`/`sizing` no tienen
 * sección de navegación dedicada — solo son visibles dentro de la sección `foundations` agregada. */
export type ViewerCategoryNavEntry = { readonly count: number; readonly state: ViewerResolvedStateV1 };

const CATEGORY_BY_SECTION: Readonly<Record<"colors" | "typography" | "spacing" | "radius" | "borders" | "shadows" | "motion", FoundationCategoryId>> = {
  colors: "color",
  typography: "typography",
  spacing: "spacing",
  radius: "radius",
  borders: "border",
  shadows: "shadow",
  motion: "motion",
};

/**
 * Proyecta `ViewerNavigationV1`: las 14 secciones canónicas en orden fijo, con `count`/`state` derivados
 * exclusivamente de `overview`/`categoryById` (ya calculados para la misma sesión; FR-016/SC-006).
 */
export function projectNavigation(
  overview: ViewerOverviewV1,
  categoryById: ReadonlyMap<FoundationCategoryId, ViewerCategoryNavEntry>,
  sessionState: ViewerResolvedStateV1,
): ViewerNavigationV1 {
  const categoryEntry = (id: FoundationCategoryId): ViewerCategoryNavEntry => categoryById.get(id) ?? { count: 0, state: sessionState };

  const sections: ViewerSectionSummary[] = VIEWER_SECTION_ORDER.map((id): ViewerSectionSummary => {
    switch (id) {
      case "overview":
        return { id, count: overview.tokens.total, state: sessionState };
      case "colors":
      case "typography":
      case "spacing":
      case "radius":
      case "borders":
      case "shadows":
      case "motion": {
        const entry = categoryEntry(CATEGORY_BY_SECTION[id]);
        return { id, count: entry.count, state: entry.state };
      }
      case "aliases":
        return { id, count: overview.aliases.total, state: sessionState };
      case "foundations":
        return { id, count: overview.tokens.total, state: sessionState };
      case "assets":
        return { id, count: overview.assets.totalAssets, state: sessionState };
      case "presets":
        return { id, count: overview.presets.total, state: sessionState };
      case "issues":
        return { id, count: overview.issues.total, state: sessionState };
      case "build":
        return { id, count: overview.build.formats.length, state: sessionState };
      default: {
        const exhaustive: never = id;
        return exhaustive;
      }
    }
  });

  return { sections };
}
