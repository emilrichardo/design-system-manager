// T005 (011) — BrandVoiceV1/BrandToneDimensionV1.
import { describe, expect, it } from "vitest";
import { emptyBrandVoice, isToneDimensionComplete } from "../../../src/domain/brand/brand-voice.js";

describe("isToneDimensionComplete", () => {
  it("requiere al menos un ejemplo do y uno dont", () => {
    expect(isToneDimensionComplete({ axis: "formal-informal", position: null, examples: { do: [], dont: [] } })).toBe(false);
    expect(isToneDimensionComplete({ axis: "formal-informal", position: null, examples: { do: ["x"], dont: [] } })).toBe(false);
    expect(isToneDimensionComplete({ axis: "formal-informal", position: null, examples: { do: ["x"], dont: ["y"] } })).toBe(true);
  });
});

describe("emptyBrandVoice", () => {
  it("placeholder valido sin terminologia inventada", () => {
    const voice = emptyBrandVoice();
    expect(voice.voicePrinciples).toEqual([]);
    expect(voice.terminology.preferred).toEqual([]);
    expect(voice.terminology.forbidden).toEqual([]);
  });
});
