// T037 (004) - Mappers y serializer JSON foundations v1.
import { describe, expect, it } from "vitest";
import { analysisError, analysisWarning } from "../../../../src/domain/analysis/analysis-issue.js";
import { FOUNDATION_CATEGORIES, foundationCategoryDefinition, type FoundationCategoryId } from "../../../../src/domain/foundations/foundation-category.js";
import { analysisLimitsResult, noLimitsReached } from "../../../../src/domain/traversal/limits.js";
import { computeFoundationLevelCounts, computeFoundationsSummary, computeFoundationsValidation } from "../../../../src/application/foundations/summary.js";
import { FOUNDATIONS_JSON_FORMAT_VERSION, toFoundationsInternalErrorEnvelope, toFoundationsJsonEnvelope } from "../../../../src/application/foundations/json/index.js";
import { JSON_FORMAT_VERSION } from "../../../../src/application/json/format-version.js";
import { toJsonInternalErrorEnvelope } from "../../../../src/application/json/map-internal-error.js";
import { serializeFoundationsJsonV1 } from "../../../../src/infrastructure/reporter/foundations-json-serializer.js";
import { deepFreeze, undefinedPaths } from "../../json/json-test-utils.js";
import type { JsonEnvelopeV1 } from "../../../../src/application/json/dto.js";
import type {
  FoundationCategoryInspection,
  FoundationsInspection,
  FoundationsResult,
  FoundationTokenInspection,
} from "../../../../src/application/foundations/foundations-ports.js";
import type { AnalysisHost } from "../../../../src/domain/analysis/design-system-analysis.js";
import type { FoundationIssue } from "../../../../src/domain/foundations/foundation-issue.js";

const host: AnalysisHost = { root: "/repo con espacios", designSystemPath: "/repo con espacios/design-system" };

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
  issues: readonly FoundationIssue[] = [],
): FoundationCategoryInspection => {
  const definition = foundationCategoryDefinition(id);
  return {
    id,
    definition,
    state,
    validationDepth: definition.validationDepth,
    counts: computeFoundationLevelCounts(tokens),
    tokens,
    issues,
  };
};

function inspection(over: {
  categories?: readonly FoundationCategoryInspection[];
  unresolved?: readonly FoundationTokenInspection[];
  issues?: readonly FoundationIssue[];
  limits?: FoundationsInspection["limits"];
  structuralState?: FoundationsInspection["structuralState"];
} = {}): FoundationsInspection {
  const categories = over.categories ?? [
    category("color", "complete", [
      token({ path: "color.base", level: "primitive" }),
      token({ path: "color.acción", level: "semantic", aliasTarget: "color.base", aliasState: "valid", kind: "alias" }),
    ]),
    ...FOUNDATION_CATEGORIES.slice(1).map((definition) => category(definition.id, "absent")),
  ];
  const unresolved = over.unresolved ?? [];
  const issues = over.issues ?? categories.flatMap((item) => item.issues);
  const limits = over.limits ?? noLimitsReached;
  return {
    host,
    structuralState: over.structuralState ?? "complete-valid",
    categories,
    unresolved,
    summary: computeFoundationsSummary(categories, unresolved, issues),
    validation: computeFoundationsValidation(issues, limits),
    limits,
  };
}

function result(outcome: Exclude<FoundationsResult["outcome"], "not-found">, i = inspection()): FoundationsResult {
  return { outcome, host, inspection: i } as FoundationsResult;
}

