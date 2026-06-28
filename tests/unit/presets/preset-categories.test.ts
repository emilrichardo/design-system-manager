// T014 (005) — `includedCategories` usa solo las 9 categorías canónicas de 004, único, no vacío y
// ordenado por el orden canónico. Valida las reglas ya provistas por `createPresetMetadata` (A).
import { describe, expect, it } from "vitest";
import { createPresetMetadata } from "../../../src/domain/presets/preset-envelope.js";
import { FOUNDATION_CATEGORY_IDS } from "../../../src/domain/foundations/foundation-category.js";

const meta = (includedCategories: readonly string[]) =>
  createPresetMetadata({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories });

function codes(result: ReturnType<typeof createPresetMetadata>): readonly string[] {
  return result.ok ? [] : result.validation.errors.map((e) => e.code);
}

describe("includedCategories rules (T014)", () => {
  it("accepts each of the 9 canonical categories individually", () => {
    for (const id of FOUNDATION_CATEGORY_IDS) {
      const r = meta([id]);
      expect(r.ok, `category ${id} should be accepted`).toBe(true);
    }
  });

  it("accepts a canonical-ordered subset", () => {
    const r = meta(["color", "spacing", "motion"]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.includedCategories).toEqual(["color", "spacing", "motion"]);
  });

  it("accepts the full canonical list in order", () => {
    expect(meta([...FOUNDATION_CATEGORY_IDS]).ok).toBe(true);
  });

  it("rejects an unknown category", () => {
    expect(codes(meta(["color", "colors"]))).toContain("preset-category-unsupported");
  });

  it("rejects a duplicate category", () => {
    expect(codes(meta(["color", "color"]))).toContain("preset-category-duplicate");
  });

  it("rejects an empty list", () => {
    expect(codes(meta([]))).toContain("preset-category-unsupported");
  });

  it("rejects categories not in canonical order", () => {
    expect(codes(meta(["spacing", "color"]))).toContain("preset-category-order-invalid");
  });
});
