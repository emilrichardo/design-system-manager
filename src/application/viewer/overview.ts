// T002/T011 (009) — Tipos de `ViewerOverviewV1` (data-model.md) y su proyección real (Checkpoint B):
// `projectOverview` agrega desde valores YA calculados en la sesión (sin recomputar ningún conteo);
// `deriveBuildStatus` es una función pura sobre el build manifest previo ya leído (sin re-analizar tokens).
import type { ViewerResolvedStateV1 } from "./session.js";
import type { AssetKind } from "../../domain/assets/asset-kind.js";
import type { AssetsSummary } from "../assets/asset-ports.js";
import type { BuildFormat } from "../../domain/build-export/build-format.js";
import type { PreviousBuildManifestInput } from "../build-export/ownership.js";
import { validateBuildManifestV1 } from "../../domain/build-export/build-manifest.js";

export interface ViewerValidationSummaryV1 {
  readonly state: ViewerResolvedStateV1;
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface ViewerTokenCountsV1 {
  readonly total: number;
  readonly primitive: number;
  readonly semantic: number;
  readonly unclassified: number;
}

export interface ViewerAliasCountsV1 {
  readonly total: number;
  readonly valid: number;
  readonly broken: number;
}

export interface ViewerFoundationsCategoryCountsV1 {
  readonly absent: number;
  readonly partial: number;
  readonly complete: number;
  readonly invalid: number;
}

export interface ViewerAssetsSummaryV1 {
  readonly totalAssets: number;
  readonly byKind: Readonly<Record<AssetKind, number>>;
  readonly totalByteLength: number;
}

export interface ViewerPresetSummaryV1 {
  readonly total: number;
  readonly outcome: "success" | "invalid-preset";
}

export interface ViewerBuildStatusV1 {
  readonly hasBuild: boolean;
  readonly formats: readonly BuildFormat[];
  readonly stale: boolean;
}

export interface ViewerOverviewV1 {
  readonly validation: ViewerValidationSummaryV1;
  readonly tokens: ViewerTokenCountsV1;
  readonly groups: { readonly total: number };
  readonly aliases: ViewerAliasCountsV1;
  readonly foundations: { readonly categories: ViewerFoundationsCategoryCountsV1 };
  readonly assets: ViewerAssetsSummaryV1;
  readonly presets: ViewerPresetSummaryV1;
  readonly issues: { readonly total: number };
  readonly build: ViewerBuildStatusV1;
}

/** Insumos ya calculados por `buildViewerSession`; ningún campo se recomputa aquí (SC-003). */
export interface ProjectOverviewInput {
  readonly state: ViewerResolvedStateV1;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly tokens: ViewerTokenCountsV1;
  readonly groupsTotal: number;
  readonly aliases: ViewerAliasCountsV1;
  readonly categories: ViewerFoundationsCategoryCountsV1;
  readonly assets: AssetsSummary;
  readonly presets: ViewerPresetSummaryV1;
  readonly issuesTotal: number;
  readonly build: ViewerBuildStatusV1;
}

/** Agrega `ViewerOverviewV1` desde valores ya calculados para la misma carga de sesión (FR-005/SC-003). */
export function projectOverview(input: ProjectOverviewInput): ViewerOverviewV1 {
  return {
    validation: { state: input.state, errorCount: input.errorCount, warningCount: input.warningCount },
    tokens: input.tokens,
    groups: { total: input.groupsTotal },
    aliases: input.aliases,
    foundations: { categories: input.categories },
    assets: { totalAssets: input.assets.totalAssets, byKind: input.assets.byKind, totalByteLength: input.assets.totalByteLength },
    presets: input.presets,
    issues: { total: input.issuesTotal },
    build: input.build,
  };
}

/**
 * Deriva `ViewerBuildStatusV1` desde el build manifest previo ya leído (`006` `PreviousBuildManifestInput`)
 * y el `sourceHash` actual de la fuente de tokens (de la MISMA sesión). Nunca reconstruye el build; solo
 * compara hashes ya existentes. `stale` es `false` cuando `hasBuild` es `false` (invariante del contrato).
 */
export function deriveBuildStatus(previousManifest: PreviousBuildManifestInput, currentSourceHash: string): ViewerBuildStatusV1 {
  if (previousManifest.state !== "parsed") return { hasBuild: false, formats: [], stale: false };
  const validated = validateBuildManifestV1(previousManifest.value);
  if (!validated.ok) return { hasBuild: false, formats: [], stale: false };
  return {
    hasBuild: true,
    formats: validated.manifest.artifacts.map((a) => a.format),
    stale: validated.manifest.sourceHash !== currentSourceHash,
  };
}
