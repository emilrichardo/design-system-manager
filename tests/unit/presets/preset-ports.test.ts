import { describe, expect, it } from "vitest";
import type {
  ApplyPreset,
  InspectPreset,
  ListPresets,
  PlanPresetApplication,
  PresetCatalogPort,
  PresetValidationPort,
} from "../../../src/application/presets/index.js";
import { createPresetEnvelope, presetValidation, validatePresetId } from "../../../src/domain/presets/index.js";

describe("preset application ports", () => {
  it("define headless dependencies without CLI, streams, exit codes, JSON, or filesystem implementation handles", async () => {
    const id = validatePresetId("neutral-base");
    expect(id.ok).toBe(true);
    if (!id.ok) return;

    const envelope = createPresetEnvelope({
      id: "neutral-base",
      name: "Neutral Base",
      description: "Portable neutral base.",
      version: "1.0.0",
      includedCategories: ["color"],
      tokens: { color: {} },
    });
    expect(envelope.ok).toBe(true);
    if (!envelope.ok) return;

    const catalog: PresetCatalogPort = {
      async list() {
        return [];
      },
      async get(requested) {
        return requested === id.value ? envelope.value : null;
      },
    };
    const validator: PresetValidationPort = { validate: () => presetValidation() };

    expect(Object.keys(catalog).sort()).toEqual(["get", "list"]);
    expect(Object.keys(validator)).toEqual(["validate"]);

    const list: ListPresets = async (deps) => ({ outcome: "success", presets: await deps.catalog.list(), validation: null });
    const inspect: InspectPreset = async (_input, deps) => {
      const found = await deps.catalog.get(id.value);
      return found === null
        ? { outcome: "not-found", inspection: null }
        : { outcome: "success", inspection: { metadata: found, tokens: [], validation: deps.validator.validate(found) } };
    };
    const plan: PlanPresetApplication = async () => ({ outcome: "not-found", plan: null });
    const apply: ApplyPreset = async () => ({
      outcome: "not-found",
      preset: null,
      targetFile: null,
      plan: null,
      summary: { create: 0, update: 0, unchanged: 0, conflict: 0, skip: 0, total: 0, blockingConflicts: 0, wouldWrite: false },
      wrote: false,
      verification: null,
      notFoundResource: "preset",
      backup: null,
      error: null,
    });

    await expect(list({ catalog })).resolves.toMatchObject({ outcome: "success" });
    await expect(inspect({ id: id.value }, { catalog, validator })).resolves.toMatchObject({ outcome: "success" });
    await expect(plan({ id: id.value, executionDir: "/repo" }, { catalog })).resolves.toMatchObject({ outcome: "not-found" });
    await expect(apply({ id: id.value, executionDir: "/repo" }, { catalog })).resolves.toMatchObject({ outcome: "not-found" });
  });
});
