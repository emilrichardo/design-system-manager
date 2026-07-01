// T002/T012 (009) — Tipos de `ViewerNavigationV1`/`ViewerSectionId` (data-model.md) y su proyección real
// (Checkpoint B): `projectNavigation` deriva cada `count`/`state` de valores ya calculados por
// `projectOverview`/`projectFoundationCategory` — nunca dispara una llamada adicional al Core (FR-016).
import type { ViewerResolvedStateV1 } from "./session.js";
import type { ViewerOverviewV1 } from "./overview.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";

/** Las 17 secciones canónicas del Viewer, en orden fijo de navegación. Las 3 finales
 * (`brand`/`components`/`quality`) se añaden en `011` Checkpoint E; las 14 previas se preservan sin
 * reordenamiento (compatibilidad con `009`/`010` y consumers históricos del contrato). */
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
  | "build"
  | "brand"
  | "components"
  | "quality";

/** Orden canónico fijo de las 17 secciones (nunca reordenado en tiempo de ejecución). */
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
  "brand",
  "components",
  "quality",
] as const;

/** Type guard de runtime (p. ej. para validar un `:id` de ruta HTTP sin castear ciegamente). */
export function isViewerSectionId(value: string): value is ViewerSectionId {
  return (VIEWER_SECTION_ORDER as readonly string[]).includes(value);
}

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

/** Conteos adicionales para las 3 secciones introducidas en `011` E (brand/components/quality).
 * Todos opcionales: si faltan, la sección se renderiza con `count: 0` y el `sessionState` canónico
 * (un proyecto sin Brand System sigue mostrando "brand" con count 0 — nunca falla). */
export interface ViewerNavigationExtras {
  readonly brandFieldsCompleted?: number;
  readonly componentTokenCount?: number;
  readonly qualityIssueCount?: number;
}

/**
 * Proyecta `ViewerNavigationV1`: las 17 secciones canónicas en orden fijo, con `count`/`state` derivados
 * exclusivamente de `overview`/`categoryById`/`extras` (ya calculados para la misma sesión; FR-016/SC-006).
 */
export function projectNavigation(
  overview: ViewerOverviewV1,
  categoryById: ReadonlyMap<FoundationCategoryId, ViewerCategoryNavEntry>,
  sessionState: ViewerResolvedStateV1,
  extras: ViewerNavigationExtras = {},
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
      case "brand":
        return { id, count: extras.brandFieldsCompleted ?? 0, state: sessionState };
      case "components":
        return { id, count: extras.componentTokenCount ?? 0, state: sessionState };
      case "quality":
        return { id, count: extras.qualityIssueCount ?? overview.issues.total, state: sessionState };
      default: {
        const exhaustive: never = id;
        return exhaustive;
      }
    }
  });

  return { sections };
}
