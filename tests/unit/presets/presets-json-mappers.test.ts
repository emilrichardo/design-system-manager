import { describe, expect, it } from "vitest";
import {
  toPresetApplyJsonEnvelope,
  toPresetInspectJsonEnvelope,
  toPresetListJsonEnvelope,
  toPresetPlanJsonEnvelope,
} from "../../../src/application/presets/json/index.js";
import { PRESET_APPLICATION_TARGET_FILE } from "../../../src/domain/presets/preset-application-plan.js";
import { applyResult, conflict, conflictChange, createChange, invalidPresetValidation, presetEntry, presetInspection, presetPlan } from "./presets-test-fixtures.js";
import { undefinedPaths } from "../json/json-test-utils.js";

describe("Preset JSON mappers", () => {
  it("mapea list e inspect success/invalid/not-found con null policy", () => {
    const list = toPresetListJsonEnvelope({ outcome: "invalid-preset", presets: [presetEntry()], validation: invalidPresetValidation });
    const inspect = toPresetInspectJsonEnvelope({ outcome: "success", inspection: presetInspection() });
    const missing = toPresetInspectJsonEnvelope({ outcome: "not-found", inspection: null });

    expect(list.result?.presets[0]).toMatchObject({ id: "neutral-base", version: "1.0.0" });
    expect(list.result?.validation?.errors[0]).toMatchObject({ code: "preset-envelope-invalid", path: "tokens" });
    expect(inspect.result?.tokens.map((token) => token.path)).toEqual(["color.base.primary", "spacing.2"]);
    expect(missing.result).toEqual({ preset: null, tokens: [], validation: null });
    expect(undefinedPaths([list, inspect, missing])).toEqual([]);
  });

  it("mapea plan success/unchanged/conflict/not-found/read-error preservando target logico y notFoundResource", () => {
    const success = toPresetPlanJsonEnvelope({ outcome: "success", plan: presetPlan([createChange]) });
    const unchanged = toPresetPlanJsonEnvelope({ outcome: "unchanged", plan: presetPlan([{ ...createChange, operation: "unchanged", proposedToken: null }]) });
    const conflictPlan = toPresetPlanJsonEnvelope({ outcome: "conflict", plan: presetPlan([conflictChange]) });
    const notFound = toPresetPlanJsonEnvelope({ outcome: "not-found", plan: null, notFoundResource: "design-system" });
    const readError = toPresetPlanJsonEnvelope({ outcome: "read-error", plan: null });

    expect(success.result?.targetFile).toBe(PRESET_APPLICATION_TARGET_FILE);
    expect(success.result?.plan?.changes[0]).not.toHaveProperty("proposedToken");
    expect(JSON.stringify(success)).not.toContain("#ffffff");
    expect(unchanged.result?.plan?.summary.wouldWrite).toBe(false);
    expect(conflictPlan.result?.plan?.conflicts[0]).toEqual(conflict);
    expect(notFound.result?.notFoundResource).toBe("design-system");
    expect(readError.result?.error).toEqual({ code: "preset-read-error", message: "Preset target could not be read." });
  });

  it("mapea apply para todos los outcomes, wrote, verification, backup relativo y errores esperados", () => {
    const outcomes = ["applied", "unchanged", "conflict", "invalid-preset", "not-found", "read-error", "write-error", "verification-error"] as const;

    for (const outcome of outcomes) {
      const env = toPresetApplyJsonEnvelope(
        applyResult({
          outcome,
          wrote: outcome === "applied" || outcome === "verification-error",
          notFoundResource: outcome === "not-found" ? "preset" : null,
          backup: outcome === "verification-error" ? { relativePath: "design-system/tokens/base.tokens.json.bak" } : null,
          error: outcome === "write-error" ? { code: "preset-write-error", message: "Write failed." } : null,
        }),
      );

      expect(env.command).toBe("preset-apply");
      expect(env.outcome).toBe(outcome);
      expect(env.result?.wrote).toBe(outcome === "applied" || outcome === "verification-error");
      expect(env.result?.targetFile).toBe(PRESET_APPLICATION_TARGET_FILE);
      if (outcome === "not-found") expect(env.result?.notFoundResource).toBe("preset");
      if (outcome === "verification-error") expect(env.result?.backup?.relativePath).toBe("design-system/tokens/base.tokens.json.bak");
      expect(JSON.stringify(env)).not.toContain("#ffffff");
      expect(undefinedPaths(env)).toEqual([]);
    }
  });
});
