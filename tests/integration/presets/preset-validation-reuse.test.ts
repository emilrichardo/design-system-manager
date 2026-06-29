// T033 (005) — La validación de presets reutiliza el motor DTCG de `002` y la proyección de `004`,
// corre en memoria (sin proyecto host temporal, sin filesystem) y hace UNA pasada DTCG + UNA de
// metadata. Incluye la validación del preset productivo `neutral-base`.
import { describe, expect, it, vi } from "vitest";
import type { DtcgAnalyzer } from "../../../src/application/analysis-ports.js";
import { createDtcgAnalyzer } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";
import { projectFoundationMetadata } from "../../../src/application/foundations/metadata-pass.js";
import { analyzePresetTokens, createPresetValidator } from "../../../src/infrastructure/presets/preset-token-analyzer.js";
import { validatePresetEnvelope } from "../../../src/infrastructure/presets/preset-envelope-validator.js";
import { loadBundledPresetCatalog } from "../../../src/infrastructure/presets/bundled-preset-catalog.js";

const NS = "ar.neuraz.design-system-manager";
const cv = { colorSpace: "srgb", components: [0, 0, 0] };

describe("preset validation reuse & single analysis (T033)", () => {
  it("performs exactly one DTCG analysis and one foundation metadata pass per validation", () => {
    const real = createDtcgAnalyzer();
    const analyzer: DtcgAnalyzer = { analyze: vi.fn((d) => real.analyze(d)) };
    const foundationPass = vi.fn(projectFoundationMetadata);
    const { envelope } = validatePresetEnvelope({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: { $type: "color", $extensions: { [NS]: { foundation: { level: "primitive" } } }, a: { $value: cv } } } });
    expect(envelope).not.toBeNull();
    if (!envelope) return;
    createPresetValidator({ analyzer, foundationPass }).validate(envelope);
    expect(analyzer.analyze).toHaveBeenCalledTimes(1);
    expect(foundationPass).toHaveBeenCalledTimes(1);
  });

  it("reuses the 002 engine: an injected analyzer changes the surfaced result", () => {
    const empty: DtcgAnalyzer = { analyze: () => ({ valid: true, nodes: [], statistics: { totalTokens: 0, totalGroups: 0, byType: {}, byTrust: { valid: 0, recovered: 0, untrusted: 0 } }, errors: [], warnings: [], limits: { reached: false, hits: [], partial: false } }) };
    const analysis = analyzePresetTokens({ color: { a: { $value: cv } } }, { analyzer: empty });
    expect(analysis.nodes).toEqual([]); // proves the injected engine produced the nodes, not a parallel one
  });

  it("validates in memory without host resolution or filesystem writes", () => {
    // A hand-built envelope that does not exist on disk validates fine → no host project is needed.
    const { envelope } = validatePresetEnvelope({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["spacing"], tokens: { spacing: { $type: "dimension", $extensions: { [NS]: { foundation: { level: "primitive" } } }, "100": { $value: { value: 4, unit: "px" } } } } });
    expect(envelope).not.toBeNull();
    if (!envelope) return;
    const a = createPresetValidator().validate(envelope);
    const b = createPresetValidator().validate(envelope);
    expect(a.valid).toBe(true);
    expect(a).toEqual(b); // deterministic, pure
  });

  it("validates the productive neutral-base preset end to end", async () => {
    const loaded = await loadBundledPresetCatalog();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const envelope = loaded.envelopes.get("neutral-base" as never);
    expect(envelope).toBeDefined();
    if (!envelope) return;

    const analysis = analyzePresetTokens(envelope.tokens);
    expect(analysis.nodes.map((n) => n.path)).toEqual([
      "color.gray.100",
      "color.gray.900",
      "color.surface.default",
      "spacing.100",
      "spacing.200",
    ]);
    const surface = analysis.nodes.find((n) => n.path === "color.surface.default");
    expect(surface).toMatchObject({ category: "color", level: "semantic", kind: "alias", aliasTarget: "color.gray.100", aliasState: "valid", effectiveType: "color", typeCompatibility: "compatible" });
    expect(analysis.nodes.filter((n) => n.path.startsWith("color.gray")).every((n) => n.level === "primitive" && n.typeCompatibility === "compatible")).toBe(true);
    expect(analysis.nodes.filter((n) => n.category === "spacing").every((n) => n.level === "primitive" && n.effectiveType === "dimension" && n.typeCompatibility === "compatible")).toBe(true);
    expect(analysis.limits.partial).toBe(false);

    const validation = createPresetValidator().validate(envelope);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([]);
  });
});
