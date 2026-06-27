// T033 — Matriz de comportamiento por estado: validate/inspect coinciden en outcome; inspección
// recuperable salvo not-found. Clasificación por señales estructuradas (classifyAnalysisOutcome).
import { describe, expect, it, vi } from "vitest";
import { validateDesignSystem } from "../../../src/application/validate-design-system.js";
import { inspectDesignSystem } from "../../../src/application/inspect-design-system.js";
import { classifyAnalysisOutcome } from "../../../src/application/classify-analysis-outcome.js";
import { RecordingInspectionReporter, RecordingValidationReporter } from "../../helpers/analysis-fakes.js";
import {
  analysisCompleteInvalid,
  analysisHostFailure,
  analysisNotInitialized,
  analysisPartial,
  analysisReadError,
  analysisValid,
} from "../../helpers/analysis-fixtures.js";
import type { DesignSystemAnalysis } from "../../../src/domain/analysis/design-system-analysis.js";
import type { AnalysisOutcome } from "../../../src/application/analysis-ports.js";

const matrix: ReadonlyArray<[string, () => DesignSystemAnalysis, AnalysisOutcome, boolean]> = [
  ["not-initialized", analysisNotInitialized, "not-found", false],
  ["host-failure", analysisHostFailure, "not-found", false],
  ["partial", analysisPartial, "partial", true],
  ["complete-invalid semántico", analysisCompleteInvalid, "complete-invalid", true],
  ["complete-invalid operativo", analysisReadError, "read-error", true],
  ["complete-valid", analysisValid, "valid", true],
];

describe("T033 — matriz de outcomes validate ≡ inspect", () => {
  it.each(matrix)("%s → %s (inspección recuperable: %s)", async (_label, build, expected, recoverable) => {
    const analysis = build();
    expect(classifyAnalysisOutcome(analysis)).toBe(expected);

    const v = await validateDesignSystem({ executionDir: "/x" }, { analyze: vi.fn(async () => analysis), reporter: new RecordingValidationReporter() });
    const i = await inspectDesignSystem({ executionDir: "/x" }, { analyze: vi.fn(async () => analysis), reporter: new RecordingInspectionReporter() });

    expect(v.outcome).toBe(expected);
    expect(i.outcome).toBe(expected);
    // misma semántica de validación en ambos comandos
    if (v.outcome !== "not-found" && i.outcome !== "not-found") {
      expect(i.inspection.validation.valid).toBe(v.report.valid);
    }
    // inspección recuperable salvo not-found
    if (i.outcome === "not-found") expect(i.inspection).toBeNull();
    else expect(i.inspection).not.toBeNull();
    expect(recoverable).toBe(i.outcome !== "not-found");
  });

  it("determinismo: misma estructura ⇒ mismos outcome/report/inspection", async () => {
    const a1 = analysisCompleteInvalid();
    const a2 = analysisCompleteInvalid();
    const v1 = await validateDesignSystem({ executionDir: "/x" }, { analyze: vi.fn(async () => a1), reporter: new RecordingValidationReporter() });
    const v2 = await validateDesignSystem({ executionDir: "/x" }, { analyze: vi.fn(async () => a2), reporter: new RecordingValidationReporter() });
    expect(v1).toEqual(v2);
  });
});
