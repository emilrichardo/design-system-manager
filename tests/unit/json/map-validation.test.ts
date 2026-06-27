// T008 (003) — toJsonValidation: proyección fiel de ValidationReport (sin host), copias defensivas.
import { describe, expect, it } from "vitest";
import { toJsonValidation } from "../../../src/application/json/map-validation.js";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";
import { analysisLimitsResult, noLimitsReached } from "../../../src/domain/traversal/limits.js";

const validRep = validationReport({
  structuralState: "complete-valid",
  checkedDocuments: ["neuraz-ds.config.json", "design-system/design-system.json"],
  uncheckedDocuments: [],
  errors: [],
  warnings: [],
  limits: noLimitsReached,
  tokens: 2,
});

describe("toJsonValidation (T008)", () => {
  it("válido: copia valid/state/documents/summary/limits", () => {
    const out = toJsonValidation(validRep);
    expect(out).toEqual({
      valid: true,
      structuralState: "complete-valid",
      checkedDocuments: ["neuraz-ds.config.json", "design-system/design-system.json"],
      uncheckedDocuments: [],
      summary: { errors: 0, warnings: 0, tokens: 2 },
      errors: [],
      warnings: [],
      limits: { reached: false, partial: false, hits: [] },
    });
  });

  it("inválido con error: valid=false y issue mapeado (sin reclasificar)", () => {
    const rep = validationReport({
      structuralState: "complete-invalid",
      checkedDocuments: ["design-system/tokens/base.tokens.json"],
      uncheckedDocuments: [],
      errors: [analysisError("dtcg-type-unrecognized", "tipo", { document: "tokens", path: "a.b" })],
      warnings: [],
      limits: noLimitsReached,
    });
    const out = toJsonValidation(rep);
    expect(out.valid).toBe(false);
    expect(out.errors).toEqual([
      { severity: "error", code: "dtcg-type-unrecognized", message: "tipo", document: "tokens", path: "a.b" },
    ]);
  });

  it("warnings sin errores no invalidan; tokens null cuando no se aporta", () => {
    const rep = validationReport({
      structuralState: "complete-valid",
      checkedDocuments: [],
      uncheckedDocuments: [],
      errors: [],
      warnings: [analysisWarning("dtcg-type-not-deeply-inspected", "no profundo", { document: "tokens" })],
      limits: noLimitsReached,
    });
    const out = toJsonValidation(rep);
    expect(out.valid).toBe(true);
    expect(out.warnings).toHaveLength(1);
    expect(out.summary.tokens).toBeNull();
  });

  it("límite duro → partial reflejado tal cual", () => {
    const rep = validationReport({
      structuralState: "partial",
      checkedDocuments: [],
      uncheckedDocuments: ["design-system/tokens/base.tokens.json"],
      errors: [],
      warnings: [],
      limits: analysisLimitsResult([{ limit: "nodes", detail: ">100000" }]),
    });
    const out = toJsonValidation(rep);
    expect(out.limits.partial).toBe(true);
    expect(out.valid).toBe(false);
    expect(out.uncheckedDocuments).toEqual(["design-system/tokens/base.tokens.json"]);
  });

  it("preserva el orden de issues y usa arrays defensivos (no comparte referencia)", () => {
    const rep = validationReport({
      structuralState: "complete-invalid",
      checkedDocuments: ["a"],
      uncheckedDocuments: [],
      errors: [analysisError("e1", "m1"), analysisError("e2", "m2")],
      warnings: [],
      limits: noLimitsReached,
    });
    const out = toJsonValidation(rep);
    expect(out.errors.map((e) => e.code)).toEqual(["e1", "e2"]);
    expect(out.errors).not.toBe(rep.errors);
    expect(out.checkedDocuments).not.toBe(rep.checkedDocuments);
  });

  it("no muta el report congelado; determinista", () => {
    const out1 = toJsonValidation(validRep);
    const out2 = toJsonValidation(validRep);
    expect(out1).toEqual(out2);
  });
});
