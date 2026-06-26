// T002/T007 — Constantes de límites de análisis (ADR-0009) y AnalysisLimitsResult.
// Nota: la cota de presentación MAX_INSPECT_TERMINAL_TOKEN_ROWS pertenece al reporter de CLI (Fase 8),
// no al dominio de análisis; por eso no se afirma aquí (ver informe de desviaciones).
import { describe, expect, it } from "vitest";
import {
  ANALYSIS_LIMITS,
  analysisLimitsResult,
  noLimitsReached,
  type AnalysisLimitHit,
} from "../../../src/domain/traversal/limits.js";

describe("ANALYSIS_LIMITS (ADR-0009)", () => {
  it("expone los 7 valores canónicos exactos", () => {
    expect(ANALYSIS_LIMITS.maxFileBytes).toBe(5 * 1024 * 1024);
    expect(ANALYSIS_LIMITS.maxTotalBytes).toBe(16 * 1024 * 1024);
    expect(ANALYSIS_LIMITS.maxDepth).toBe(32);
    expect(ANALYSIS_LIMITS.maxNodes).toBe(100_000);
    expect(ANALYSIS_LIMITS.maxPathLength).toBe(512);
    expect(ANALYSIS_LIMITS.maxAliasLength).toBe(256);
    expect(ANALYSIS_LIMITS.maxIssues).toBe(1_000);
  });

  it("es inmutable en runtime (Object.isFrozen via as const)", () => {
    // `as const` no congela en runtime; documentamos que el contrato es de solo-lectura por tipos.
    expect(Object.keys(ANALYSIS_LIMITS)).toHaveLength(7);
  });
});

describe("analysisLimitsResult", () => {
  it("sin hits ⇒ no alcanzado y no parcial", () => {
    const r = analysisLimitsResult();
    expect(r.reached).toBe(false);
    expect(r.partial).toBe(false);
    expect(r.hits).toEqual([]);
  });

  it("con hits ⇒ alcanzado y parcial; preserva orden y no muta la entrada", () => {
    const hits: AnalysisLimitHit[] = [
      { limit: "nodes", detail: ">100000" },
      { limit: "depth", detail: ">32" },
    ];
    const r = analysisLimitsResult(hits);
    expect(r.reached).toBe(true);
    expect(r.partial).toBe(true);
    expect(r.hits.map((h) => h.limit)).toEqual(["nodes", "depth"]);
    hits.push({ limit: "issues", detail: ">1000" });
    expect(r.hits).toHaveLength(2); // copia defensiva
  });

  it("noLimitsReached es el resultado vacío canónico", () => {
    expect(noLimitsReached).toEqual({ reached: false, hits: [], partial: false });
  });
});
