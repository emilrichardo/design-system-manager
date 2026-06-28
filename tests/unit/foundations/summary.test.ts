// T023 (004) — Summary agregado: categorías, tokens, unresolved e issues por severidad.
import { describe, expect, it } from "vitest";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";
import {
  FOUNDATION_CATEGORIES,
  foundationCategoryDefinition,
  type FoundationCategoryId,
} from "../../../src/domain/foundations/foundation-category.js";
import type {
  FoundationCategoryInspection,
  FoundationTokenInspection,
} from "../../../src/application/foundations/foundations-ports.js";
import {
  computeFoundationLevelCounts,
  computeFoundationsSummary,
  computeFoundationsValidation,
} from "../../../src/application/foundations/summary.js";
import { analysisLimitsResult, noLimitsReached } from "../../../src/domain/traversal/limits.js";

const token = (over: Partial<FoundationTokenInspection> = {}): FoundationTokenInspection => ({
  path: "color.base",
  category: "color",
  level: "primitive",
  levelSource: "token",
  levelSourcePath: null,
  declaredType: "color",
  effectiveType: "color",
  typeOrigin: "own",
  typeSourcePath: null,
  kind: "concrete",
  aliasTarget: null,
  aliasState: "n/a",
  trust: "valid",
  ...over,
});

const category = (
  id: FoundationCategoryId,
  state: FoundationCategoryInspection["state"],
  tokens: readonly FoundationTokenInspection[] = [],
): FoundationCategoryInspection => {
  const definition = foundationCategoryDefinition(id);
  return {
    id,
    definition,
    state,
    validationDepth: definition.validationDepth,
    counts: computeFoundationLevelCounts(tokens),
    tokens,
    issues: [],
  };
};

describe("computeFoundationsSummary (T023)", () => {
  it("vacío/solo absent: 9 absent, 0 tokens, válido sin issues", () => {
    const categories = FOUNDATION_CATEGORIES.map((definition) => category(definition.id, "absent"));
    const summary = computeFoundationsSummary(categories, [], []);

    expect(summary).toEqual({
      categories: { absent: 9, partial: 0, complete: 0, invalid: 0 },
      tokens: { total: 0, primitive: 0, semantic: 0, unclassified: 0, unresolved: 0 },
      errors: 0,
      warnings: 0,
    });
    expect(computeFoundationsValidation([], noLimitsReached).valid).toBe(true);
  });

  it("mezcla estados y niveles con unresolved incluido una sola vez", () => {
    const categories = [
      category("color", "complete", [
        token({ path: "color.base", level: "primitive" }),
        token({ path: "color.role", level: "semantic" }),
      ]),
      category("spacing", "partial", [token({ path: "spacing.raw", category: "spacing", level: "unclassified" })]),
      category("typography", "invalid", [token({ path: "typography.bad", category: "typography", level: "semantic" })]),
      ...FOUNDATION_CATEGORIES.slice(3).map((definition) => category(definition.id, "absent")),
    ];
    const unresolved = [token({ path: "brand.unknown", category: "unresolved", level: "primitive" })];
    const issues = [
      analysisError("foundation-forbidden-dependency", "forbidden", { document: "tokens", path: "typography.bad" }),
      analysisWarning("foundation-token-unclassified", "sin metadata", { document: "tokens", path: "spacing.raw" }),
    ];

    expect(computeFoundationsSummary(categories, unresolved, issues)).toEqual({
      categories: { absent: 6, partial: 1, complete: 1, invalid: 1 },
      tokens: { total: 5, primitive: 2, semantic: 2, unclassified: 1, unresolved: 1 },
      errors: 1,
      warnings: 1,
    });
  });

  it("todos complete y determinismo: mismo input produce mismo summary", () => {
    const categories = FOUNDATION_CATEGORIES.map((definition) => category(definition.id, "complete", [
      token({ path: `${definition.id}.base`, category: definition.id }),
    ]));
    expect(computeFoundationsSummary(categories, [], [])).toEqual(
      computeFoundationsSummary(categories, [], []),
    );
  });

  it("validation reusa limits y considera warnings/errores como no válido", () => {
    const limits = analysisLimitsResult([{ limit: "issues", detail: "> 1" }]);
    const validation = computeFoundationsValidation([
      analysisWarning("foundation-token-unclassified", "sin metadata", { document: "tokens" }),
    ], limits);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toHaveLength(1);
    expect(validation.limits).toBe(limits);
  });
});
