import { describe, expect, it } from "vitest";
import { projectTypography } from "../../../src/application/viewer/typography.js";
import type { ViewerAssetV1 } from "../../../src/application/viewer/asset.js";
import type { ViewerTokenV1 } from "../../../src/application/viewer/token.js";
import { UNSPECIFIED_LICENSE, declaredLicense } from "../../../src/domain/assets/asset-record.js";

function token(overrides: Partial<ViewerTokenV1> = {}): ViewerTokenV1 {
  return {
    path: "typography.body",
    category: "typography",
    level: "primitive",
    levelSource: "token",
    declaredType: "typography",
    effectiveType: "typography",
    typeOrigin: "own",
    kind: "concrete",
    declaredValue: null,
    resolvedValue: null,
    immediateAliasTarget: null,
    aliasChain: [],
    aliasState: "n/a",
    description: null,
    trust: "valid",
    ...overrides,
  };
}

function fontAsset(overrides: Partial<ViewerAssetV1> = {}): ViewerAssetV1 {
  return {
    logicalPath: "fonts/brand-sans.woff2",
    kind: "font",
    mimeType: "font/woff2",
    byteLength: 1024,
    contentHash: "a".repeat(64),
    dimensions: null,
    provenance: { kind: "local-import", sourceRef: "brand-sans.woff2" },
    license: UNSPECIFIED_LICENSE,
    sanitization: null,
    ownership: { state: "trusted" },
    issues: [],
    ...overrides,
  };
}

describe("projectTypography (T020)", () => {
  it("font-family: proyecta family y calcula matchedAssets solo para ese kind", () => {
    const result = projectTypography(
      token({ effectiveType: "fontFamily", resolvedValue: "Brand Sans" }),
      [fontAsset({ license: declaredLicense({ identifier: "OFL-1.1" }) })],
    );
    expect(result.kind).toBe("font-family");
    expect(result.family).toBe("Brand Sans");
    expect(result.matchState).toBe("matched");
    expect(result.matchedAssets).toHaveLength(1);
    expect(result.matchedAssets[0]).toMatchObject({
      logicalPath: "fonts/brand-sans.woff2",
      format: "woff2",
      license: { status: "declared", identifier: "OFL-1.1" },
      matchState: "matched",
    });
  });

  it("font-family sin candidatos: no fabrica license ni family extra", () => {
    const result = projectTypography(token({ effectiveType: "fontFamily", resolvedValue: "Unknown Family" }), [fontAsset()]);
    expect(result.kind).toBe("font-family");
    expect(result.matchState).toBe("no-candidates");
    expect(result.matchedAssets).toEqual([]);
  });

  it("font-family ambiguo: expone todos los candidatos y marca ambiguous", () => {
    const result = projectTypography(token({ effectiveType: "fontFamily", resolvedValue: "Brand Sans" }), [
      fontAsset({ logicalPath: "fonts/brand-sans.woff2" }),
      fontAsset({ logicalPath: "fonts/brand_sans.otf", mimeType: "font/otf", contentHash: "b".repeat(64) }),
    ]);
    expect(result.kind).toBe("font-family");
    expect(result.matchState).toBe("ambiguous");
    expect(result.matchedAssets).toHaveLength(2);
    expect(result.matchedAssets.every((asset) => asset.matchState === "ambiguous")).toBe(true);
  });

  it("typography-composite: conserva subcampos y matching desde fontFamily interno", () => {
    const result = projectTypography(
      token({
        resolvedValue: {
          fontFamily: "Brand Sans",
          fontWeight: 700,
          fontStyle: "italic",
          fontSize: { value: 16, unit: "px" },
          lineHeight: 1.5,
          letterSpacing: 0.2,
        },
      }),
      [fontAsset()],
    );
    expect(result.kind).toBe("typography-composite");
    expect(result.family).toBe("Brand Sans");
    expect(result.weight).toBe(700);
    expect(result.style).toBe("italic");
    expect(result.size).toEqual({ value: 16, unit: "px" });
    expect(result.lineHeight).toBe(1.5);
    expect(result.letterSpacing).toBe(0.2);
    expect(result.matchState).toBe("matched");
  });

  it("font-size y line-height no muestran family ni matchedAssets", () => {
    const fontSize = projectTypography(token({ path: "typography.font-size.h1", effectiveType: "dimension", resolvedValue: { value: 32, unit: "px" } }), [fontAsset()]);
    const lineHeight = projectTypography(token({ path: "typography.line-height.h1", effectiveType: "number", resolvedValue: 1.4 }), [fontAsset()]);
    expect(fontSize).toEqual({
      kind: "font-size",
      token: fontSize.token,
      value: { value: 32, unit: "px" },
    });
    expect(lineHeight).toEqual({
      kind: "line-height",
      token: lineHeight.token,
      value: 1.4,
    });
    expect("family" in fontSize).toBe(false);
    expect("matchedAssets" in lineHeight).toBe(false);
  });

  it("letter-spacing y font-weight usan kinds específicos y solo exponen value", () => {
    const letterSpacing = projectTypography(token({ path: "typography.letter-spacing.tight", effectiveType: "dimension", resolvedValue: { value: -0.3, unit: "px" } }), []);
    const fontWeight = projectTypography(token({ path: "typography.font-weight.bold", effectiveType: "fontWeight", resolvedValue: 700 }), []);
    expect(letterSpacing.kind).toBe("letter-spacing");
    expect(letterSpacing.value).toEqual({ value: -0.3, unit: "px" });
    expect(fontWeight.kind).toBe("font-weight");
    expect(fontWeight.value).toBe(700);
  });
});
