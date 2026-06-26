// T012 — ValidationReport: invariantes de validez, separación error/warning, límites.
import { describe, expect, it } from "vitest";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import {
  analysisLimitsResult,
  noLimitsReached,
} from "../../../src/domain/traversal/limits.js";

describe("validationReport", () => {
  it("sin errores y sin límite ⇒ valid true", () => {
    const r = validationReport({
      structuralState: "complete-valid",
      checkedDocuments: ["neuraz-ds.config.json"],
      uncheckedDocuments: [],
      errors: [],
      warnings: [],
      limits: noLimitsReached,
      tokens: 3,
    });
    expect(r.valid).toBe(true);
    expect(r.summary).toEqual({ errors: 0, warnings: 0, tokens: 3 });
  });

  it("un warning por sí solo NO invalida", () => {
    const r = validationReport({
      structuralState: "complete-valid",
      checkedDocuments: [],
      uncheckedDocuments: [],
      errors: [],
      warnings: [analysisWarning("dtcg-description-missing", "falta descripción")],
      limits: noLimitsReached,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(1);
    expect(r.summary.warnings).toBe(1);
  });

  it("un error invalida", () => {
    const r = validationReport({
      structuralState: "complete-invalid",
      checkedDocuments: [],
      uncheckedDocuments: [],
      errors: [analysisError("dtcg-type-unrecognized", "tipo no reconocido")],
      warnings: [],
      limits: noLimitsReached,
    });
    expect(r.valid).toBe(false);
  });

  it("un límite duro alcanzado invalida aunque no haya errores", () => {
    const r = validationReport({
      structuralState: "partial",
      checkedDocuments: [],
      uncheckedDocuments: ["design-system/tokens/base.tokens.json"],
      errors: [],
      warnings: [],
      limits: analysisLimitsResult([{ limit: "nodes", detail: ">100000" }]),
    });
    expect(r.valid).toBe(false);
    expect(r.limits.partial).toBe(true);
  });

  it("arrays separados; copia defensiva (no muta entradas)", () => {
    const errors = [analysisError("a", "a")];
    const r = validationReport({
      structuralState: "complete-invalid",
      checkedDocuments: ["x"],
      uncheckedDocuments: ["y"],
      errors,
      warnings: [],
      limits: noLimitsReached,
    });
    errors.push(analysisError("b", "b"));
    expect(r.errors).toHaveLength(1);
    expect(r.checkedDocuments).toEqual(["x"]);
    expect(r.uncheckedDocuments).toEqual(["y"]);
  });

  it("summary sin tokens cuando no se proporciona", () => {
    const r = validationReport({
      structuralState: "not-initialized",
      checkedDocuments: [],
      uncheckedDocuments: [],
      errors: [],
      warnings: [],
      limits: noLimitsReached,
    });
    expect("tokens" in r.summary).toBe(false);
  });
});
