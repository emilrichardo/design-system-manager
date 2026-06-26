// T014 — DesignSystemAnalysis: modelo interno común (sin FS/CLI/exit code).
import { describe, expect, it } from "vitest";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";
import { emptyStatistics } from "../../../src/domain/analysis/inspection-statistics.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import type {
  DesignSystemAnalysis,
  ParsedDocument,
} from "../../../src/domain/analysis/design-system-analysis.js";

describe("DesignSystemAnalysis", () => {
  it("contiene host, presencia, estado, documentos, nodos, estadísticas, límites y validez", () => {
    const doc: ParsedDocument = {
      relativePath: "neuraz-ds.config.json",
      exists: true,
      kind: "file",
      parsed: { configSchemaVersion: "1.0.0", designSystemDir: "design-system" },
      trust: "valid",
      issues: [],
    };
    const analysis: DesignSystemAnalysis = {
      host: { root: "/repo", designSystemPath: "/repo/design-system" },
      presence: { present: ["neuraz-ds.config.json"], missing: [] },
      structuralState: "complete-valid",
      documents: { "neuraz-ds.config.json": doc },
      nodes: [],
      statistics: emptyStatistics,
      errors: [],
      warnings: [],
      limits: noLimitsReached,
      valid: true,
    };
    expect(analysis.valid).toBe(true);
    expect(analysis.documents["neuraz-ds.config.json"]?.trust).toBe("valid");
    expect(analysis.statistics).toEqual(emptyStatistics);
  });

  it("un documento recuperado de un inválido conserva issues y trust 'recovered'", () => {
    const doc: ParsedDocument = {
      relativePath: "design-system/design-system.json",
      exists: true,
      kind: "file",
      parsed: { name: "Acme" },
      trust: "recovered",
      issues: [analysisError("manifest-invalid", "slug inválido", { document: "manifest" })],
    };
    const analysis: DesignSystemAnalysis = {
      host: { root: "/repo", designSystemPath: "/repo/design-system" },
      presence: { present: ["design-system/design-system.json"], missing: [] },
      structuralState: "complete-invalid",
      documents: { "design-system/design-system.json": doc },
      nodes: [],
      statistics: emptyStatistics,
      errors: doc.issues,
      warnings: [],
      limits: noLimitsReached,
      valid: false,
    };
    expect(analysis.valid).toBe(false);
    expect(analysis.documents["design-system/design-system.json"]?.trust).toBe("recovered");
    expect(analysis.errors).toHaveLength(1);
  });
});
