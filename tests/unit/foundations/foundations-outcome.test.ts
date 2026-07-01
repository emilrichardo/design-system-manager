// T023/T024/T026 (004) — Resumen, proyección foundation y outcome global.
import { describe, expect, it } from "vitest";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";
import type { DesignSystemAnalysis } from "../../../src/domain/analysis/design-system-analysis.js";
import { emptyStatistics } from "../../../src/domain/analysis/inspection-statistics.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";
import { noLimitsReached, analysisLimitsResult } from "../../../src/domain/traversal/limits.js";
import type { FoundationLevelResolution } from "../../../src/domain/foundations/foundation-level.js";
import type { FoundationMetadataProjection } from "../../../src/application/foundations/metadata-pass.js";
import { projectFoundations } from "../../../src/application/foundations/project-foundations.js";
import { classifyFoundationsOutcome } from "../../../src/application/foundations/classify-foundations-outcome.js";
import { deepFreeze } from "../json/json-test-utils.js";

const node = (over: Partial<TokenNodeSummary> = {}): TokenNodeSummary => ({
  path: "color.base",
  declaredType: "color",
  effectiveType: "color",
  typeOrigin: "own",
  typeSourcePath: null,
  kind: "concrete",
  aliasTarget: null,
  aliasState: "n/a",
  description: null,
  depth: 2,
  trust: "valid",
  ...over,
});

const level = (over: Partial<FoundationLevelResolution> = {}): FoundationLevelResolution => ({
  level: "primitive",
  source: "token",
  sourcePath: null,
  valid: true,
  ...over,
});

const metadata = (
  entries: readonly (readonly [string, FoundationLevelResolution])[],
  issues: FoundationMetadataProjection["issues"] = [],
): FoundationMetadataProjection => ({
  levels: new Map(entries),
  issues,
});

const analysis = (over: Partial<DesignSystemAnalysis> = {}): DesignSystemAnalysis => ({
  host: { root: "/host", designSystemPath: "/host/design-system" },
  presence: { present: ["design-system/tokens.json"], missing: [] },
  structuralState: "complete-valid",
  documents: {},
  nodes: [],
  statistics: emptyStatistics,
  errors: [],
  warnings: [],
  limits: noLimitsReached,
  valid: true,
  ...over,
});

