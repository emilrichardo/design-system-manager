// T034 — Tabla común de exit codes: outcomes de validate/inspect + init intacto.
import { describe, expect, it } from "vitest";
import { exitCodeForOutcome, exitCodeForResult } from "../../../src/cli/exit-codes.js";
import type { AnalysisOutcome } from "../../../src/application/analysis-ports.js";
import type { InitializationResult } from "../../../src/domain/result/initialization-result.js";

describe("exitCodeForOutcome (validate/inspect)", () => {
  const cases: ReadonlyArray<[AnalysisOutcome, number]> = [
    ["valid", 0],
    ["complete-invalid", 3],
    ["partial", 4],
    ["not-found", 5],
    ["read-error", 6],
  ];
  it.each(cases)("%s → %d", (outcome, code) => {
    expect(exitCodeForOutcome(outcome)).toBe(code);
  });

  it("nunca devuelve 2 (reservado para unchanged de init)", () => {
    for (const [outcome] of cases) expect(exitCodeForOutcome(outcome)).not.toBe(2);
  });
});

describe("exitCodeForResult (init) — sin cambios", () => {
  const cases: ReadonlyArray<[InitializationResult, number]> = [
    [{ status: "created", files: [] }, 0],
    [{ status: "cancelled" }, 1],
    [{ status: "unchanged", reason: "x" }, 2],
    [{ status: "conflict", conflicts: ["a"] }, 4],
    [{ status: "failed", category: "validation", errors: [] }, 3],
    [{ status: "failed", category: "host", errors: [] }, 5],
    [{ status: "failed", category: "filesystem", errors: [] }, 6],
    [{ status: "failed", category: "post-verify", errors: [] }, 7],
  ];
  it.each(cases)("%o → %d", (result, code) => {
    expect(exitCodeForResult(result)).toBe(code);
  });
});
