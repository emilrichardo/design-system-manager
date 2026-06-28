import { describe, expect, it } from "vitest";
import { FOUNDATION_CATEGORY_IDS } from "../../../src/domain/foundations/foundation-category.js";
import {
  createPresetEnvelope,
  createPresetMetadata,
  presetValidation,
  presetValidationError,
  toPresetCatalogEntry,
} from "../../../src/domain/presets/index.js";

describe("preset models", () => {
  const metadataInput = {
    id: "neutral-base",
    name: "Neutral Base",
    description: "Portable neutral base.",
    version: "1.0.0",
    includedCategories: ["color", "spacing"],
  } as const;

  it("creates metadata with only approved fields and canonical category reuse", () => {
    const result = createPresetMetadata(metadataInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.value).sort()).toEqual(["description", "id", "includedCategories", "name", "version"]);
    expect(result.value.includedCategories).toEqual(["color", "spacing"]);
    for (const category of result.value.includedCategories) expect(FOUNDATION_CATEGORY_IDS).toContain(category);
  });

  it("rejects invalid, duplicated, empty, and out-of-order categories", () => {
    const bad = createPresetMetadata({ ...metadataInput, includedCategories: ["spacing", "color", "color", "bad"] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.validation.errors.map((issue) => issue.code)).toEqual([
        "preset-category-duplicate",
        "preset-category-unsupported",
      ]);
    }

    const outOfOrder = createPresetMetadata({ ...metadataInput, includedCategories: ["spacing", "color"] });
    expect(outOfOrder.ok).toBe(false);
    if (!outOfOrder.ok) expect(outOfOrder.validation.errors[0]?.code).toBe("preset-category-order-invalid");

    const empty = createPresetMetadata({ ...metadataInput, includedCategories: [] });
    expect(empty.ok).toBe(false);
  });

  it("rejects missing human metadata and preserves null policy as explicit failures", () => {
    const result = createPresetMetadata({ ...metadataInput, name: "", description: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validation.errors.map((issue) => issue.code)).toContain("preset-name-invalid");
      expect(result.validation.errors.map((issue) => issue.code)).toContain("preset-description-invalid");
    }
  });

  it("creates an envelope without interpreting the DTCG token block", () => {
    const tokens = { color: { gray: { "100": { $value: "#fff" } } } };
    const result = createPresetEnvelope({ ...metadataInput, tokens });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tokens).toBe(tokens);
    expect(Object.keys(result.value).sort()).toEqual([
      "description",
      "id",
      "includedCategories",
      "name",
      "tokens",
      "version",
    ]);
  });

  it("rejects non-object token blocks without DTCG traversal", () => {
    const result = createPresetEnvelope({ ...metadataInput, tokens: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.validation.errors[0]?.code).toBe("preset-envelope-invalid");
  });

  it("projects public catalog entry separately from private resource location", () => {
    const result = createPresetMetadata(metadataInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entry = toPresetCatalogEntry(result.value);
    expect(Object.keys(entry).sort()).toEqual(["description", "id", "includedCategories", "name", "version"]);
    expect(entry).not.toHaveProperty("assetPath");
  });

  it("builds validation models with copied issue arrays and no Error instances", () => {
    const issue = presetValidationError("preset-envelope-invalid", "Invalid envelope.", null);
    const validation = presetValidation([issue]);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual([issue]);
    expect(validation.errors[0]).not.toBeInstanceOf(Error);
    expect(validation.limits).toMatchObject({ reached: false, partial: false, hits: [] });
  });
});
