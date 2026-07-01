import { describe, expect, it } from "vitest";
import { projectBrand, absentViewerBrand, type ViewerBrandV1 } from "../../../src/application/viewer/brand.js";
import { deriveBrandQualitySummary, normalizeBrandDocuments, type NormalizedBrandDocuments } from "../../../src/application/brand/brand-quality-summary.js";
import {
  BRAND_PROFILE_FORMAT_VERSION,
  BRAND_VISUAL_LANGUAGE_FORMAT_VERSION,
  BRAND_VOICE_FORMAT_VERSION,
  emptyBrandProfile,
  emptyBrandVisualLanguage,
  emptyBrandVoice,
  type BrandSourceSnapshot,
} from "../../../src/domain/brand/index.js";

function snapshot(documents: Partial<BrandSourceSnapshot["documents"]>): BrandSourceSnapshot {
  return Object.freeze({
    root: "/tmp/host",
    status: "present",
    documents: Object.freeze({
      brandProfile: Object.freeze({ relativePath: "design-system/brand/brand.json", state: "parsed", value: emptyBrandProfile(), contentHash: "h1", byteLength: 10 }),
      voice: Object.freeze({ relativePath: "design-system/brand/voice-and-tone.json", state: "parsed", value: emptyBrandVoice(), contentHash: "h2", byteLength: 10 }),
      visualLanguage: Object.freeze({ relativePath: "design-system/brand/visual-language.json", state: "parsed", value: emptyBrandVisualLanguage(), contentHash: "h3", byteLength: 10 }),
      usageGuidelines: Object.freeze({ relativePath: "design-system/brand/usage-guidelines.json", state: "absent", value: null, contentHash: null, byteLength: null }),
      ...documents,
    }),
  });
}

function documents(snapshotValue: BrandSourceSnapshot): NormalizedBrandDocuments {
  return normalizeBrandDocuments(snapshotValue);
}

describe("projectBrand (T022)", () => {
  it("absent snapshot → absentViewerBrand devuelve status absent sin profile/voice/visualLanguage", () => {
    const absentSnapshot: BrandSourceSnapshot = Object.freeze({
      root: "/tmp",
      status: "absent",
      documents: Object.freeze({
        brandProfile: Object.freeze({ relativePath: "design-system/brand/brand.json", state: "absent", value: null, contentHash: null, byteLength: null }),
        voice: Object.freeze({ relativePath: "design-system/brand/voice-and-tone.json", state: "absent", value: null, contentHash: null, byteLength: null }),
        visualLanguage: Object.freeze({ relativePath: "design-system/brand/visual-language.json", state: "absent", value: null, contentHash: null, byteLength: null }),
        usageGuidelines: Object.freeze({ relativePath: "design-system/brand/usage-guidelines.json", state: "absent", value: null, contentHash: null, byteLength: null }),
      }),
    });
    const quality = deriveBrandQualitySummary(absentSnapshot, new Set());
    expect(quality.overallStatus).toBe("absent");
    const brand = absentViewerBrand(quality);
    expect(brand.status).toBe("absent");
    expect(brand.profile).toBeNull();
    expect(brand.voice).toBeNull();
    expect(brand.visualLanguage).toBeNull();
    expect(brand.assetGroups).toEqual([]);
  });

  it("proyecta profile/voice/visualLanguage con status explícito y no infiere decisiones oficiales", () => {
    const profile = {
      ...emptyBrandProfile(),
      name: "Acme",
      purpose: "Build safe tools",
      values: Object.freeze(["clarity", "calm"]),
      status: "placeholder" as const,
      formatVersion: BRAND_PROFILE_FORMAT_VERSION,
    };
    const voice = {
      ...emptyBrandVoice(),
      voicePrinciples: Object.freeze(["plain words"]),
      formatVersion: BRAND_VOICE_FORMAT_VERSION,
    };
    const visualLanguage = {
      ...emptyBrandVisualLanguage(),
      iconStyle: "geometric",
      brandColors: Object.freeze(["color.brand.primary"]),
      formatVersion: BRAND_VISUAL_LANGUAGE_FORMAT_VERSION,
    };
    const snap = snapshot({
      brandProfile: Object.freeze({ relativePath: "design-system/brand/brand.json", state: "parsed", value: profile, contentHash: "h1", byteLength: 10 }),
      voice: Object.freeze({ relativePath: "design-system/brand/voice-and-tone.json", state: "parsed", value: voice, contentHash: "h2", byteLength: 10 }),
      visualLanguage: Object.freeze({ relativePath: "design-system/brand/visual-language.json", state: "parsed", value: visualLanguage, contentHash: "h3", byteLength: 10 }),
    });
    const quality = deriveBrandQualitySummary(snap, new Set());
    const brand: ViewerBrandV1 = projectBrand(documents(snap), quality);

    expect(brand.status).toBe("placeholder");
    expect(brand.profile?.name).toBe("Acme");
    expect(brand.profile?.values).toEqual(["clarity", "calm"]);
    expect(brand.voice?.voicePrinciples).toEqual(["plain words"]);
    expect(brand.visualLanguage?.iconStyle).toBe("geometric");
    expect(brand.visualLanguage?.brandColors).toEqual(["color.brand.primary"]);
    expect(brand.quality.overallStatus).toBe("placeholder");
    expect(brand.standards.map((standard) => standard.id)).toContain("DTCG");
  });

  it("agrupa logoVariants y marca como missing las requeridas sin asset real (007 sigue siendo autoridad)", () => {
    const visualLanguage = {
      ...emptyBrandVisualLanguage(),
      logoVariants: Object.freeze([
        Object.freeze({ logicalPath: "logos/primary.svg", variantRole: "primary", required: true, resolution: "resolved" as const }),
        Object.freeze({ logicalPath: null, variantRole: "monochrome", required: true, resolution: "placeholder" as const }),
      ]),
      formatVersion: BRAND_VISUAL_LANGUAGE_FORMAT_VERSION,
    };
    const snap = snapshot({
      visualLanguage: Object.freeze({ relativePath: "design-system/brand/visual-language.json", state: "parsed", value: visualLanguage, contentHash: "h3", byteLength: 10 }),
    });
    const known = new Set<string>(); // ningún asset conocido → primary se reporta como missing
    const quality = deriveBrandQualitySummary(snap, known);
    const brand = projectBrand(documents(snap), quality);

    expect(brand.assetGroups.length).toBe(1);
    const logosGroup = brand.assetGroups[0]!;
    expect(logosGroup.kind).toBe("logos");
    expect(logosGroup.references).toHaveLength(2);
    expect(logosGroup.missing).toHaveLength(2);
    expect(brand.quality.missingAssets).toHaveLength(2);
    expect(brand.quality.missingAssets.map((missing) => missing.variantRole)).toEqual(["primary", "monochrome"]);
  });

  it("toneDimensions incompletas se marcan como complete:false (no se presentan como decididas)", () => {
    const voice = {
      ...emptyBrandVoice(),
      toneDimensions: Object.freeze([
        Object.freeze({ axis: "formal-informal", position: "leaning formal", examples: { do: Object.freeze(["x"]), dont: Object.freeze([]) } }),
      ]),
      formatVersion: BRAND_VOICE_FORMAT_VERSION,
    };
    const snap = snapshot({
      voice: Object.freeze({ relativePath: "design-system/brand/voice-and-tone.json", state: "parsed", value: voice, contentHash: "h2", byteLength: 10 }),
    });
    const quality = deriveBrandQualitySummary(snap, new Set());
    const brand = projectBrand(documents(snap), quality);
    expect(brand.voice?.toneDimensions[0]!.complete).toBe(false);
  });
});
