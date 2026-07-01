// T002 (009) — Tipos de `ViewerOverviewV1` (data-model.md). Solo tipos en Checkpoint A; `projectOverview`
// llega en Checkpoint B.
import type { ViewerResolvedStateV1 } from "./session.js";
import type { AssetKind } from "../../domain/assets/asset-kind.js";
import type { BuildFormat } from "../../domain/build-export/build-format.js";

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
