// T024 (011) — Proyección pública `ViewerQualityV1`: resumen integral de calidad del Design System
// completo. Combina datos ya calculados por la misma sesión (overview de 009, brand quality summary
// de T022, component groups de T023, asset inventory de 007, foundations de 004) — nunca recomputa.
// Pensada para agrupar issues por causa (no listas planas de cientos de entradas idénticas).
import type { BrandQualitySummaryV1 } from "../../domain/brand/index.js";
import type { ViewerOverviewV1 } from "./overview.js";
import type { ViewerComponentGroupV1 } from "./components.js";
import type { ViewerIssueV1 } from "./issue.js";
import type { ViewerAssetV1 } from "./asset.js";

export interface ViewerQualityCountersV1 {
  readonly brand: BrandQualitySummaryV1;
  readonly tokens: {
    readonly total: number;
    readonly primitive: number;
    readonly semantic: number;
    readonly component: number;
    readonly brandRole: number;
    readonly unclassified: number;
    readonly unresolvedAliases: number;
    readonly brokenAliases: number;
    readonly aliasCycles: number;
    readonly componentBypassesSemantic: number;
    readonly brandBypassesSemantic: number;
    readonly unknownTypes: number;
    readonly deepValidationCoverage: number; // tokens con validación profunda (no not-deeply-inspected)
    readonly totalDeepValidatable: number;
  };
  readonly assets: {
    readonly total: number;
    readonly withLicense: number;
    readonly licenseMissing: number;
    readonly fontAssets: number;
    readonly fontsMatched: number;
    readonly fontsUnmatched: number;
  };
  readonly components: {
    readonly groups: number;
    readonly componentTokens: number;
    readonly variants: number;
    readonly states: number;
    readonly sizes: number;
  };
  readonly build: {
    readonly hasBuild: boolean;
    readonly stale: boolean;
  };
}

export interface ViewerQualityIssueGroupV1 {
  readonly cause: string;
  readonly severity: ViewerIssueV1["severity"];
  readonly count: number;
  readonly samplePaths: readonly string[];
  readonly code: string;
}

export interface ViewerQualityV1 {
  readonly counters: ViewerQualityCountersV1;
  readonly issueGroups: readonly ViewerQualityIssueGroupV1[];
  readonly standards: readonly { readonly id: string; readonly alignment: "authoritative" | "reference" | "interop-target" }[];
}

const QUALITY_STANDARDS = Object.freeze([
  Object.freeze({ id: "DTCG", alignment: "authoritative" }),
  Object.freeze({ id: "WCAG", alignment: "reference" }),
  Object.freeze({ id: "WAI-ARIA APG", alignment: "reference" }),
  Object.freeze({ id: "Open UI", alignment: "reference" }),
  Object.freeze({ id: "JSON Schema", alignment: "authoritative" }),
] as const);

/** Códigos de issue que cuentan como "validación profunda pendiente" (no inspeccionados). El conteo
 * de `deepValidationCoverage` resta estos del total. */
const DEEP_INSPECTION_MISSING_CODES: ReadonlySet<string> = new Set(["dtcg-type-not-deeply-inspected"]);

function countByCode(issues: readonly ViewerIssueV1[]): ReadonlyMap<string, readonly ViewerIssueV1[]> {
  const map = new Map<string, ViewerIssueV1[]>();
  for (const issue of issues) {
    const bucket = map.get(issue.code) ?? [];
    bucket.push(issue);
    map.set(issue.code, bucket);
  }
  return map;
}

function groupIssues(issues: readonly ViewerIssueV1[], cap = 3): readonly ViewerQualityIssueGroupV1[] {
  const byCode = countByCode(issues);
  const groups: ViewerQualityIssueGroupV1[] = [];
  for (const [code, bucket] of byCode) {
    if (bucket.length === 0) continue;
    const samplePaths = Object.freeze(
      bucket
        .map((issue) => issue.path)
        .filter((path): path is string => path !== null)
        .slice(0, cap),
    );
    groups.push(
      Object.freeze({
        cause: bucket[0]!.message,
        severity: bucket[0]!.severity,
        count: bucket.length,
        samplePaths,
        code,
      }),
    );
  }
  // Orden determinista: por count desc, luego por code asc (sin depender del orden de inserción).
  groups.sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
  return Object.freeze(groups);
}

