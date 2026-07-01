// T032/T033/T039 (009) — `buildViewerSectionDetail`: detalle real por sección, con su PROPIA única carga
// por request (cada `GET /api/section/:id` es su propio refresh — ver `snapshot-session.ts`). Reusa los
// proyectores puros ya existentes (`projectToken`/`projectFoundationCategory`/`projectColorSwatch`/
// `projectTypography`/`projectAssetsFromList`/`projectIssues`); nunca reconstruye el análisis ni el grafo
// de aliases, y nunca vuelve a resolver valores (siempre desde el `resolvedTokenView` de la MISMA carga).
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import { analyzedTokenSource } from "../token-mutations/analyze-source.js";
import { projectTokenLayers } from "../foundations/token-layer-pass.js";
import { deriveBrandQualitySummary, normalizeBrandDocuments } from "../brand/brand-quality-summary.js";
import type { BrandSourceSnapshot } from "../../domain/brand/index.js";
import type { ViewerSectionId } from "./navigation.js";
import type { ViewerResolvedStateV1 } from "./session.js";
import { loadClassifiedSnapshot } from "./snapshot-session.js";
import { deriveBuildStatus, projectOverview, type ViewerBuildStatusV1, type ViewerOverviewV1, type ViewerPresetSummaryV1 } from "./overview.js";
import { projectFoundationCategory, type ViewerFoundationV1 } from "./foundation.js";
import { projectToken } from "./token.js";
import { projectColorSwatch, type ViewerColorV1 } from "./color.js";
import { projectTypography, type ViewerTypographyV1 } from "./typography.js";
import { projectAssetsFromList, type ViewerAssetV1 } from "./asset.js";
import { projectAlias, type ViewerAliasV1 } from "./alias.js";
import { projectAllIssues, type ViewerIssueV1 } from "./issue.js";
import { projectBrand, absentViewerBrand, type ViewerBrandV1 } from "./brand.js";
import { projectComponents, type ViewerComponentGroupV1 } from "./components.js";
import { projectQuality, type ViewerQualityV1 } from "./quality.js";
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
  | readonly ViewerAliasV1[]
  | ViewerPresetSummaryV1
  | ViewerBuildStatusV1
  | readonly ViewerIssueV1[]
  | ViewerBrandV1
  | readonly ViewerComponentGroupV1[]
  | ViewerQualityV1;

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
    case "build": {
      const [presetsResult, assetsResult, previousManifest] = await Promise.all([deps.listPresets(), deps.listAssets(), deps.readBuildManifest()]);
      const aliasNodes = analysis.nodes.filter((n) => n.kind === "alias");
      const validAliases = aliasNodes.filter((n) => n.aliasState === "valid").length;
      const build = deriveBuildStatus(previousManifest, sourceHash);
      const issues = projectAllIssues({
        validation: [...analysis.errors, ...analysis.warnings],
        foundations: foundationProjection ? [...foundationProjection.validation.errors, ...foundationProjection.validation.warnings] : [],
        assetConflicts: assetsResult.conflicts,
        aliasNodes,
        buildStale: build.stale,
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
      return { state, data: overview.build };
    }

    case "aliases": {
      const tokensDoc = analysis.documents[MANAGED_FILES.tokens]?.parsed;
      const source = analyzedTokenSource(tokensDoc, { logicalPath: MANAGED_FILES.tokens, contentHash: sourceHash });
      const aliases = analysis.nodes
        .map((n) => {
          const dependents = source.dependentsOf(n.path);
          if (n.kind !== "alias" && dependents.length === 0) return null; // aislado: no participa del grafo
          return projectAlias({
            path: n.path,
            kind: n.kind,
            immediateTarget: n.aliasTarget,
            chain: resolvedByPath.get(n.path)?.aliasChain ?? [],
            dependents,
            state: n.aliasState,
          });
        })
        .filter((a): a is ViewerAliasV1 => a !== null);
      return { state, data: aliases };
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
      const [assetsResult, previousManifest] = await Promise.all([deps.listAssets(), deps.readBuildManifest()]);
      const build = deriveBuildStatus(previousManifest, sourceHash);
      const issues = projectAllIssues({
        validation: [...analysis.errors, ...analysis.warnings],
        foundations: foundationProjection ? [...foundationProjection.validation.errors, ...foundationProjection.validation.warnings] : [],
        assetConflicts: assetsResult.conflicts,
        aliasNodes: analysis.nodes.filter((n) => n.kind === "alias"),
        buildStale: build.stale,
      });
      return { state, data: issues };
    }

    case "brand": {
      const [brandSnapshot, assetsResult] = await readBrandAndAssets(deps);
      const viewerAssets = projectAssetsFromList(assetsResult);
      const known = new Set(viewerAssets.map((asset) => asset.logicalPath));
      const quality = deriveBrandQualitySummary(brandSnapshot, known);
      if (quality.overallStatus === "absent") {
        return { state, data: absentViewerBrand(quality) };
      }
      const documents = normalizeBrandDocuments(brandSnapshot);
      return { state, data: projectBrand(documents, quality) };
    }

    case "components": {
      const layersProjection = projectTokenLayers(analysis.documents[MANAGED_FILES.tokens]?.parsed, analysis.nodes);
      const tokensByPath = new Map(
        (foundationProjection?.categories ?? []).flatMap((category) =>
          category.tokens.map((foundation) => {
            const token = projectToken({ foundation, description: descriptionByPath.get(foundation.path) ?? null, resolved: resolvedByPath.get(foundation.path) });
            return [token.path, token] as const;
          }),
        ),
      );
      const groups = projectComponents({ layersByPath: layersProjection.layers, tokensByPath });
      return { state, data: groups };
    }

    case "quality": {
      const [assetsResult, previousManifest, brandSnapshot] = await Promise.all([
        deps.listAssets(),
        deps.readBuildManifest(),
        readBrandSnapshot(deps),
      ]);
      const viewerAssets = projectAssetsFromList(assetsResult);
      const known = new Set(viewerAssets.map((asset) => asset.logicalPath));
      const brand = deriveBrandQualitySummary(brandSnapshot, known);
      const build = deriveBuildStatus(previousManifest, sourceHash);
      const issues = projectAllIssues({
        validation: [...analysis.errors, ...analysis.warnings],
        foundations: foundationProjection ? [...foundationProjection.validation.errors, ...foundationProjection.validation.warnings] : [],
        assetConflicts: assetsResult.conflicts,
        aliasNodes: analysis.nodes.filter((n) => n.kind === "alias"),
        buildStale: build.stale,
      });
      const layersProjection = projectTokenLayers(analysis.documents[MANAGED_FILES.tokens]?.parsed, analysis.nodes);
      const tokensByPath = new Map(
        (foundationProjection?.categories ?? []).flatMap((category) =>
          category.tokens.map((foundation) => {
            const token = projectToken({ foundation, description: descriptionByPath.get(foundation.path) ?? null, resolved: resolvedByPath.get(foundation.path) });
            return [token.path, token] as const;
          }),
        ),
      );
      const componentGroups = projectComponents({ layersByPath: layersProjection.layers, tokensByPath });
      const componentTokenCount = componentGroups.reduce((total, group) => total + group.tokens.length, 0);
      const brandRoleTokenCount = Array.from(layersProjection.layers.values()).filter(
        (layer) => layer !== null && layer.brandRole === "brand",
      ).length;
      const typographyTokens = (foundationProjection?.categories.find((category) => category.id === "typography")?.tokens ?? [])
        .map((foundation) => projectToken({ foundation, description: descriptionByPath.get(foundation.path) ?? null, resolved: resolvedByPath.get(foundation.path) }))
        .map((token) => projectTypography(token, viewerAssets.filter((asset) => asset.kind === "font")));
      const fontMatchedCount = typographyTokens.filter(
        (entry) => (entry.kind === "font-family" || entry.kind === "typography-composite") && entry.matchState === "matched",
      ).length;
      const overview = projectOverview({
        state,
        errorCount: analysis.errors.length,
        warningCount: analysis.warnings.length,
        tokens: foundationProjection?.summary.tokens ?? { total: 0, primitive: 0, semantic: 0, unclassified: 0 },
        groupsTotal: countGroups(analysis.documents[MANAGED_FILES.tokens]?.parsed),
        aliases: {
          total: analysis.nodes.filter((n) => n.kind === "alias").length,
          valid: analysis.nodes.filter((n) => n.kind === "alias" && n.aliasState === "valid").length,
          broken: 0,
        },
        categories: foundationProjection?.summary.categories ?? { absent: 0, partial: 0, complete: 0, invalid: 0 },
        assets: assetsResult.summary,
        presets: { total: 0, outcome: "success" },
        issuesTotal: issues.length,
        build,
      });
      const quality = projectQuality({
        overview,
        brand,
        componentGroups,
        assets: viewerAssets,
        brandRoleTokenCount,
        componentTokenCount,
        issues,
        fontMatchedCount,
      });
      return { state, data: quality };
    }

    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** Lee el brand source con degradación explícita a `absent` cuando el puerto no está cableado
 * (fakes antiguos) o cuando el proyecto no tiene `brand/` (001-010, FR-017). */
async function readBrandSnapshot(deps: ViewerSessionDependencies): Promise<BrandSourceSnapshot> {
  if (deps.readBrandSource === undefined) return absentBrandSnapshot();
  try {
    return await deps.readBrandSource();
  } catch {
    return absentBrandSnapshot();
  }
}

async function readBrandAndAssets(
  deps: ViewerSessionDependencies,
): Promise<readonly [BrandSourceSnapshot, Awaited<ReturnType<typeof deps.listAssets>>]> {
  const [brandSnapshot, assetsResult] = await Promise.all([readBrandSnapshot(deps), deps.listAssets()]);
  return [brandSnapshot, assetsResult] as const;
}

function absentBrandSnapshot(): BrandSourceSnapshot {
  return Object.freeze({
    root: "(unknown)",
    status: "absent",
    documents: Object.freeze({
      brandProfile: Object.freeze({ relativePath: "design-system/brand/brand.json", state: "absent", value: null, contentHash: null, byteLength: null }),
      voice: Object.freeze({ relativePath: "design-system/brand/voice-and-tone.json", state: "absent", value: null, contentHash: null, byteLength: null }),
      visualLanguage: Object.freeze({ relativePath: "design-system/brand/visual-language.json", state: "absent", value: null, contentHash: null, byteLength: null }),
      usageGuidelines: Object.freeze({ relativePath: "design-system/brand/usage-guidelines.json", state: "absent", value: null, contentHash: null, byteLength: null }),
    }),
  });
}
