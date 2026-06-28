// T039 (004) - FoundationsJsonReporter sobre IO falso capturable.
import { describe, expect, it, vi } from "vitest";
import { FOUNDATION_CATEGORIES, foundationCategoryDefinition, type FoundationCategoryId } from "../../../src/domain/foundations/foundation-category.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import { computeFoundationLevelCounts, computeFoundationsSummary, computeFoundationsValidation } from "../../../src/application/foundations/summary.js";
import { FoundationsJsonReporter } from "../../../src/infrastructure/reporter/foundations-json-reporter.js";
import { deepFreeze } from "../json/json-test-utils.js";
import type {
  FoundationCategoryInspection,
  FoundationsInspection,
  FoundationsResult,
  FoundationTokenInspection,
} from "../../../src/application/foundations/foundations-ports.js";
import type { AnalysisHost } from "../../../src/domain/analysis/design-system-analysis.js";

function recordingIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { out: (text: string) => out.push(text), err: (text: string) => err.push(text), outBuf: out, errBuf: err };
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

function inspection(tokens: readonly FoundationTokenInspection[] = [token()]): FoundationsInspection {
  const categories = [
    category("color", tokens.length > 0 ? "complete" : "absent", tokens),
    ...FOUNDATION_CATEGORIES.slice(1).map((definition) => category(definition.id, "absent")),
  ];
  return {
    host,
    structuralState: "complete-valid",
    categories,
    unresolved: [],
    summary: computeFoundationsSummary(categories, [], []),
    validation: computeFoundationsValidation([], noLimitsReached),
    limits: noLimitsReached,
  };
}

function result(outcome: Exclude<FoundationsResult["outcome"], "not-found">, i = inspection()): FoundationsResult {
  return { outcome, host, inspection: i } as FoundationsResult;
}

describe("FoundationsJsonReporter - eventos previos no escriben (T038/T039)", () => {
  it("hostResolved/structuralStateDetected/inspected no emiten nada", () => {
    const io = recordingIO();
    const reporter = new FoundationsJsonReporter(io);
    reporter.hostResolved();
    reporter.structuralStateDetected();
    reporter.inspected();
    expect(io.outBuf).toEqual([]);
    expect(io.errBuf).toEqual([]);
  });
});

describe("FoundationsJsonReporter - completed emite una vez en stdout (T038/T039)", () => {
  const cases: FoundationsResult[] = [
    result("valid"),
    result("complete-invalid"),
    result("partial"),
    result("read-error"),
    { outcome: "not-found", host: null, inspection: null, hostError: null },
  ];

  for (const item of cases) {
    it(`${item.outcome}: stdout unico, stderr vacio y JSON parseable`, () => {
      const io = recordingIO();
      new FoundationsJsonReporter(io).completed(item);
      expect(io.outBuf).toHaveLength(1);
      expect(io.errBuf).toHaveLength(0);
      const parsed = JSON.parse(io.outBuf[0]!);
      expect(parsed.command).toBe("foundations");
      expect(parsed.outcome).toBe(item.outcome);
      if (item.outcome === "not-found") expect(parsed.error).toBeNull();
      expect(io.outBuf[0]).not.toContain("Foundations:");
    });
  }

  it(">200 tokens se conservan sin truncado", () => {
    const io = recordingIO();
    const many = Array.from({ length: 250 }, (_, index) => token({ path: `color.t${index}` }));
    new FoundationsJsonReporter(io).completed(result("valid", inspection(many)));
    const parsed = JSON.parse(io.outBuf[0]!);

    expect(parsed.result.categories[0].tokens).toHaveLength(250);
    expect(io.outBuf[0]).not.toContain("no se muestran");
  });

  it("no muta el resultado congelado", () => {
    const frozen = deepFreeze(result("valid", inspection([token(), token({ path: "color.role", level: "semantic" })])));
    expect(() => new FoundationsJsonReporter(recordingIO()).completed(frozen)).not.toThrow();
  });

  it("propaga error de IO sin fallback a stderr", () => {
    const out = vi.fn(() => {
      throw new Error("EPIPE");
    });
    const err = vi.fn();
    const reporter = new FoundationsJsonReporter({ out, err });

    expect(() => reporter.completed(result("valid"))).toThrow("EPIPE");
    expect(out).toHaveBeenCalledTimes(1);
    expect(err).not.toHaveBeenCalled();
  });
});
