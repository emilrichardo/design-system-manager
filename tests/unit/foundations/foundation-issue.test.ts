// T004 (004) — Códigos de issue foundation: cinco estables, únicos, severidades, sin colisión con 002.
import { describe, expect, it } from "vitest";
import {
  FOUNDATION_ISSUE_CODES,
  FOUNDATION_ISSUE_SEVERITY,
} from "../../../src/domain/foundations/foundation-issue.js";

const CODES = Object.values(FOUNDATION_ISSUE_CODES);

describe("Foundation issue codes (T004)", () => {
  it("define exactamente los cinco códigos esperados", () => {
    expect(new Set(CODES)).toEqual(
      new Set([
        "foundation-level-invalid",
        "foundation-forbidden-dependency",
        "foundation-token-unclassified",
        "foundation-category-unresolved",
        "foundation-type-mismatch",
      ]),
    );
  });

  it("los códigos son únicos y prefijados `foundation-` (sin colisión con 001/002)", () => {
    expect(new Set(CODES).size).toBe(CODES.length);
    for (const c of CODES) expect(c.startsWith("foundation-")).toBe(true);
    // Códigos representativos de 002 que NO deben colisionar.
    for (const c of ["read-failed", "dtcg-type-unrecognized", "dtcg-type-not-deeply-inspected", "json-parse-error"]) {
      expect(CODES).not.toContain(c);
    }
  });

  it("severidades coinciden con los contratos", () => {
    expect(FOUNDATION_ISSUE_SEVERITY["foundation-level-invalid"]).toBe("error");
    expect(FOUNDATION_ISSUE_SEVERITY["foundation-forbidden-dependency"]).toBe("error");
    expect(FOUNDATION_ISSUE_SEVERITY["foundation-token-unclassified"]).toBe("warning");
    expect(FOUNDATION_ISSUE_SEVERITY["foundation-category-unresolved"]).toBe("warning");
    expect(FOUNDATION_ISSUE_SEVERITY["foundation-type-mismatch"]).toBe("warning");
  });

  it("códigos y severidades son inmutables", () => {
    expect(Object.isFrozen(FOUNDATION_ISSUE_CODES)).toBe(true);
    expect(Object.isFrozen(FOUNDATION_ISSUE_SEVERITY)).toBe(true);
  });
});
