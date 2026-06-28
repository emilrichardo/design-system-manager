// T008 (004) — Invariantes runtime de los modelos foundation: unión discriminada y cero `undefined`.
import { describe, expect, it } from "vitest";
import type {
  FoundationsInspection,
  FoundationsResult,
} from "../../../src/application/foundations/foundations-ports.js";
import { undefinedPaths } from "../json/json-test-utils.js";

const emptyInspection: FoundationsInspection = {
  host: { root: "/repo", designSystemPath: "/repo/design-system" },
  structuralState: "complete-valid",
  categories: [],
  unresolved: [],
  summary: {
    categories: { absent: 9, partial: 0, complete: 0, invalid: 0 },
    tokens: { total: 0, primitive: 0, semantic: 0, unclassified: 0, unresolved: 0 },
    errors: 0,
    warnings: 0,
  },
  validation: { valid: true, errors: [], warnings: [], limits: { reached: false, partial: false, hits: [] } },
  limits: { reached: false, partial: false, hits: [] },
};

const samples: Record<string, FoundationsResult> = {
  valid: { outcome: "valid", host: { root: "/repo", designSystemPath: "/repo/design-system" }, inspection: emptyInspection },
  partial: { outcome: "partial", host: { root: "/repo", designSystemPath: "/repo/design-system" }, inspection: emptyInspection },
  notFound: { outcome: "not-found", host: null, inspection: null, hostError: null },
};

describe("FoundationsResult invariants (T008)", () => {
  it("not-found no inventa datos (inspection null, host null permitido)", () => {
    const r = samples.notFound;
    if (r.outcome === "not-found") {
      expect(r.inspection).toBeNull();
      expect(r.hostError).toBeNull();
    }
  });

  it("outcomes recuperables conservan inspección con campos estables", () => {
    for (const key of ["valid", "partial"]) {
      const r = samples[key]!;
      if (r.outcome !== "not-found") {
        expect(r.inspection.categories).toEqual([]);
        expect(r.inspection.summary.tokens.total).toBe(0);
      }
    }
  });

  it("ningún sample contiene undefined en ningún nivel", () => {
    for (const r of Object.values(samples)) expect(undefinedPaths(r)).toEqual([]);
  });

  it("la unión no admite internal-error (concepto exclusivo de CLI)", () => {
    const outcomes = Object.values(samples).map((r) => r.outcome);
    expect(outcomes).not.toContain("internal-error");
  });
});
