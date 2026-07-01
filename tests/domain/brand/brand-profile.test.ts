// T005 (011) — BrandProfileV1: placeholder valido, nunca inventa datos.
import { describe, expect, it } from "vitest";
import { coreFieldCount, countCompletedCoreFields, emptyBrandProfile } from "../../../src/domain/brand/brand-profile.js";

describe("emptyBrandProfile", () => {
  it("es un placeholder explicito sin inventar nombre/mision/valores", () => {
    const profile = emptyBrandProfile();
    expect(profile.status).toBe("placeholder");
    expect(profile.name).toBeNull();
    expect(profile.mission).toBeNull();
    expect(profile.values).toEqual([]);
    expect(profile.principles).toEqual([]);
  });
  it("es inmutable", () => {
    expect(Object.isFrozen(emptyBrandProfile())).toBe(true);
  });
});

describe("countCompletedCoreFields", () => {
  it("cuenta 0 en un placeholder vacio", () => {
    expect(countCompletedCoreFields(emptyBrandProfile())).toBe(0);
  });
  it("cuenta campos con contenido no vacio", () => {
    const profile = { ...emptyBrandProfile(), name: "Eurotech", purpose: "  " };
    expect(countCompletedCoreFields(profile)).toBe(1);
  });
  it("coreFieldCount refleja el total de campos nucleo evaluados", () => {
    expect(coreFieldCount()).toBe(8);
  });
});
