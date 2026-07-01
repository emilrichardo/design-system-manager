// T032/T033/T039 (009) — `buildViewerSectionDetail`: detalle real por sección, con su PROPIA única carga
// por request (cada `GET /api/section/:id` es su propio refresh — ver `snapshot-session.ts`). Reusa los
// proyectores puros ya existentes (`projectToken`/`projectFoundationCategory`/`projectColorSwatch`/
// `projectTypography`/`projectAssetsFromList`/`projectIssues`); nunca reconstruye el análisis ni el grafo
// de aliases, y nunca vuelve a resolver valores (siempre desde el `resolvedTokenView` de la MISMA carga).
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type { ViewerSectionId } from "./navigation.js";
import type { ViewerResolvedStateV1 } from "./session.js";
import { loadClassifiedSnapshot } from "./snapshot-session.js";
import { deriveBuildStatus, projectOverview, type ViewerBuildStatusV1, type ViewerOverviewV1, type ViewerPresetSummaryV1 } from "./overview.js";
import { projectFoundationCategory, type ViewerFoundationV1 } from "./foundation.js";
import { projectToken } from "./token.js";
import { projectColorSwatch, type ViewerColorV1 } from "./color.js";
import { projectTypography, type ViewerTypographyV1 } from "./typography.js";
import { projectAssetsFromList, type ViewerAssetV1 } from "./asset.js";
import { projectIssues, type ViewerIssueV1 } from "./issue.js";
import type { ViewerSessionDependencies } from "./ports.js";

const CATEGORY_BY_SECTION: Readonly<Record<string, FoundationCategoryId>> = {
  colors: "color",
  typography: "typography",
  spacing: "spacing",
  radius: "radius",
  borders: "border",
  shadows: "shadow",
  motion: "motion",
};

export type ViewerSectionDetailData =
  | ViewerOverviewV1
  | readonly ViewerColorV1[]
  | readonly ViewerTypographyV1[]
  | ViewerFoundationV1
  | readonly ViewerFoundationV1[]
  | readonly ViewerAssetV1[]
  | ViewerPresetSummaryV1
  | ViewerBuildStatusV1
  | readonly ViewerIssueV1[];

export interface ViewerSectionDetailResult {
  readonly state: ViewerResolvedStateV1;
  /** `null` cuando no hay nada que proyectar (`not-found`/`read-error`) o cuando el detalle de esa
   * sección todavía no está implementado en este checkpoint (nunca una forma vacía fabricada). */
  readonly data: ViewerSectionDetailData | null;
}

function countGroups(node: unknown): number {
  if (typeof node !== "object" || node === null || Array.isArray(node)) return 0;
  let total = 0;
  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    if (key.startsWith("$")) continue;
    if (typeof child !== "object" || child === null || Array.isArray(child)) continue;
    if (Object.prototype.hasOwnProperty.call(child, "$value")) continue;
    total += 1 + countGroups(child);
  }
  return total;
}

export async function buildViewerSectionDetail(
  input: { readonly executionDir: string },
  deps: ViewerSessionDependencies,
  id: ViewerSectionId,
): Promise<ViewerSectionDetailResult> {
  const loaded = await loadClassifiedSnapshot(input, deps);
  if (!loaded.ok) return { state: loaded.state, data: null };
  const { analysis, foundationProjection, resolvedTokenView, sourceHash } = loaded.snapshot;
  const state = loaded.snapshot.state;

  const categoryFor = (categoryId: FoundationCategoryId) => foundationProjection?.categories.find((c) => c.id === categoryId) ?? null;
  const descriptionByPath = new Map(analysis.nodes.map((n) => [n.path, n.description] as const));
  const resolvedByPath = resolvedTokenView.byPath;

  switch (id) {
    case "overview":
    case "presets":
    case "build":
    case "aliases": {
      const [presetsResult, assetsResult, previousManifest] = await Promise.all([deps.listPresets(), deps.listAssets(), deps.readBuildManifest()]);
      const aliasNodes = analysis.nodes.filter((n) => n.kind === "alias");
      const validAliases = aliasNodes.filter((n) => n.aliasState === "valid").length;
      const build = deriveBuildStatus(previousManifest, sourceHash);
      const issues = projectIssues({
        validation: [...analysis.errors, ...analysis.warnings],
        foundations: foundationProjection ? [...foundationProjection.validation.errors, ...foundationProjection.validation.warnings] : [],
      });
      const overview = projectOverview({
        state,
        errorCount: analysis.errors.length,
        warningCount: analysis.warnings.length,
        tokens: foundationProjection?.summary.tokens ?? { total: 0, primitive: 0, semantic: 0, unclassified: 0 },
        groupsTotal: countGroups(analysis.documents[MANAGED_FILES.tokens]?.parsed),
        aliases: { total: aliasNodes.length, valid: validAliases, broken: aliasNodes.length - validAliases },
        categories: foundationProjection?.summary.categories ?? { absent: 0, partial: 0, complete: 0, invalid: 0 },
        assets: assetsResult.summary,
        presets: { total: presetsResult.presets.length, outcome: presetsResult.outcome },
        issuesTotal: issues.length,
        build,
      });
      if (id === "overview") return { state, data: overview };
      if (id === "presets") return { state, data: overview.presets };
      if (id === "build") return { state, data: overview.build };
      // "aliases": el detalle completo (chain/dependents/impact preview) llega en Checkpoint E (T040/T041).
      return { state, data: null };
    }

    case "colors": {
      const category = categoryFor("color");
      if (category === null) return { state, data: [] };
      const tokens = category.tokens.map((foundation) =>
        projectToken({ foundation, description: descriptionByPath.get(foundation.path) ?? null, resolved: resolvedByPath.get(foundation.path) }),
      );
      return { state, data: tokens.map(projectColorSwatch) };
    }

    case "typography": {
      const category = categoryFor("typography");
      if (category === null) return { state, data: [] };
      const assetsResult = await deps.listAssets();
      const fontAssets = projectAssetsFromList(assetsResult).filter((a) => a.kind === "font");
      const tokens = category.tokens.map((foundation) =>
        projectToken({ foundation, description: descriptionByPath.get(foundation.path) ?? null, resolved: resolvedByPath.get(foundation.path) }),
      );
      return { state, data: tokens.map((t) => projectTypography(t, fontAssets)) };
    }

    case "spacing":
    case "radius":
    case "borders":
    case "shadows":
    case "motion": {
      const category = categoryFor(CATEGORY_BY_SECTION[id] as FoundationCategoryId);
      if (category === null) return { state, data: null };
      return { state, data: projectFoundationCategory(category, descriptionByPath, resolvedByPath) };
    }

    case "foundations": {
      const categories = foundationProjection?.categories ?? [];
      return { state, data: categories.map((c) => projectFoundationCategory(c, descriptionByPath, resolvedByPath)) };
    }

    case "assets": {
      const assetsResult = await deps.listAssets();
      return { state, data: projectAssetsFromList(assetsResult) };
    }

    case "issues": {
      const issues = projectIssues({
        validation: [...analysis.errors, ...analysis.warnings],
        foundations: foundationProjection ? [...foundationProjection.validation.errors, ...foundationProjection.validation.warnings] : [],
      });
      return { state, data: issues };
    }

    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
