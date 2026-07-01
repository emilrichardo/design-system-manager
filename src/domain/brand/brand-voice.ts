// T001 (011) — `BrandVoiceV1`/`BrandToneDimensionV1` — data-model.md.
export interface BrandToneDimensionV1 {
  readonly axis: string;
  readonly position: string | null;
  readonly examples: {
    readonly do: readonly string[];
    readonly dont: readonly string[];
  };
}

export const BRAND_VOICE_FORMAT_VERSION = "1.0.0";

export interface BrandVoiceV1 {
  readonly formatVersion: typeof BRAND_VOICE_FORMAT_VERSION;
  readonly voicePrinciples: readonly string[];
  readonly toneDimensions: readonly BrandToneDimensionV1[];
  readonly terminology: {
    readonly preferred: readonly string[];
    readonly forbidden: readonly string[];
  };
  readonly microcopyGuidance: string | null;
  readonly errorMessageGuidance: string | null;
  readonly ctaGuidance: string | null;
}

export function emptyBrandVoice(): BrandVoiceV1 {
  return Object.freeze({
    formatVersion: BRAND_VOICE_FORMAT_VERSION,
    voicePrinciples: Object.freeze([]),
    toneDimensions: Object.freeze([]),
    terminology: Object.freeze({ preferred: Object.freeze([]), forbidden: Object.freeze([]) }),
    microcopyGuidance: null,
    errorMessageGuidance: null,
    ctaGuidance: null,
  });
}

/** Una dimensión de tono declarada "complete" DEBE tener al menos un ejemplo `do` y uno `dont` (spec §Voice and tone). */
export function isToneDimensionComplete(dimension: BrandToneDimensionV1): boolean {
  return dimension.examples.do.length > 0 && dimension.examples.dont.length > 0;
}
