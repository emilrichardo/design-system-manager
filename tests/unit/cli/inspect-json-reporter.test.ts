// T018 (003) — InspectJsonReporter: solo `completed` escribe (una vez), a stdout, sin cota de 200.
import { describe, expect, it, vi } from "vitest";
import { InspectJsonReporter } from "../../../src/infrastructure/reporter/inspect-json-reporter.js";
import type { InspectDesignSystemResult } from "../../../src/application/analysis-ports.js";
import type {
  DesignSystemInspection,
  TokensInspection,
} from "../../../src/domain/analysis/design-system-inspection.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";
import { valid } from "../../../src/domain/analysis/inspected-value.js";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import { analysisHost } from "../../helpers/analysis-fixtures.js";
import { deepFreeze } from "../json/json-test-utils.js";

function recordingIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { out: (t: string) => out.push(t), err: (t: string) => err.push(t), outBuf: out, errBuf: err };
}

function tokens(count: number): TokensInspection {
  const paths: TokenNodeSummary[] = Array.from({ length: count }, (_, i) => ({
    path: `color.t${i}`,
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
  }));
  return { total: count, groups: 1, concreteValues: count, aliases: 0, byType: count > 0 ? { color: count } : {}, maxDepth: count > 0 ? 2 : 0, aliasIssues: 0, paths };
}

function inspection(tok?: TokensInspection): DesignSystemInspection {
  return {
    host: { root: "/repo", designSystemPath: "/repo/design-system" },
    structuralState: "complete-valid",
    identity: { name: valid("Acme") },
    files: { expected: ["neuraz-ds.config.json"], present: [{ relativePath: "neuraz-ds.config.json", kind: "file", readable: true }], missing: [] },
    ...(tok ? { tokens: tok } : {}),
    validation: validationReport({
      structuralState: "complete-valid",
      checkedDocuments: ["neuraz-ds.config.json"],
      uncheckedDocuments: [],
      errors: [],
      warnings: [],
      limits: noLimitsReached,
    }),
    limits: noLimitsReached,
  };
}

describe("InspectJsonReporter — eventos previos no escriben (T017)", () => {
  it("hostResolved/structuralStateDetected/inspected no emiten nada", () => {
    const io = recordingIO();
    const reporter = new InspectJsonReporter(io);
    reporter.hostResolved(analysisHost());
    reporter.structuralStateDetected("complete-valid");
    reporter.inspected(inspection());
    expect(io.outBuf).toHaveLength(0);
    expect(io.errBuf).toHaveLength(0);
  });
});

describe("InspectJsonReporter — completed emite una vez en stdout (T017)", () => {
  const cases: InspectDesignSystemResult[] = [
    { outcome: "valid", host: analysisHost(), inspection: inspection(tokens(2)) },
    { outcome: "complete-invalid", host: analysisHost(), inspection: inspection() },
    { outcome: "partial", host: analysisHost(), inspection: inspection() },
    { outcome: "read-error", host: analysisHost(), inspection: inspection() },
    { outcome: "not-found", host: null, inspection: null, hostError: null },
  ];

  for (const result of cases) {
    it(`${result.outcome}: una escritura en stdout, stderr vacío, JSON parseable`, () => {
      const io = recordingIO();
      new InspectJsonReporter(io).completed(result);
      expect(io.outBuf).toHaveLength(1);
      expect(io.errBuf).toHaveLength(0);
      const parsed = JSON.parse(io.outBuf[0]!);
      expect(parsed.command).toBe("inspect");
      expect(parsed.outcome).toBe(result.outcome);
      if (result.outcome === "not-found") expect(parsed.error).toBeNull();
      expect(io.outBuf[0]).not.toContain("Mostrando");
    });
  }

  for (const count of [199, 200, 201, 250]) {
    it(`conserva los ${count} paths sin truncado`, () => {
      const io = recordingIO();
      new InspectJsonReporter(io).completed({ outcome: "valid", host: analysisHost(), inspection: inspection(tokens(count)) });
      const parsed = JSON.parse(io.outBuf[0]!);
      expect(parsed.result.tokens.paths).toHaveLength(count);
      expect(io.outBuf[0]).not.toContain("no se muestran");
    });
  }

  it("no muta el resultado congelado", () => {
    const result = deepFreeze<InspectDesignSystemResult>({ outcome: "valid", host: analysisHost(), inspection: inspection(tokens(3)) });
    expect(() => new InspectJsonReporter(recordingIO()).completed(result)).not.toThrow();
  });

  it("propaga un error de IO sin segunda escritura ni fallback", () => {
    const out = vi.fn(() => {
      throw new Error("EPIPE");
    });
    const err = vi.fn();
    const reporter = new InspectJsonReporter({ out, err });
    expect(() => reporter.completed({ outcome: "valid", host: analysisHost(), inspection: inspection(tokens(1)) })).toThrow("EPIPE");
    expect(out).toHaveBeenCalledTimes(1);
    expect(err).not.toHaveBeenCalled();
  });
});
