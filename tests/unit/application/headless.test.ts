// T046 — Confirma que los casos de uso son headless: sin filesystem/Node/Commander/Clack/TTY/proceso,
// con analyzer programado y reporters de grabación; CLI es opcional.
import { describe, expect, it, vi } from "vitest";
import { validateDesignSystem } from "../../../src/application/validate-design-system.js";
import { inspectDesignSystem } from "../../../src/application/inspect-design-system.js";
import { scriptedAnalyzer, RecordingValidationReporter, RecordingInspectionReporter } from "../../helpers/analysis-fakes.js";
import { analysisValid, analysisCompleteInvalid } from "../../helpers/analysis-fixtures.js";

describe("T046 — headless (sin terminal ni filesystem)", () => {
  it("validate: una llamada al analyzer, eventos en orden, sin código numérico", async () => {
    const analysis = Object.freeze(analysisValid());
    const analyze = vi.fn(scriptedAnalyzer(analysis));
    const reporter = new RecordingValidationReporter();
    const r = await validateDesignSystem({ executionDir: "/x" }, { analyze, reporter });
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(reporter.calls).toEqual(["host:/repo", "state:complete-valid", "validated:true", "completed:valid"]);
    expect("exitCode" in (r as object)).toBe(false);
    expect(analysis.nodes).toEqual([]); // sin mutación
  });

  it("inspect: inspección recuperable en complete-invalid; sin mutar el análisis", async () => {
    const analysis = Object.freeze(analysisCompleteInvalid());
    const analyze = vi.fn(scriptedAnalyzer(analysis));
    const reporter = new RecordingInspectionReporter();
    const r = await inspectDesignSystem({ executionDir: "/x" }, { analyze, reporter });
    expect(r.outcome).toBe("complete-invalid");
    if (r.outcome === "complete-invalid") expect(r.inspection.validation.valid).toBe(false);
    expect(reporter.calls[reporter.calls.length - 1]).toBe("completed:complete-invalid");
  });

  it("excepción inesperada del analyzer se propaga; el reporter no recibe falso éxito", async () => {
    const reporter = new RecordingValidationReporter();
    const analyze = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(validateDesignSystem({ executionDir: "/x" }, { analyze, reporter })).rejects.toThrow("boom");
    expect(reporter.calls).toEqual([]);
  });
});
