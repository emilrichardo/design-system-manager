import { describe, expect, it, vi } from "vitest";
import { createInspectJsonDependencies, createValidateJsonDependencies } from "../../../src/cli/composition.js";
import { runInspect } from "../../../src/cli/commands/inspect.js";
import { runValidate } from "../../../src/cli/commands/validate.js";
import { analysisValid } from "../../helpers/analysis-fixtures.js";
import { captureIO } from "./json-output-helpers.js";

describe("T032 — modo JSON no duplica analisis", () => {
  it("validate --json llama analyze una sola vez", async () => {
    const analyze = vi.fn(async () => analysisValid());
    const captured = captureIO();
    const result = await runValidate("/host", createValidateJsonDependencies(captured.io, analyze));

    expect(result.outcome).toBe("valid");
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith({ executionDir: "/host" });
    expect(JSON.parse(captured.stdout()).command).toBe("validate");
  });

  it("inspect --json llama analyze una sola vez y conserva los datos ya calculados", async () => {
    const analysis = analysisValid();
    const analyze = vi.fn(async () => ({
      ...analysis,
      statistics: { ...analysis.statistics, total: 1, groups: 1, concreteValues: 1, aliases: 0, byType: { color: 1 }, maxDepth: 2 },
      nodes: [
        {
          path: "color.primary",
          declaredType: null,
          effectiveType: "color",
          typeOrigin: "group",
          typeSourcePath: "color",
          kind: "concrete",
          aliasTarget: null,
          aliasState: "n/a",
          description: "d",
          depth: 2,
          trust: "valid",
        },
      ],
    }));
    const captured = captureIO();
    const result = await runInspect("/host", createInspectJsonDependencies(captured.io, analyze));
    const json = JSON.parse(captured.stdout()) as { result: { tokens: { total: number; byType: Record<string, number>; paths: Array<{ path: string }> } } };

    expect(result.outcome).toBe("valid");
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(json.result.tokens.total).toBe(1);
    expect(json.result.tokens.byType).toEqual({ color: 1 });
    expect(json.result.tokens.paths.map((node) => node.path)).toEqual(["color.primary"]);
  });
});
