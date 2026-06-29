import { describe, expect, it } from "vitest";
import { applyPreset } from "../../../src/application/presets/apply-preset.js";
import { deps, hostAnalysis, writer } from "./apply-preset-test-utils.js";
import type { PresetId } from "../../../src/domain/presets/index.js";

const input = { id: "neutral-base" as PresetId, executionDir: "/repo" };

describe("preset concurrency", () => {
  it("maps byte/hash concurrent modification to conflict with wrote false and no partial write", async () => {
    const d = deps({ analyses: [hostAnalysis({})], targetContent: "{}\n", writer: writer("concurrent-modification") });
    const result = await applyPreset(input, d);

    expect(result.outcome).toBe("conflict");
    expect(result.wrote).toBe(false);
    expect(result.error?.code).toBe("concurrent-modification");
    expect(result.plan?.plan.writable).toBe(false);
    expect(result.plan?.plan.conflicts.at(-1)?.code).toBe("preset-concurrent-modification");
    expect(d.writer.write).toHaveBeenCalledTimes(1);
  });
});
