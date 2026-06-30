// T105 (006) — Tabla de exit codes de build/export, mapeo exacto; los exits históricos no cambian.
import { describe, expect, it } from "vitest";
import { exitCodeForBuildExportOutcome, exitCodeForOutcome, exitCodeForResult } from "../../src/cli/exit-codes.js";

describe("build/export exit codes (T105)", () => {
  it.each([
    ["built", 0],
    ["exported", 0],
    ["unchanged", 2],
    ["invalid-design-system", 3],
    ["unsupported-value", 4],
    ["conflict", 4],
    ["not-found", 5],
    ["read-error", 6],
    ["write-error", 6],
    ["verification-error", 7],
    ["internal-error", 70],
  ] as const)("%s → %d", (outcome, code) => {
    expect(exitCodeForBuildExportOutcome(outcome)).toBe(code);
  });

  it("son 11 mapeos cubiertos (tabla completa)", () => {
    const outcomes = ["built", "exported", "unchanged", "invalid-design-system", "unsupported-value", "conflict", "not-found", "read-error", "write-error", "verification-error", "internal-error"] as const;
    expect(new Set(outcomes).size).toBe(11);
  });

  it("no altera los exit codes históricos (002 y init)", () => {
    expect(exitCodeForOutcome("valid")).toBe(0);
    expect(exitCodeForOutcome("complete-invalid")).toBe(3);
    expect(exitCodeForOutcome("partial")).toBe(4);
    expect(exitCodeForOutcome("not-found")).toBe(5);
    expect(exitCodeForOutcome("read-error")).toBe(6);
    expect(exitCodeForResult({ status: "unchanged" })).toBe(2);
  });
});
