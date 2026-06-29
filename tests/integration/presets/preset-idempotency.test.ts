import { describe, expect, it } from "vitest";
import { applyPreset } from "../../../src/application/presets/apply-preset.js";
import { deps, hostAnalysis, presetTokens } from "./apply-preset-test-utils.js";
import type { PresetId } from "../../../src/domain/presets/index.js";

const input = { id: "neutral-base" as PresetId, executionDir: "/repo" };

describe("preset idempotency", () => {
  it("first apply writes and second equivalent state is unchanged with zero writes", async () => {
    const before = {};
    const after = presetTokens();
    const firstDeps = deps({ analyses: [hostAnalysis(before), hostAnalysis(after)], targetContent: "{}\n" });
    const first = await applyPreset(input, firstDeps);

    expect(first.outcome).toBe("applied");
    expect(first.wrote).toBe(true);
    expect(first.summary.wouldWrite).toBe(true);
    expect(firstDeps.writer.cleanupBackup).toHaveBeenCalledWith("/repo", "design-system/tokens/base.tokens.json.bak");

    const secondDeps = deps({ analyses: [hostAnalysis(after)], targetContent: JSON.stringify(after, null, 2) + "\n" });
    const second = await applyPreset(input, secondDeps);

    expect(second.outcome).toBe("unchanged");
    expect(second.wrote).toBe(false);
    expect(second.summary.wouldWrite).toBe(false);
    expect(secondDeps.writer.write).not.toHaveBeenCalled();
  });
});
