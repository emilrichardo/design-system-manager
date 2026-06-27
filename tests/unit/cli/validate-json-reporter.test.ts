// T016 (003) — ValidateJsonReporter: solo `completed` escribe (una vez), a stdout, JSON puro.
import { describe, expect, it, vi } from "vitest";
import { ValidateJsonReporter } from "../../../src/infrastructure/reporter/validate-json-reporter.js";
import type { ValidateDesignSystemResult } from "../../../src/application/analysis-ports.js";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import { analysisHost } from "../../helpers/analysis-fixtures.js";
import { deepFreeze } from "../json/json-test-utils.js";

function recordingIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { out: (t: string) => out.push(t), err: (t: string) => err.push(t), outBuf: out, errBuf: err };
}

function validReport() {
  return validationReport({
    structuralState: "complete-valid",
    checkedDocuments: ["neuraz-ds.config.json"],
    uncheckedDocuments: [],
    errors: [],
    warnings: [],
    limits: noLimitsReached,
    tokens: 2,
  });
}

describe("ValidateJsonReporter — eventos previos no escriben (T015)", () => {
  it("hostResolved/structuralStateDetected/validated no emiten nada", () => {
    const io = recordingIO();
    const reporter = new ValidateJsonReporter(io);
    reporter.hostResolved(analysisHost());
    reporter.structuralStateDetected("complete-valid");
    reporter.validated(validReport());
    expect(io.outBuf).toHaveLength(0);
    expect(io.errBuf).toHaveLength(0);
  });
});

describe("ValidateJsonReporter — completed emite una vez en stdout (T015)", () => {
  const cases: ValidateDesignSystemResult[] = [
    { outcome: "valid", host: analysisHost(), report: validReport() },
    {
      outcome: "complete-invalid",
      host: analysisHost(),
      report: validationReport({
        structuralState: "complete-invalid",
        checkedDocuments: ["design-system/tokens/base.tokens.json"],
        uncheckedDocuments: [],
        errors: [analysisError("dtcg-type-unrecognized", "tipo", { document: "tokens", context: { x: 1 } })],
        warnings: [],
        limits: noLimitsReached,
      }),
    },
    { outcome: "partial", host: analysisHost(), report: validReport() },
    { outcome: "read-error", host: analysisHost(), report: validReport() },
    { outcome: "not-found", host: null, report: null, hostError: null },
  ];

  for (const result of cases) {
    it(`${result.outcome}: una escritura en stdout, stderr vacío, JSON parseable`, () => {
      const io = recordingIO();
      new ValidateJsonReporter(io).completed(result);
      expect(io.outBuf).toHaveLength(1);
      expect(io.errBuf).toHaveLength(0);
      const parsed = JSON.parse(io.outBuf[0]!);
      expect(parsed.formatVersion).toBe("1.0.0");
      expect(parsed.command).toBe("validate");
      expect(parsed.outcome).toBe(result.outcome);
      if (result.outcome === "not-found") {
        expect(parsed.result).toBeNull();
        expect(parsed.error).toBeNull();
      }
      // No expone `context` ni texto humano del reporter textual.
      expect(io.outBuf[0]).not.toContain("context");
      expect(io.outBuf[0]).not.toContain("Validación del Design System");
    });
  }

  it("escribe el documento completo en una sola operación de IO", () => {
    const io = recordingIO();
    new ValidateJsonReporter(io).completed({ outcome: "valid", host: analysisHost(), report: validReport() });
    expect(io.outBuf).toHaveLength(1);
    expect(io.outBuf[0]!.endsWith("}\n")).toBe(true);
  });

  it("no muta el resultado congelado", () => {
    const result = deepFreeze<ValidateDesignSystemResult>({ outcome: "valid", host: analysisHost(), report: validReport() });
    expect(() => new ValidateJsonReporter(recordingIO()).completed(result)).not.toThrow();
  });

  it("propaga un error de IO sin segunda escritura ni fallback", () => {
    const out = vi.fn(() => {
      throw new Error("EPIPE");
    });
    const err = vi.fn();
    const reporter = new ValidateJsonReporter({ out, err });
    expect(() => reporter.completed({ outcome: "valid", host: analysisHost(), report: validReport() })).toThrow("EPIPE");
    expect(out).toHaveBeenCalledTimes(1);
    expect(err).not.toHaveBeenCalled();
  });
});
