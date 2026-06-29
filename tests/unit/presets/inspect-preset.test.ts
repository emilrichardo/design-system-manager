// T052 (005) — Caso de uso headless `inspectPreset`: not-found / invalid-preset / success, tipo EFECTIVO,
// nivel efectivo, alias, información recuperable, una sola pasada de análisis, sin host ni escrituras.
import { describe, expect, it, vi } from "vitest";
import { inspectPreset } from "../../../src/application/presets/inspect-preset.js";
import { analyzePresetTokens } from "../../../src/infrastructure/presets/preset-token-analyzer.js";
import { createPresetEnvelope } from "../../../src/domain/presets/preset-envelope.js";
import type { PresetEnvelope } from "../../../src/domain/presets/preset-envelope.js";
import type { PresetCatalogPort } from "../../../src/application/presets/preset-ports.js";
import type { PresetId } from "../../../src/domain/presets/preset-id.js";

const NS = "ar.neuraz.design-system-manager";
const cv = { colorSpace: "srgb", components: [0, 0, 0] };

function envelopeFor(tokens: Record<string, unknown>, includedCategories: readonly string[] = ["color"]): PresetEnvelope {
  const built = createPresetEnvelope({ id: "neutral-base", name: "Neutral Base", description: "d", version: "1.0.0", includedCategories, tokens });
  if (!built.ok) throw new Error("fixture envelope invalid");
  return built.value;
}

const VALID = envelopeFor({
  color: {
    $type: "color",
    $extensions: { [NS]: { foundation: { level: "primitive" } } },
    gray: { "100": { $value: cv } },
    surface: { $extensions: { [NS]: { foundation: { level: "semantic" } } }, default: { $value: "{color.gray.100}" } },
  },
});
// Envelope con forma válida pero contenido inválido (token bajo categoría no declarada).
const INVALID = envelopeFor({ color: { $type: "color", a: { $value: cv } }, spacing: { $type: "dimension", "100": { $value: { value: 4, unit: "px" } } } }, ["color"]);

function catalog(envelopes: Record<string, PresetEnvelope>): PresetCatalogPort {
  return {
    load: vi.fn(async () => ({ ok: true, entries: [] })),
    list: vi.fn(async () => []),
    get: vi.fn(async (id: PresetId) => envelopes[id] ?? null),
  };
}

describe("inspectPreset (T052)", () => {
  it("returns success with metadata, categories and effective token summaries", async () => {
    const r = await inspectPreset({ id: "neutral-base" as PresetId }, { catalog: catalog({ "neutral-base": VALID }), analyzeTokens: analyzePresetTokens });
    expect(r.outcome).toBe("success");
    if (r.outcome !== "success") return;
    expect(r.inspection.metadata.id).toBe("neutral-base");
    expect(r.inspection.metadata.includedCategories).toEqual(["color"]);
    const surface = r.inspection.tokens.find((t) => t.path === "color.surface.default");
    expect(surface).toMatchObject({ category: "color", level: "semantic", type: "color", aliasTarget: "color.gray.100" });
    const gray = r.inspection.tokens.find((t) => t.path === "color.gray.100");
    expect(gray).toMatchObject({ category: "color", level: "primitive", type: "color" });
  });

  it("returns not-found for an unknown id", async () => {
    const r = await inspectPreset({ id: "ghost" as PresetId }, { catalog: catalog({ "neutral-base": VALID }), analyzeTokens: analyzePresetTokens });
    expect(r).toEqual({ outcome: "not-found", inspection: null });
  });

  it("returns invalid-preset with a recoverable inspection", async () => {
    const r = await inspectPreset({ id: "neutral-base" as PresetId }, { catalog: catalog({ "neutral-base": INVALID }), analyzeTokens: analyzePresetTokens });
    expect(r.outcome).toBe("invalid-preset");
    if (r.outcome !== "invalid-preset") return;
    expect(r.inspection.validation.valid).toBe(false);
    expect(r.inspection.tokens.length).toBeGreaterThan(0); // recuperable
  });

  it("runs exactly one analysis pass and never reads the host or writes", async () => {
    const cat = catalog({ "neutral-base": VALID });
    const analyzeTokens = vi.fn(analyzePresetTokens);
    await inspectPreset({ id: "neutral-base" as PresetId }, { catalog: cat, analyzeTokens });
    expect(analyzeTokens).toHaveBeenCalledTimes(1);
    expect(cat.get).toHaveBeenCalledTimes(1);
  });
});
