// T005 (011) — BrandQualitySummaryV1: "absent" nunca "invalid" para proyectos 001-010 sin brand.
import { describe, expect, it } from "vitest";
import { absentBrandQualitySummary, emptyProvenanceBreakdown } from "../../../src/domain/brand/brand-quality.js";

describe("absentBrandQualitySummary", () => {
  it("reporta overallStatus:absent, nunca invalid", () => {
    const summary = absentBrandQualitySummary();
    expect(summary.overallStatus).toBe("absent");
    expect(summary.missingAssets).toEqual([]);
  });
});

describe("emptyProvenanceBreakdown", () => {
  it("incluye los 6 estados en 0", () => {
    const breakdown = emptyProvenanceBreakdown();
    expect(Object.values(breakdown).every((v) => v === 0)).toBe(true);
    expect(Object.keys(breakdown)).toHaveLength(6);
  });
});
