// T026 (005) — Reglas de contenido: categorías declaradas vs observadas, component/theme/dark-light y
// contenido peligroso (rechazados estructuralmente, sin heurísticas amplias por nombre arbitrario).
import { describe, expect, it } from "vitest";
import { validatePresetEnvelope } from "../../../src/infrastructure/presets/preset-envelope-validator.js";
import { analyzePresetTokens } from "../../../src/infrastructure/presets/preset-token-analyzer.js";
import { validatePreset } from "../../../src/application/presets/validate-preset.js";

const color = (level = "primitive") => ({
  $type: "color",
  $extensions: { "ar.neuraz.design-system-manager": { foundation: { level } } },
  a: { $value: { colorSpace: "srgb", components: [0, 0, 0] } },
});
const spacing = () => ({ $type: "dimension", "100": { $value: { value: 4, unit: "px" } } });

/** Valida un envelope crudo de extremo a extremo (envelope + análisis en memoria). */
function vcodes(raw: Record<string, unknown>): readonly string[] {
  const { envelope, issues } = validatePresetEnvelope(raw);
  if (!envelope) return issues.map((i) => i.code);
  const v = validatePreset(envelope, analyzePresetTokens(envelope.tokens));
  return [...v.errors, ...v.warnings].map((i) => i.code);
}

describe("preset content rules (T026)", () => {
  it("rejects component tokens (non-canonical top-level segment)", () => {
    expect(
      vcodes({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: color(), button: { primary: { $value: { colorSpace: "srgb", components: [0, 0, 0] } } } } }),
    ).toContain("preset-token-unresolved");
  });

  it("rejects theme / dark-light variant groups (non-canonical top-level)", () => {
    expect(
      vcodes({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: color(), theme: { dark: { bg: { $value: { colorSpace: "srgb", components: [0, 0, 0] } } } } } }),
    ).toContain("preset-token-unresolved");
  });

  it("rejects a token under a canonical category not declared", () => {
    expect(
      vcodes({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: color(), spacing: spacing() } }),
    ).toContain("preset-category-undeclared");
  });

  it("rejects a declared category with no contributing token", () => {
    expect(
      vcodes({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color", "spacing"], tokens: { color: color() } }),
    ).toContain("preset-category-unused");
  });

  it("rejects unknown top-level envelope fields (scripts/dependencies/css)", () => {
    expect(
      vcodes({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: color() }, scripts: ["rm -rf"], dependencies: { x: "1" } }),
    ).toContain("preset-field-unknown");
  });

  it("rejects a CSS/SCSS-like string where a structured color value is required", () => {
    expect(
      vcodes({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: { $type: "color", a: { $value: "#ffffff; background: url(http://x)" } } } }),
    ).toContain("preset-dtcg-invalid");
  });

  it("accepts a valid partial preset (single declared category, all observed)", () => {
    expect(
      vcodes({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: color() } }),
    ).toEqual([]);
  });
});