/** Códigos de issue que reflejan un bypass de capa (component/brand que salta semantic). */
const COMPONENT_BYPASS_CODES: ReadonlySet<string> = new Set(["component-token-bypasses-semantic"]);
const BRAND_BYPASS_CODES: ReadonlySet<string> = new Set(["brand-token-bypasses-semantic"]);
const ALIAS_CYCLE_CODES: ReadonlySet<string> = new Set(["alias-cyclic"]);
const BROKEN_ALIAS_CODES: ReadonlySet<string> = new Set(["alias-missing", "alias-malformed", "alias-to-group", "alias-too-long"]);
const UNCLASSIFIED_CODES: ReadonlySet<string> = new Set(["token-layer-unclassified"]);
const UNKNOWN_TYPE_CODES: ReadonlySet<string> = new Set(["dtcg-type-unknown", "dtcg-type-unrecognized"]);

export interface ProjectQualityInput {
  readonly overview: ViewerOverviewV1;
  readonly brand: BrandQualitySummaryV1;
  readonly componentGroups: readonly ViewerComponentGroupV1[];
  readonly assets: readonly ViewerAssetV1[];
  /** Tokens con `brandRole: "brand"` y tokens con `layer: "component"`, ya contados por la sesión. */
  readonly brandRoleTokenCount: number;
  readonly componentTokenCount: number;
  /** Issues YA proyectados por la sesión (foundations + validación + alias + brand). */
  readonly issues: readonly ViewerIssueV1[];
  /** `fontAssetsMatched` ya calculado por la proyección de typography (T020) en la misma sesión. */
  readonly fontMatchedCount: number;
}

/** Proyecta `ViewerQualityV1` desde insumos ya calculados por la sesión. */
export function projectQuality(input: ProjectQualityInput): ViewerQualityV1 {
  const { overview, brand, componentGroups, assets, issues, fontMatchedCount } = input;
  const byCodeMap = countByCode(issues);
  const countOf = (codes: ReadonlySet<string>): number =>
    Array.from(byCodeMap.entries()).filter(([code]) => codes.has(code)).reduce((total, [, bucket]) => total + bucket.length, 0);

  const unresolvedAliases = overview.aliases.total - overview.aliases.valid;
  const totalDeepValidatable = overview.tokens.total;
  const deepMissing = countOf(DEEP_INSPECTION_MISSING_CODES);
  const deepValidationCoverage = Math.max(0, totalDeepValidatable - deepMissing);

  const fontAssets = assets.filter((asset) => asset.kind === "font");
  const licenseMissing = assets.filter((asset) => asset.license.status !== "declared").length;
  const fontsMatched = Math.min(fontMatchedCount, fontAssets.length);
  const fontsUnmatched = Math.max(0, fontAssets.length - fontsMatched);

  const variantSet = new Set<string>();
  const stateSet = new Set<string>();
  const sizeSet = new Set<string>();
  let componentTokens = 0;
  for (const group of componentGroups) {
    componentTokens += group.tokens.length;
    for (const variant of group.variants) variantSet.add(variant);
    for (const state of group.states) stateSet.add(state);
    for (const size of group.sizes) sizeSet.add(size);
  }

  const counters: ViewerQualityCountersV1 = Object.freeze({
    brand,
    tokens: Object.freeze({
      total: overview.tokens.total,
      primitive: overview.tokens.primitive,
      semantic: overview.tokens.semantic,
      component: input.componentTokenCount,
      brandRole: input.brandRoleTokenCount,
      unclassified: countOf(UNCLASSIFIED_CODES),
      unresolvedAliases,
      brokenAliases: countOf(BROKEN_ALIAS_CODES) + Math.max(0, overview.aliases.broken - countOf(BROKEN_ALIAS_CODES)),
      aliasCycles: countOf(ALIAS_CYCLE_CODES),
      componentBypassesSemantic: countOf(COMPONENT_BYPASS_CODES),
      brandBypassesSemantic: countOf(BRAND_BYPASS_CODES),
      unknownTypes: countOf(UNKNOWN_TYPE_CODES),
      deepValidationCoverage,
      totalDeepValidatable,
    }),
    assets: Object.freeze({
      total: assets.length,
      withLicense: assets.length - licenseMissing,
      licenseMissing,
      fontAssets: fontAssets.length,
      fontsMatched,
      fontsUnmatched,
    }),
    components: Object.freeze({
      groups: componentGroups.length,
      componentTokens,
      variants: variantSet.size,
      states: stateSet.size,
      sizes: sizeSet.size,
    }),
    build: Object.freeze({ hasBuild: overview.build.hasBuild, stale: overview.build.stale }),
  });

  return Object.freeze({
    counters,
    issueGroups: groupIssues(issues),
    standards: QUALITY_STANDARDS,
  });
}