describe("projectFoundations + classifyFoundationsOutcome (T023/T024/T026)", () => {
  it("caso init conceptual: dos tokens color sin metadata → color partial, 8 absent, outcome partial", () => {
    const a = analysis({
      nodes: [
        node({ path: "color.base" }),
        node({ path: "color.brand" }),
      ],
    });
    const inspection = projectFoundations(a, metadata([]));

    expect(inspection.categories.map((category) => category.id)).toEqual([
      "color",
      "spacing",
      "typography",
      "radius",
      "border",
      "shadow",
      "opacity",
      "sizing",
      "motion",
    ]);
    expect(inspection.categories[0]).toMatchObject({
      id: "color",
      state: "partial",
      counts: { total: 2, primitive: 0, semantic: 0, unclassified: 2 },
    });
    expect(inspection.summary).toMatchObject({
      categories: { absent: 8, partial: 1, complete: 0, invalid: 0 },
      tokens: { total: 2, primitive: 0, semantic: 0, unclassified: 2, unresolved: 0 },
      errors: 0,
      warnings: 2,
    });
    expect(inspection.validation.valid).toBe(false);
    expect(inspection.validation.warnings.map((issue) => issue.code)).toEqual([
      "foundation-token-unclassified",
      "foundation-token-unclassified",
    ]);
    expect(classifyFoundationsOutcome(a, inspection)).toBe("partial");
  });

  it("categoría unresolved queda fuera de categorías, suma summary y produce warning", () => {
    const a = analysis({ nodes: [node({ path: "background.default" })] });
    const inspection = projectFoundations(a, metadata([["background.default", level()]]));

    expect(inspection.unresolved.map((token) => token.path)).toEqual(["background.default"]);
    expect(inspection.summary.tokens).toMatchObject({ total: 1, primitive: 1, unresolved: 1 });
    expect(inspection.summary.categories.absent).toBe(9);
    expect(inspection.validation.warnings[0]).toMatchObject({
      code: "foundation-category-unresolved",
      path: "background.default",
    });
    expect(classifyFoundationsOutcome(a, inspection)).toBe("partial");
  });

  it("foundation-type-mismatch es warning pero deja la categoría invalid y outcome complete-invalid", () => {
    const a = analysis({ nodes: [node({ path: "spacing.bad", effectiveType: "color" })] });
    const inspection = projectFoundations(a, metadata([["spacing.bad", level()]]));
    const spacing = inspection.categories.find((category) => category.id === "spacing");

    expect(spacing?.state).toBe("invalid");
    expect(inspection.validation.warnings[0]).toMatchObject({
      code: "foundation-type-mismatch",
      severity: "warning",
      path: "spacing.bad",
    });
    expect(classifyFoundationsOutcome(a, inspection)).toBe("complete-invalid");
  });

  it("hereda issues relevantes de 002 sin duplicar los propios", () => {
    const a = analysis({
      nodes: [node({ path: "color.alias", kind: "alias", aliasTarget: "color.missing", aliasState: "missing" })],
      errors: [analysisError("alias-missing", "Referencia inexistente", { document: "tokens", path: "color.alias" })],
      warnings: [analysisWarning("token-layer-unclassified", "surface", { document: "tokens", path: "color.alias" })],
    });
    const inspection = projectFoundations(a, metadata([["color.alias", level()]]));
    const color = inspection.categories[0];

    expect(color?.issues.map((issue) => issue.code)).toEqual(["alias-missing"]);
    expect(color?.state).toBe("invalid");
    expect(inspection.summary).toMatchObject({ errors: 1, warnings: 0 });
  });

  it("metadata inválida se emite una sola vez desde la pasada de metadata y marca invalid", () => {
    const a = analysis({ nodes: [node({ path: "color.a" }), node({ path: "color.b" })] });
    const inspection = projectFoundations(a, metadata(
      [
        ["color.a", level({ level: "unclassified", source: "invalid", sourcePath: "color", valid: false })],
        ["color.b", level({ level: "unclassified", source: "invalid", sourcePath: "color", valid: false })],
      ],
      [analysisError("foundation-level-invalid", "metadata inválida", { document: "tokens", path: "color" })],
    ));

    expect(inspection.validation.errors.map((issue) => issue.code)).toEqual(["foundation-level-invalid"]);
    expect(inspection.categories[0]?.state).toBe("invalid");
  });

  it("primitive → semantic se clasifica como complete-invalid", () => {
    const a = analysis({
      nodes: [
        node({ path: "color.alias", kind: "alias", aliasTarget: "color.role", aliasState: "valid", typeOrigin: "alias" }),
        node({ path: "color.role" }),
      ],
    });
    const inspection = projectFoundations(a, metadata([
      ["color.alias", level()],
      ["color.role", level({ level: "semantic" })],
    ]));

    expect(inspection.validation.errors[0]).toMatchObject({
      code: "foundation-forbidden-dependency",
      path: "color.alias",
    });
    expect(classifyFoundationsOutcome(a, inspection)).toBe("complete-invalid");
  });

  it("outcome respeta precedencia: not-found, read-error y structural partial antes que foundations", () => {
    const validInspection = projectFoundations(analysis({ nodes: [node()] }), metadata([["color.base", level()]]));
    expect(classifyFoundationsOutcome(analysis({ structuralState: "not-initialized" }), validInspection)).toBe("not-found");

    const readError = analysis({
      structuralState: "complete-invalid",
      errors: [analysisError("read-failed", "read", { document: "tokens" })],
      valid: false,
    });
    expect(classifyFoundationsOutcome(readError, validInspection)).toBe("read-error");

    const invalidInspection = projectFoundations(
      analysis({ nodes: [node({ path: "spacing.bad", effectiveType: "color" })] }),
      metadata([["spacing.bad", level()]]),
    );
    expect(classifyFoundationsOutcome(analysis({ structuralState: "partial" }), invalidInspection)).toBe("partial");
  });

  it("sin issues ni parciales → outcome valid; límites parciales → partial", () => {
    const a = analysis({ nodes: [node()] });
    const inspection = projectFoundations(a, metadata([["color.base", level()]]));
    expect(inspection.summary).toMatchObject({
      categories: { absent: 8, partial: 0, complete: 1, invalid: 0 },
      tokens: { total: 1, primitive: 1, semantic: 0, unclassified: 0, unresolved: 0 },
    });
    expect(inspection.validation.valid).toBe(true);
    expect(classifyFoundationsOutcome(a, inspection)).toBe("valid");

    const limited = analysis({
      nodes: [node()],
      limits: analysisLimitsResult([{ limit: "nodes", detail: "> 1" }]),
    });
    const limitedInspection = projectFoundations(limited, metadata([["color.base", level()]]));
    expect(limitedInspection.categories[0]?.state).toBe("partial");
    expect(classifyFoundationsOutcome(limited, limitedInspection)).toBe("partial");
  });

  it("no muta análisis ni metadata congelados", () => {
    const a = deepFreeze(analysis({ nodes: [node()] }));
    const m = deepFreeze(metadata([["color.base", level()]]));
    expect(() => projectFoundations(a, m)).not.toThrow();
  });
});