describe("toFoundationsJsonEnvelope (T034)", () => {
  it("produce envelopes parseables para los cinco outcomes esperados", () => {
    const outcomes: FoundationsResult[] = [
      result("valid"),
      result("complete-invalid"),
      result("partial"),
      result("read-error"),
      { outcome: "not-found", host: null, inspection: null, hostError: null },
    ];

    for (const item of outcomes) {
      const env = toFoundationsJsonEnvelope(item);
      expect(env.formatVersion).toBe(FOUNDATIONS_JSON_FORMAT_VERSION);
      expect(env.command).toBe("foundations");
      expect(env.outcome).toBe(item.outcome);
      expect(JSON.parse(serializeFoundationsJsonV1(env))).toEqual(env);
    }
  });

  it("mapea host, categorias, tokens, summary, validation, limits e issues sin undefined", () => {
    const warning = analysisWarning("foundation-type-mismatch", "tipo ✦ incompatible 简体", { document: "tokens", path: "spacing.bad" });
    const unresolved = token({ path: "brand.primary", category: "unresolved", levelSource: "group", levelSourcePath: "brand" });
    const limits = analysisLimitsResult([{ limit: "nodes", detail: "> 100000" }]);
    const i = inspection({
      categories: [
        category("color", "absent"),
        category("spacing", "invalid", [token({ path: "spacing.bad", category: "spacing", effectiveType: "color" })], [warning]),
        ...FOUNDATION_CATEGORIES.slice(2).map((definition) => category(definition.id, "absent")),
      ],
      unresolved: [unresolved],
      issues: [warning, analysisWarning("foundation-category-unresolved", "sin categoría", { document: "tokens", path: "brand.primary" })],
      limits,
    });
    const env = toFoundationsJsonEnvelope(result("complete-invalid", i));

    expect(Object.keys(env)).toEqual(["formatVersion", "command", "outcome", "result"]);
    expect(env.result?.host).toEqual({ root: host.root, designSystemPath: host.designSystemPath });
    expect(env.result?.categories).toHaveLength(9);
    expect(env.result?.categories.map((item) => item.id)).toEqual(FOUNDATION_CATEGORIES.map((item) => item.id));
    expect(env.result?.categories[1]).toMatchObject({
      id: "spacing",
      state: "invalid",
      validationDepth: "shallow",
      counts: { total: 1, primitive: 1, semantic: 0, unclassified: 0 },
    });
    expect(env.result?.unresolved[0]).toMatchObject({
      path: "brand.primary",
      category: "unresolved",
      levelSourcePath: "brand",
      effectiveType: "color",
    });
    expect(env.result?.summary.tokens).toEqual({ total: 2, primitive: 2, semantic: 0, unclassified: 0, unresolved: 1 });
    expect(env.result?.validation.warnings[0]).toEqual({
      severity: "warning",
      code: "foundation-type-mismatch",
      message: "tipo ✦ incompatible 简体",
      document: "tokens",
      path: "spacing.bad",
    });
    expect(env.result?.validation.limits).toEqual({ reached: true, partial: true, hits: [{ limit: "nodes", detail: "> 100000" }] });
    expect(undefinedPaths(env)).toEqual([]);
  });

  it("not-found conserva cuatro campos base mas error null", () => {
    const env = toFoundationsJsonEnvelope({ outcome: "not-found", host, inspection: null, hostError: null });
    expect(Object.keys(env)).toEqual(["formatVersion", "command", "outcome", "result", "error"]);
    expect(env).toMatchObject({ outcome: "not-found", result: null, error: null });
  });

  it("no muta inputs congelados y conserva todos los tokens sin cota 200", () => {
    const tokens = Array.from({ length: 250 }, (_, index) => token({ path: `color.t${index}` }));
    const i = inspection({
      categories: [
        category("color", "complete", tokens),
        ...FOUNDATION_CATEGORIES.slice(1).map((definition) => category(definition.id, "absent")),
      ],
    });
    const r = deepFreeze(result("valid", i));
    const env = toFoundationsJsonEnvelope(r);

    expect(env.result?.categories[0]?.tokens).toHaveLength(250);
    expect(env.result?.summary.tokens.total).toBe(250);
  });
});

describe("serializeFoundationsJsonV1 (T036)", () => {
  it("usa dos espacios, exactamente un newline final, sin BOM ni ANSI, y es determinista", () => {
    const env = toFoundationsJsonEnvelope(result("valid"));
    const text = serializeFoundationsJsonV1(env);

    expect(text.startsWith("{\n")).toBe(true);
    expect(text).toContain('\n  "command": "foundations"');
    expect(text.match(/\n+$/)?.[0]).toBe("\n");
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
    expect([...text].some((ch) => ch.charCodeAt(0) === 27)).toBe(false);
    expect(text).toBe(serializeFoundationsJsonV1(env));
    expect(JSON.parse(text).result.categories[0].tokens[1].path).toBe("color.acción");
  });

  it("propaga la excepcion de JSON.stringify ante referencia circular", () => {
    const circular: Record<string, unknown> = { formatVersion: "1.0.0", command: "foundations", outcome: "valid" };
    circular.result = circular;
    expect(() => serializeFoundationsJsonV1(circular as unknown as ReturnType<typeof toFoundationsJsonEnvelope>)).toThrow();
  });
});

describe("toFoundationsInternalErrorEnvelope (T035)", () => {
  it("forma contractual fija y segura, sin stack", () => {
    const env = toFoundationsInternalErrorEnvelope("foundations");

    expect(env).toEqual({
      formatVersion: "1.0.0",
      command: "foundations",
      outcome: "internal-error",
      result: null,
      error: { code: "internal-cli-error", message: "Ocurrió un error interno." },
    });
    expect(Object.keys(env)).toEqual(["formatVersion", "command", "outcome", "result", "error"]);
    expect(JSON.stringify(env)).not.toMatch(/stack|cause|ENOENT|\/Users\//i);
    expect(undefinedPaths(env)).toEqual([]);
  });

  it("no toca el contrato JSON 003", () => {
    const oldEnv: JsonEnvelopeV1 = {
      formatVersion: JSON_FORMAT_VERSION,
      command: "validate",
      outcome: "not-found",
      result: null,
      error: null,
    };

    expect(JSON_FORMAT_VERSION).toBe("1.0.0");
    expect(toJsonInternalErrorEnvelope("validate").command).toBe("validate");
    expect(oldEnv.command).toBe("validate");
  });
});
