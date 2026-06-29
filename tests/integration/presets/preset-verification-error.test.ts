import { describe, expect, it } from "vitest";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";
import { applyPreset } from "../../../src/application/presets/apply-preset.js";
import { deps, hostAnalysis } from "./apply-preset-test-utils.js";
import type { PresetId } from "../../../src/domain/presets/index.js";

const input = { id: "neutral-base" as PresetId, executionDir: "/repo" };

describe("preset verification-error", () => {
  it("reports wrote true, retains a relative backup, and does not auto rollback", async () => {
    const d = deps({
      analyses: [hostAnalysis({}), hostAnalysis({}, [analysisError("dtcg-invalid", "bad", { path: "color.bad" })])],
      targetContent: "{}\n",
    });
    const result = await applyPreset(input, d);

    expect(result.outcome).toBe("verification-error");
    expect(result.wrote).toBe(true);
    expect(result.backup?.relativePath).toBe("design-system/tokens/base.tokens.json.bak");
    expect(result.verification?.valid).toBe(false);
    expect(result.backup?.relativePath).not.toContain("/repo");
    expect(d.writer.cleanupBackup).not.toHaveBeenCalled();
  });
});
