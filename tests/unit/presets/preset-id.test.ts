import { describe, expect, it } from "vitest";
import { isPresetId, validatePresetId } from "../../../src/domain/presets/preset-id.js";

describe("PresetId", () => {
  it.each(["neutral-base", "a", "a1", "base-2026", "neutral-base-1"])("accepts valid id %s", (id) => {
    const result = validatePresetId(id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(id);
    expect(isPresetId(id)).toBe(true);
  });

  it.each([
    "",
    "Neutral Base",
    "neutral base",
    "Neutral-base",
    "neutral/Base",
    "neutral\\Base",
    "neutral.base",
    "-neutral",
    "neutral-",
    "neutral--base",
    "ñ-base",
    "base_1",
    "https://example.com/base",
  ])("rejects invalid id %j without normalization", (id) => {
    const result = validatePresetId(id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("preset-id-invalid");
      expect(result.error.input).toBe(id);
    }
    expect(isPresetId(id)).toBe(false);
  });

  it("is exact and case-sensitive", () => {
    expect(validatePresetId("neutral-base")).toMatchObject({ ok: true });
    expect(validatePresetId("Neutral-Base")).toMatchObject({ ok: false });
  });
});
