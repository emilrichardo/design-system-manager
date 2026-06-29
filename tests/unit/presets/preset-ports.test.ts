import { describe, expect, it } from "vitest";
import type {
  AnalyzePresetTokens,
  ApplyPreset,
  InspectPreset,
  ListPresets,
  PlanPresetApplication,
  PresetCatalogPort,
} from "../../../src/application/presets/index.js";
import type { AnalyzeUseCase } from "../../../src/application/analysis-ports.js";
import { createPresetEnvelope, presetValidation, validatePresetId } from "../../../src/domain/presets/index.js";

const noLimits = { reached: false, hits: [] as const, partial: false };

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
      async load() {
        return { ok: true, entries: [] };
      },
      async list() {
        return [];
      },
      async get(requested) {
        return requested === id.value ? envelope.value : null;
      },
    };
    const analyzeTokens: AnalyzePresetTokens = () => ({
      nodes: [],
      errors: [],
      warnings: [],
      foundationIssues: [],
      limits: noLimits,
      topLevelKeys: [],
    });
    const analyzeHost: AnalyzeUseCase = async (input) => ({
      host: { root: input.executionDir, designSystemPath: null },
      presence: { present: [], missing: [] },
      structuralState: "not-initialized",
      documents: {},
      nodes: [],
      statistics: { totalTokens: 0, totalGroups: 0, byType: {}, byTrust: { valid: 0, recovered: 0, untrusted: 0 } },
      errors: [],
      warnings: [],
      limits: noLimits,
      valid: false,
    });

    expect(Object.keys(catalog).sort()).toEqual(["get", "list", "load"]);

    const list: ListPresets = async (deps) => ({ outcome: "success", presets: (await deps.catalog.load()).ok ? [] : [], validation: null });
    const inspect: InspectPreset = async (_input, deps) => {
      const found = await deps.catalog.get(id.value);
      void deps.analyzeTokens;
      return found === null
        ? { outcome: "not-found", inspection: null }
        : { outcome: "success", inspection: { metadata: found, tokens: [], validation: presetValidation() } };
    };
    const plan: PlanPresetApplication = async () => ({ outcome: "not-found", plan: null, notFoundResource: "preset" });
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
    await expect(inspect({ id: id.value }, { catalog, analyzeTokens })).resolves.toMatchObject({ outcome: "success" });
    await expect(plan({ id: id.value, executionDir: "/repo" }, { catalog, analyzeTokens, analyzeHost })).resolves.toMatchObject({ outcome: "not-found" });
    await expect(apply({ id: id.value, executionDir: "/repo" }, { catalog })).resolves.toMatchObject({ outcome: "not-found" });
  });
});
