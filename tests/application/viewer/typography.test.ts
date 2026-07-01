// T035 (009) — Coincidencia de familia con/sin asset, `licenseState` correcto en los tres casos,
// subcampos ausentes ⇒ `null` (nunca default).
import { describe, expect, it } from "vitest";
import { projectTypography } from "../../../src/application/viewer/typography.js";
import type { ViewerTokenV1 } from "../../../src/application/viewer/token.js";
import type { ViewerAssetV1 } from "../../../src/application/viewer/asset.js";
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

describe("projectTypography (T035)", () => {
  it("compuesto typography: lee subcampos tal cual desde resolvedValue", () => {
    const t = token({
      resolvedValue: { fontFamily: "Brand Sans", fontWeight: 700, fontStyle: "italic", fontSize: { value: 16, unit: "px" }, lineHeight: 1.5, letterSpacing: 0.2 },
    });
    const result = projectTypography(t, []);
    expect(result.family).toBe("Brand Sans");
    expect(result.weight).toBe(700);
    expect(result.style).toBe("italic");
    expect(result.size).toEqual({ value: 16, unit: "px" });
    expect(result.lineHeight).toBe(1.5);
    expect(result.letterSpacing).toBe(0.2);
  });

  it("subcampos ausentes en el compuesto ⇒ null (nunca un default fabricado)", () => {
    const t = token({ resolvedValue: { fontFamily: "Brand Sans" } });
    const result = projectTypography(t, []);
    expect(result.weight).toBeNull();
    expect(result.style).toBeNull();
    expect(result.size).toBeNull();
    expect(result.lineHeight).toBeNull();
    expect(result.letterSpacing).toBeNull();
  });

  it("tipo escalar fontFamily solo: family=valor, resto null", () => {
    const t = token({ effectiveType: "fontFamily", resolvedValue: "Brand Sans" });
    const result = projectTypography(t, []);
    expect(result.family).toBe("Brand Sans");
    expect(result.weight).toBeNull();
  });

  it("tipo escalar fontWeight solo: weight=valor, family null", () => {
    const t = token({ effectiveType: "fontWeight", resolvedValue: 600 });
    const result = projectTypography(t, []);
    expect(result.weight).toBe(600);
    expect(result.family).toBeNull();
  });

  it("dimension suelto bajo typography (sin desambiguación posible) ⇒ todos los subcampos null", () => {
    const t = token({ effectiveType: "dimension", resolvedValue: { value: 16, unit: "px" } });
    const result = projectTypography(t, []);
    expect(result).toMatchObject({ family: null, weight: null, style: null, size: null, lineHeight: null, letterSpacing: null });
  });

  it("licenseState=declared cuando hay asset vinculado con licencia declarada", () => {
    const t = token({ resolvedValue: { fontFamily: "Brand Sans" } });
    const asset = fontAsset({ logicalPath: "fonts/brand-sans.woff2", license: declaredLicense({ identifier: "OFL-1.1" }) });
    const result = projectTypography(t, [asset]);
    expect(result.linkedFontAsset).toBe(asset);
    expect(result.licenseState).toBe("declared");
  });

  it("licenseState=unspecified cuando hay asset vinculado sin licencia declarada", () => {
    const t = token({ resolvedValue: { fontFamily: "Brand Sans" } });
    const asset = fontAsset({ logicalPath: "fonts/brand-sans.woff2", license: UNSPECIFIED_LICENSE });
    const result = projectTypography(t, [asset]);
    expect(result.linkedFontAsset).toBe(asset);
    expect(result.licenseState).toBe("unspecified");
  });

  it("licenseState=no-matching-asset cuando no hay ningún asset con ese nombre", () => {
    const t = token({ resolvedValue: { fontFamily: "Unrelated Family" } });
    const asset = fontAsset({ logicalPath: "fonts/brand-sans.woff2" });
    const result = projectTypography(t, [asset]);
    expect(result.linkedFontAsset).toBeNull();
    expect(result.licenseState).toBe("no-matching-asset");
  });

  it("sin family (typography sin fontFamily) ⇒ nunca vincula ningún asset", () => {
    const t = token({ resolvedValue: { fontWeight: 400 } });
    const asset = fontAsset();
    const result = projectTypography(t, [asset]);
    expect(result.linkedFontAsset).toBeNull();
    expect(result.licenseState).toBe("no-matching-asset");
  });
});
