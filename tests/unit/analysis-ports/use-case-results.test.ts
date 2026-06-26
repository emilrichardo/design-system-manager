// T020 — Resultados públicos discriminados de validate/inspect (estados semánticos, sin exit codes).
import { describe, expect, it } from "vitest";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";
import { analysisLimitsResult, noLimitsReached } from "../../../src/domain/traversal/limits.js";
import type {
  InspectDesignSystemResult,
  ValidateDesignSystemResult,
} from "../../../src/application/analysis-ports.js";
import type { DesignSystemInspection } from "../../../src/domain/analysis/design-system-inspection.js";
import { hostRoot } from "../../helpers/analysis-fixtures.js";

const validReport = validationReport({
  structuralState: "complete-valid",
  checkedDocuments: ["neuraz-ds.config.json"],
  uncheckedDocuments: [],
  errors: [],
  warnings: [],
  limits: noLimitsReached,
});

const invalidReport = validationReport({
  structuralState: "complete-invalid",
  checkedDocuments: ["neuraz-ds.config.json"],
  uncheckedDocuments: [],
  errors: [analysisError("dtcg-type-unrecognized", "tipo no reconocido", { document: "tokens" })],
  warnings: [],
  limits: noLimitsReached,
});

function inspection(state: DesignSystemInspection["structuralState"], report = validReport): DesignSystemInspection {
  return {
    host: { root: "/repo", designSystemPath: "/repo/design-system" },
    structuralState: state,
    files: { expected: [], present: [], missing: [] },
    validation: report,
    limits: report.limits,
  };
}

describe("ValidateDesignSystemResult (T020)", () => {
  it("valid lleva host + report válido", () => {
    const r: ValidateDesignSystemResult = { outcome: "valid", host: hostRoot(), report: validReport };
    expect(r.outcome).toBe("valid");
    if (r.outcome === "valid") expect(r.report.valid).toBe(true);
  });

  it("complete-invalid preserva el ValidationReport con errores", () => {
    const r: ValidateDesignSystemResult = {
      outcome: "complete-invalid",
      host: hostRoot(),
      report: invalidReport,
    };
    if (r.outcome === "complete-invalid") {
      expect(r.report.valid).toBe(false);
      expect(r.report.errors).toHaveLength(1);
    }
  });

  it("partial por límite duro alcanzado", () => {
    const partialReport = validationReport({
      structuralState: "partial",
      checkedDocuments: [],
      uncheckedDocuments: ["design-system/tokens/base.tokens.json"],
      errors: [],
      warnings: [],
      limits: analysisLimitsResult([{ limit: "nodes", detail: ">100000" }]),
    });
    const r: ValidateDesignSystemResult = { outcome: "partial", host: hostRoot(), report: partialReport };
    if (r.outcome === "partial") expect(r.report.limits.partial).toBe(true);
  });

  it("not-found puede no tener host ni report (host error)", () => {
    const r: ValidateDesignSystemResult = {
      outcome: "not-found",
      host: null,
      report: null,
      hostError: { code: "package-json-missing", message: "sin package.json" },
    };
    if (r.outcome === "not-found") expect(r.hostError?.code).toBe("package-json-missing");
  });

  it("read-error conserva host y report con el issue de lectura", () => {
    const readReport = validationReport({
      structuralState: "partial",
      checkedDocuments: [],
      uncheckedDocuments: ["design-system/design-system.json"],
      errors: [analysisError("read-failed", "EACCES", { document: "manifest" })],
      warnings: [],
      limits: noLimitsReached,
    });
    const r: ValidateDesignSystemResult = { outcome: "read-error", host: hostRoot(), report: readReport };
    if (r.outcome === "read-error") expect(r.report.errors[0]?.code).toBe("read-failed");
  });

  it("ningún resultado expone un código numérico de proceso", () => {
    const r: ValidateDesignSystemResult = { outcome: "valid", host: hostRoot(), report: validReport };
    expect("exitCode" in (r as object)).toBe(false);
  });
});

describe("InspectDesignSystemResult (T020)", () => {
  it("complete-invalid entrega inspección recuperable (no null)", () => {
    const r: InspectDesignSystemResult = {
      outcome: "complete-invalid",
      host: hostRoot(),
      inspection: inspection("complete-invalid", invalidReport),
    };
    if (r.outcome === "complete-invalid") {
      expect(r.inspection.structuralState).toBe("complete-invalid");
      expect(r.inspection.validation.valid).toBe(false);
    }
  });

  it("partial entrega inspección recuperable", () => {
    const r: InspectDesignSystemResult = {
      outcome: "partial",
      host: hostRoot(),
      inspection: inspection("partial"),
    };
    if (r.outcome === "partial") expect(r.inspection.structuralState).toBe("partial");
  });

  it("not-found puede carecer de inspección", () => {
    const r: InspectDesignSystemResult = {
      outcome: "not-found",
      host: null,
      inspection: null,
      hostError: { code: "package-json-missing", message: "sin package.json" },
    };
    if (r.outcome === "not-found") expect(r.inspection).toBeNull();
  });
});
