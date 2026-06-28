// T031 (004) - Reporter textual foundations sobre IO falso capturable.
import { describe, expect, it } from "vitest";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";
import { FOUNDATION_CATEGORIES, foundationCategoryDefinition, type FoundationCategoryId } from "../../../src/domain/foundations/foundation-category.js";
import { analysisLimitsResult, noLimitsReached } from "../../../src/domain/traversal/limits.js";
import { FoundationsTerminalReporter } from "../../../src/infrastructure/reporter/foundations-terminal-reporter.js";
import { computeFoundationLevelCounts, computeFoundationsSummary, computeFoundationsValidation } from "../../../src/application/foundations/summary.js";
import type {
  FoundationCategoryInspection,
  FoundationsInspection,
  FoundationsResult,
  FoundationTokenInspection,
} from "../../../src/application/foundations/foundations-ports.js";
import type { AnalysisHost } from "../../../src/domain/analysis/design-system-analysis.js";
import type { FoundationIssue } from "../../../src/domain/foundations/foundation-issue.js";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (text: string) => out.push(text), err: (text: string) => err.push(text) }, out, err };
}

const host: AnalysisHost = { root: "/repo", designSystemPath: "/repo/design-system" };

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
      token({ path: "color.action", level: "semantic" }),
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

function drive(r: FoundationsResult) {
  const c = capture();
  new FoundationsTerminalReporter(c.io).completed(r);
  return { ...c, text: c.out.join("") + c.err.join("") };
}

describe("FoundationsTerminalReporter (T030/T031)", () => {
  it("valid -> stdout con resumen, 9 categorias en orden canonico y limites", () => {
    const { out, err, text } = drive(result("valid"));

    expect(err).toEqual([]);
    expect(out).toHaveLength(1);
    expect(text).toContain("Foundations: valid");
    expect(text).toContain("Host: /repo");
    expect(text).toContain("Estado estructural: complete-valid");
    expect(text).toContain("Categorías: absent=8, partial=0, complete=1, invalid=0");
    expect(text).toContain("Tokens: total=2, primitive=1, semantic=1, unclassified=0, unresolved=0");
    expect(text).toContain("Límites:");
    expect(text).toContain("Hits: ninguno");
    expect(text.match(/^  (color|spacing|typography|radius|border|shadow|opacity|sizing|motion):/gm)?.map((line) => line.trim().split(":")[0])).toEqual(
      FOUNDATION_CATEGORIES.map((definition) => definition.id),
    );
    expect(text).not.toMatch(/\u001b\[/u);
  });

  it("complete-invalid -> stderr con issues, conteos de categoria y unresolved", () => {
    const mismatch = analysisWarning("foundation-type-mismatch", "tipo incompatible", { document: "tokens", path: "spacing.bad" });
    const unresolved = token({ path: "brand.primary", category: "unresolved", level: "primitive" });
    const i = inspection({
      categories: [
        category("color", "absent"),
        category("spacing", "invalid", [token({ path: "spacing.bad", category: "spacing", effectiveType: "color" })], [mismatch]),
        ...FOUNDATION_CATEGORIES.slice(2).map((definition) => category(definition.id, "absent")),
      ],
      unresolved: [unresolved],
      issues: [mismatch, analysisWarning("foundation-category-unresolved", "sin categoria", { document: "tokens", path: "brand.primary" })],
    });
    const { out, err, text } = drive(result("complete-invalid", i));

    expect(out).toEqual([]);
    expect(err).toHaveLength(1);
    expect(text).toContain("Foundations: complete-invalid");
    expect(text).toContain("  spacing: invalid · depth=surface · total=1 · primitive=1 · semantic=0 · unclassified=0 · issues=1");
    expect(text).toContain("Unresolved:");
    expect(text).toContain("  Total: 1");
    expect(text).toContain("  brand.primary: unresolved primitive (token) color");
    expect(text).toContain("[warning] foundation-type-mismatch (tokens:spacing.bad)");
  });

  it("partial init conceptual -> color partial, 8 absent y advertencias en stderr", () => {
    const warnings = [
      analysisWarning("foundation-token-unclassified", "sin metadata", { document: "tokens", path: "color.base" }),
      analysisWarning("foundation-token-unclassified", "sin metadata", { document: "tokens", path: "color.brand" }),
    ];
    const i = inspection({
      categories: [
        category("color", "partial", [
          token({ path: "color.base", level: "unclassified", levelSource: "none" }),
          token({ path: "color.brand", level: "unclassified", levelSource: "none" }),
        ], warnings),
        ...FOUNDATION_CATEGORIES.slice(1).map((definition) => category(definition.id, "absent")),
      ],
      issues: warnings,
    });
    const { out, text } = drive(result("partial", i));

    expect(out).toEqual([]);
    expect(text).toContain("Foundations: partial");
    expect(text).toContain("Categorías: absent=8, partial=1, complete=0, invalid=0");
    expect(text).toContain("  color: partial · depth=deep · total=2 · primitive=0 · semantic=0 · unclassified=2 · issues=2");
    expect(text).toContain("Advertencias: 2");
  });

  it("not-found -> stderr sin inspeccion ni categorias inventadas", () => {
    const { out, err, text } = drive({ outcome: "not-found", host: null, inspection: null, hostError: null });

    expect(out).toEqual([]);
    expect(err).toHaveLength(1);
    expect(text).toContain("Foundations: not-found");
    expect(text).toContain("Host: (no resuelto)");
    expect(text).toContain("Inspección: no disponible");
    expect(text).not.toContain("Categorías:");
  });

  it("read-error -> stderr y conserva la inspeccion recuperable", () => {
    const readIssue = analysisError("read-failed", "no se pudo leer", { document: "tokens" });
    const i = inspection({ issues: [readIssue], structuralState: "complete-invalid" });
    const { text } = drive(result("read-error", i));

    expect(text).toContain("Foundations: read-error");
    expect(text).toContain("Estado estructural: complete-invalid");
    expect(text).toContain("[error] read-failed (tokens)");
    expect(text).toContain("Categorías:");
  });

  it("limites alcanzados se muestran sin alterar el modelo headless", () => {
    const i = inspection({
      limits: analysisLimitsResult([{ limit: "nodes", detail: "> 100000" }]),
    });
    const before = i.categories[0]?.tokens.length;
    const { text } = drive(result("partial", i));

    expect(text).toContain("Alcanzados: sí · Parcial: sí");
    expect(text).toContain("  - nodes: > 100000");
    expect(i.categories[0]?.tokens.length).toBe(before);
  });

  it("salida determinista para la misma entrada, sin TTY ni prompts", () => {
    const r = result("complete-invalid", inspection({
      issues: [analysisError("foundation-forbidden-dependency", "dependencia prohibida", { document: "tokens", path: "color.alias" })],
    }));

    expect(drive(r).text).toBe(drive(r).text);
  });
});
