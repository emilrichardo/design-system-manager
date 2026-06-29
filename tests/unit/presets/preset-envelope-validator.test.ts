// T025 (005) — Validación estricta del envelope/metadata (T028). Determinista, sin normalización.
import { describe, expect, it } from "vitest";
import { validatePresetEnvelope } from "../../../src/infrastructure/presets/preset-envelope-validator.js";

const COLOR_TOKENS = { color: { $type: "color", a: { $value: { colorSpace: "srgb", components: [0, 0, 0] } } } };
const VALID = {
  id: "neutral-base",
  name: "Neutral Base",
  description: "desc",
  version: "1.0.0",
  includedCategories: ["color"],
  tokens: COLOR_TOKENS,
};

function codes(raw: unknown): readonly string[] {
  return validatePresetEnvelope(raw).issues.map((i) => i.code);
}

describe("validatePresetEnvelope (T025)", () => {
  it("accepts a valid envelope and returns a typed envelope", () => {
    const r = validatePresetEnvelope(VALID);
    expect(r.issues).toEqual([]);
    expect(r.envelope?.id).toBe("neutral-base");
    expect(r.envelope?.includedCategories).toEqual(["color"]);
  });

  it("rejects a non-object envelope", () => {
    expect(codes(null)).toContain("preset-envelope-invalid");
    expect(codes(42)).toContain("preset-envelope-invalid");
    expect(codes([])).toContain("preset-envelope-invalid");
  });

  it("rejects unknown top-level fields (v1)", () => {
    expect(codes({ ...VALID, scripts: [] })).toContain("preset-field-unknown");
    expect(codes({ ...VALID, dependencies: {} })).toContain("preset-field-unknown");
  });

  it("rejects missing required fields", () => {
    const { tokens, ...noTokens } = VALID;
    expect(codes(noTokens)).toContain("preset-envelope-invalid");
    const { id, ...noId } = VALID;
    expect(codes(noId)).toContain("preset-id-invalid");
  });

  it("rejects fields with the wrong type / null", () => {
    expect(codes({ ...VALID, id: 1 })).toContain("preset-id-invalid");
    expect(codes({ ...VALID, version: 1 })).toContain("preset-version-invalid");
    expect(codes({ ...VALID, name: null })).toContain("preset-name-invalid");
    expect(codes({ ...VALID, tokens: 5 })).toContain("preset-envelope-invalid");
    expect(codes({ ...VALID, includedCategories: "color" })).toContain("preset-envelope-invalid");
  });

  it("rejects invalid id and version formats", () => {
    expect(codes({ ...VALID, id: "Neutral_Base" })).toContain("preset-id-invalid");
    expect(codes({ ...VALID, version: "1.0" })).toContain("preset-version-invalid");
  });

  it("rejects empty name/description", () => {
    expect(codes({ ...VALID, name: "" })).toContain("preset-name-invalid");
    expect(codes({ ...VALID, description: "" })).toContain("preset-description-invalid");
  });

  it("rejects duplicate, unknown and mis-ordered categories", () => {
    expect(codes({ ...VALID, includedCategories: ["color", "color"] })).toContain("preset-category-duplicate");
    expect(codes({ ...VALID, includedCategories: ["color", "colors"] })).toContain("preset-category-unsupported");
    expect(codes({ ...VALID, includedCategories: ["spacing", "color"] })).toContain("preset-category-order-invalid");
  });

  it("rejects an empty tokens object", () => {
    expect(codes({ ...VALID, tokens: {} })).toContain("preset-tokens-empty");
    expect(codes({ ...VALID, tokens: { $type: "color" } })).toContain("preset-tokens-empty");
  });

  it("is deterministic", () => {
    expect(codes({ ...VALID, id: 1, scripts: [] })).toEqual(codes({ ...VALID, id: 1, scripts: [] }));
  });
});
