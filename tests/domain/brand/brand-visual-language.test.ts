// T005 (011) — BrandAssetReferenceV1: resolucion contra inventario real, nunca copia el asset.
import { describe, expect, it } from "vitest";
import {
  REQUIRED_LOGO_VARIANT_ROLES,
  placeholderAssetReference,
  resolveAssetReference,
} from "../../../src/domain/brand/brand-visual-language.js";

describe("REQUIRED_LOGO_VARIANT_ROLES", () => {
  it("incluye las 5 variantes del brief", () => {
    expect(REQUIRED_LOGO_VARIANT_ROLES).toEqual(["primary", "monochrome", "horizontal", "vertical", "dark-background"]);
  });
});

describe("resolveAssetReference", () => {
  it("resuelve a 'resolved' cuando el logicalPath existe en el inventario", () => {
    const ref = { logicalPath: "logos/primary.svg", variantRole: "primary", required: true, resolution: "placeholder" as const };
    const resolved = resolveAssetReference(ref, new Set(["logos/primary.svg"]));
    expect(resolved.resolution).toBe("resolved");
  });
  it("resuelve a 'missing' cuando el logicalPath NO existe en el inventario (nunca lo inventa)", () => {
    const ref = { logicalPath: "logos/ghost.svg", variantRole: "primary", required: true, resolution: "placeholder" as const };
    const resolved = resolveAssetReference(ref, new Set(["logos/primary.svg"]));
    expect(resolved.resolution).toBe("missing");
  });
  it("una referencia requerida sin logicalPath es 'missing'", () => {
    const ref = placeholderAssetReference("monochrome", true);
    expect(resolveAssetReference(ref, new Set()).resolution).toBe("missing");
  });
  it("una referencia opcional sin logicalPath queda 'placeholder'", () => {
    const ref = placeholderAssetReference("dark-background", false);
    expect(resolveAssetReference(ref, new Set()).resolution).toBe("placeholder");
  });
});
