import { describe, expect, it } from "vitest";
import { validateBrand } from "../../../src/application/brand/validate-brand.js";
import type { AssetStoreObservation, AssetStorePort } from "../../../src/application/assets/asset-ports.js";
import type { AssetRecord } from "../../../src/domain/assets/asset-record.js";
import { serializeAssetManifestV1, type AssetManifestV1 } from "../../../src/domain/assets/asset-manifest.js";
import { UNSPECIFIED_LICENSE } from "../../../src/domain/assets/asset-record.js";
import type { BrandVisualLanguageV1 } from "../../../src/domain/brand/index.js";
import { emptyBrandVisualLanguage } from "../../../src/domain/brand/index.js";

function asset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    logicalPath: "logos/primary.svg",
    kind: "logo",
    mimeType: "image/svg+xml",
    byteLength: 100,
    contentHash: "a".repeat(64),
    dimensions: { width: 100, height: 20, unit: "user" },
    provenance: { kind: "local-import", sourceRef: "primary.svg" },
    license: UNSPECIFIED_LICENSE,
    ...overrides,
  };
}

function parsedManifest(assets: AssetRecord[]): unknown {
  const manifest: AssetManifestV1 = { formatVersion: "1.0.0", assets };
  return JSON.parse(serializeAssetManifestV1(manifest));
}

function store(observation: AssetStoreObservation): AssetStorePort {
  return { observe: () => Promise.resolve(observation) };
}

function visualLanguage(): BrandVisualLanguageV1 {
  return {
    ...emptyBrandVisualLanguage(),
    logoVariants: [
      { logicalPath: "logos/primary.svg", variantRole: "primary", required: true, resolution: "placeholder" },
    ],
  };
}

describe("validateBrand", () => {
  it("valida referencias existentes contra el asset inventory real", async () => {
    const result = await validateBrand(
      { visualLanguage: visualLanguage() },
      {
        store: store({
          manifest: { state: "parsed", value: parsedManifest([asset()]) },
          managedPaths: ["logos/primary.svg"],
          managedPathStates: [{ relativePath: "logos/primary.svg", state: "file", contentHash: "a".repeat(64), byteLength: 100 }],
          unknownNodes: [],
        }),
      },
    );

    expect(result.outcome).toBe("valid");
    expect(result.issues).toEqual([]);
    expect(result.visualLanguage.logoVariants[0]?.resolution).toBe("resolved");
  });

  it("reporta brand-asset-reference-missing cuando falta el asset referenciado", async () => {
    const result = await validateBrand(
      { visualLanguage: visualLanguage() },
      {
        store: store({
          manifest: { state: "parsed", value: parsedManifest([]) },
          managedPaths: [],
          managedPathStates: [],
          unknownNodes: [],
        }),
      },
    );

    expect(result.outcome).toBe("invalid-brand");
    expect(result.issues.map((issue) => issue.code)).toContain("brand-asset-reference-missing");
    expect(result.visualLanguage.logoVariants[0]?.resolution).toBe("missing");
  });

  it("degrada a invalid-asset-store cuando el manifest de assets no es confiable", async () => {
    const result = await validateBrand(
      { visualLanguage: visualLanguage() },
      {
        store: store({
          manifest: { state: "unreadable" },
          managedPaths: [],
          managedPathStates: [],
          unknownNodes: [],
        }),
      },
    );

    expect(result.outcome).toBe("invalid-asset-store");
    expect(result.error?.code).toBe("invalid-asset-store");
  });
});
