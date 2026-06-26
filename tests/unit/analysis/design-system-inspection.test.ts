// T013 — DesignSystemInspection: forma canónica; incluye validación; confiabilidad por sección.
import { describe, expect, it } from "vitest";
import { valid, unavailable } from "../../../src/domain/analysis/inspected-value.js";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import type { DesignSystemInspection } from "../../../src/domain/analysis/design-system-inspection.js";

const baseValidation = validationReport({
  structuralState: "complete-valid",
  checkedDocuments: [],
  uncheckedDocuments: [],
  errors: [],
  warnings: [],
  limits: noLimitsReached,
});

describe("DesignSystemInspection", () => {
  it("incluye el ValidationReport (no lo sustituye)", () => {
    const inspection: DesignSystemInspection = {
      host: { root: "/repo", designSystemPath: "/repo/design-system" },
      structuralState: "complete-valid",
      files: { expected: ["neuraz-ds.config.json"], present: [], missing: [] },
      validation: baseValidation,
      limits: noLimitsReached,
    };
    expect(inspection.validation.valid).toBe(true);
    expect(inspection.host.designSystemPath).toBe("/repo/design-system");
  });

  it("designSystemPath puede ser null (no inicializado)", () => {
    const inspection: DesignSystemInspection = {
      host: { root: "/repo", designSystemPath: null },
      structuralState: "not-initialized",
      files: { expected: ["neuraz-ds.config.json"], present: [], missing: ["neuraz-ds.config.json"] },
      validation: { ...baseValidation, structuralState: "not-initialized" },
      limits: noLimitsReached,
    };
    expect(inspection.host.designSystemPath).toBeNull();
    expect(inspection.files.missing).toContain("neuraz-ds.config.json");
  });

  it("marca confiabilidad por sección (identity con valid/unavailable)", () => {
    const inspection: DesignSystemInspection = {
      host: { root: "/repo", designSystemPath: "/repo/ds" },
      structuralState: "complete-invalid",
      identity: { name: valid("Acme"), slug: unavailable },
      files: { expected: [], present: [], missing: [] },
      validation: { ...baseValidation, valid: false, structuralState: "complete-invalid" },
      limits: noLimitsReached,
    };
    expect(inspection.identity?.name).toEqual({ value: "Acme", trust: "valid" });
    expect(inspection.identity?.slug).toEqual({ trust: "unavailable" });
  });

  it("bloque tokens incluye estadísticas + paths", () => {
    const inspection: DesignSystemInspection = {
      host: { root: "/repo", designSystemPath: "/repo/ds" },
      structuralState: "complete-valid",
      files: { expected: [], present: [], missing: [] },
      tokens: {
        total: 1,
        groups: 1,
        concreteValues: 1,
        aliases: 0,
        byType: { color: 1 },
        maxDepth: 2,
        aliasIssues: 0,
        paths: [
          {
            path: "color.blue",
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
          },
        ],
      },
      validation: baseValidation,
      limits: noLimitsReached,
    };
    expect(inspection.tokens?.total).toBe(1);
    expect(inspection.tokens?.paths).toHaveLength(1);
    expect(inspection.tokens?.byType).toEqual({ color: 1 });
  });
});
