// T018 — Contrato de tubería compartida: recibe input headless, produce DesignSystemAnalysis.
import { describe, expect, it } from "vitest";
import type { AnalyzeExistingDesignSystem } from "../../../src/application/analysis-ports.js";
import { scriptedAnalyzer } from "../../helpers/analysis-fakes.js";
import { designSystemAnalysis } from "../../helpers/analysis-fixtures.js";

describe("AnalyzeExistingDesignSystem (T018)", () => {
  it("recibe { executionDir } y devuelve un DesignSystemAnalysis (sin exit code ni texto)", async () => {
    const trace: string[] = [];
    const analyze: AnalyzeExistingDesignSystem = scriptedAnalyzer(
      designSystemAnalysis({ structuralState: "complete-valid", valid: true }),
      trace,
    );
    const result = await analyze(
      { executionDir: "/repo/apps/web" },
      // deps no se usan en el fake; la firma exige el objeto en la implementación real (T029).
      {} as never,
    );
    expect(result.structuralState).toBe("complete-valid");
    expect(result.valid).toBe(true);
    // No hay campo de exit code ni texto de terminal en el modelo.
    expect("exitCode" in (result as object)).toBe(false);
    expect(trace).toEqual(["analyze:/repo/apps/web"]);
  });

  it("validate e inspect comparten el MISMO análisis (un solo productor)", async () => {
    const analysis = designSystemAnalysis({ structuralState: "partial", valid: false });
    const analyze = scriptedAnalyzer(analysis);
    const a = await analyze({ executionDir: "/repo" }, {} as never);
    const b = await analyze({ executionDir: "/repo" }, {} as never);
    expect(a).toEqual(b); // determinista; misma semántica para ambos comandos
  });
});
