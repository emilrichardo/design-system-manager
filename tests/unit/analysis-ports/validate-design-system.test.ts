// T031 — validateDesignSystem (proyección + reporter + outcomes).
import { describe, expect, it, vi } from "vitest";
import { validateDesignSystem } from "../../../src/application/validate-design-system.js";
import type { ValidateDesignSystemDependencies } from "../../../src/application/analysis-ports.js";
import { RecordingValidationReporter } from "../../helpers/analysis-fakes.js";
import {
  analysisCompleteInvalid,
  analysisHostFailure,
  analysisNotInitialized,
  analysisPartial,
  analysisPartialByLimit,
  analysisReadError,
  analysisValid,
  designSystemAnalysis,
} from "../../helpers/analysis-fixtures.js";
import type { DesignSystemAnalysis } from "../../../src/domain/analysis/design-system-analysis.js";

function deps(analysis: DesignSystemAnalysis, reporter = new RecordingValidationReporter()) {
  const analyze = vi.fn(async () => analysis);
  const d: ValidateDesignSystemDependencies = { analyze, reporter };
  return { d, analyze, reporter };
}

describe("validateDesignSystem (T031)", () => {
  it("válido → outcome valid, report válido, host presente", async () => {
    const { d } = deps(analysisValid());
    const r = await validateDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("valid");
    if (r.outcome === "valid") {
      expect(r.report.valid).toBe(true);
      expect(r.host.root).toBe("/repo");
    }
  });

  it("complete-invalid semántico → outcome complete-invalid", async () => {
    const { d } = deps(analysisCompleteInvalid());
    const r = await validateDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("complete-invalid");
    if (r.outcome === "complete-invalid") expect(r.report.valid).toBe(false);
  });

  it("partial → outcome partial con report", async () => {
    const { d } = deps(analysisPartial());
    const r = await validateDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("partial");
    if (r.outcome === "partial") expect(r.report.uncheckedDocuments.length).toBeGreaterThan(0);
  });

  it("not-initialized → outcome not-found, host presente (resuelto)", async () => {
    const { d } = deps(analysisNotInitialized());
    const r = await validateDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("not-found");
    if (r.outcome === "not-found") expect(r.host).not.toBeNull();
  });

  it("host no encontrado → not-found, host null", async () => {
    const { d } = deps(analysisHostFailure());
    const r = await validateDesignSystem({ executionDir: "/exec" }, d);
    expect(r.outcome).toBe("not-found");
    if (r.outcome === "not-found") expect(r.host).toBeNull();
  });

  it("read error operativo → outcome read-error con report", async () => {
    const { d } = deps(analysisReadError());
    const r = await validateDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("read-error");
    if (r.outcome === "read-error") expect(r.report.errors.some((i) => i.code === "read-failed")).toBe(true);
  });

  it("warnings sin errores → válido", async () => {
    const { d } = deps(
      designSystemAnalysis({ warnings: [{ code: "dtcg-description-missing", message: "x", severity: "warning" }] }),
    );
    const r = await validateDesignSystem({ executionDir: "/repo" }, d);
    expect(r.outcome).toBe("valid");
    if (r.outcome === "valid") expect(r.report.warnings).toHaveLength(1);
  });

  it("límite parcial → read-error (limit-nodes es semántico) — y report inválido + partial", async () => {
    const { d } = deps(analysisPartialByLimit());
    const r = await validateDesignSystem({ executionDir: "/repo" }, d);
    // limit-nodes-exceeded NO está en códigos operativos → complete-invalid.
    expect(r.outcome).toBe("complete-invalid");
    if (r.outcome === "complete-invalid") expect(r.report.limits.partial).toBe(true);
  });

  it("llama a analyze exactamente una vez", async () => {
    const { d, analyze } = deps(analysisValid());
    await validateDesignSystem({ executionDir: "/repo" }, d);
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("emite eventos del reporter en orden, sin duplicados", async () => {
    const { d, reporter } = deps(analysisValid());
    await validateDesignSystem({ executionDir: "/repo" }, d);
    expect(reporter.calls).toEqual(["host:/repo", "state:complete-valid", "validated:true", "completed:valid"]);
  });

  it("host no resuelto: no emite hostResolved", async () => {
    const { d, reporter } = deps(analysisHostFailure());
    await validateDesignSystem({ executionDir: "/exec" }, d);
    expect(reporter.calls.some((c) => c.startsWith("host:"))).toBe(false);
    expect(reporter.calls[reporter.calls.length - 1]).toBe("completed:not-found");
  });

  it("resultado sin exit code; no muta el análisis", async () => {
    const analysis = Object.freeze(analysisValid());
    const { d } = deps(analysis);
    const r = await validateDesignSystem({ executionDir: "/repo" }, d);
    expect("exitCode" in (r as object)).toBe(false);
    expect(analysis.errors).toEqual([]); // sin mutación
  });

  it("propaga una excepción inesperada del analyzer (no la enmascara)", async () => {
    const analyze = vi.fn(async () => {
      throw new Error("boom");
    });
    const reporter = new RecordingValidationReporter();
    await expect(validateDesignSystem({ executionDir: "/repo" }, { analyze, reporter })).rejects.toThrow("boom");
    expect(reporter.calls).toEqual([]); // no reporta un éxito falso
  });
});
