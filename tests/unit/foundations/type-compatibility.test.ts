// T016 (004) — Compatibilidad categoría/tipo sobre el effectiveType de 002 (T015).
import { describe, expect, it } from "vitest";
import { foundationTypeCompatibility } from "../../../src/domain/foundations/foundation-type-compatibility.js";
import {
  FOUNDATION_CATEGORIES,
  foundationCategoryDefinition,
} from "../../../src/domain/foundations/foundation-category.js";
import { RECOGNIZED_DTCG_TYPES } from "../../../src/domain/dtcg/recognized-types.js";

describe("foundationTypeCompatibility (T016)", () => {
  it("compatible para cada supportedType de cada categoría (registro = única fuente)", () => {
    for (const def of FOUNDATION_CATEGORIES) {
      for (const t of def.supportedTypes) {
        expect(foundationTypeCompatibility(def.id, t)).toBe("compatible");
      }
    }
  });

  it("mismatch por categoría: un tipo reconocido ajeno a supportedTypes", () => {
    expect(foundationTypeCompatibility("color", "dimension")).toBe("mismatch");
    expect(foundationTypeCompatibility("spacing", "color")).toBe("mismatch");
    expect(foundationTypeCompatibility("opacity", "color")).toBe("mismatch");
    expect(foundationTypeCompatibility("motion", "shadow")).toBe("mismatch");
    expect(foundationTypeCompatibility("shadow", "number")).toBe("mismatch");
    expect(foundationTypeCompatibility("radius", "color")).toBe("mismatch");
    expect(foundationTypeCompatibility("sizing", "shadow")).toBe("mismatch");
    expect(foundationTypeCompatibility("typography", "shadow")).toBe("mismatch");
    expect(foundationTypeCompatibility("border", "shadow")).toBe("mismatch");
  });

  it("casos mínimos compatibles del prompt", () => {
    expect(foundationTypeCompatibility("color", "color")).toBe("compatible");
    expect(foundationTypeCompatibility("spacing", "dimension")).toBe("compatible");
    expect(foundationTypeCompatibility("radius", "dimension")).toBe("compatible");
    expect(foundationTypeCompatibility("sizing", "dimension")).toBe("compatible");
    expect(foundationTypeCompatibility("opacity", "number")).toBe("compatible");
    expect(foundationTypeCompatibility("shadow", "shadow")).toBe("compatible");
    expect(foundationTypeCompatibility("motion", "duration")).toBe("compatible");
    expect(foundationTypeCompatibility("motion", "cubicBezier")).toBe("compatible");
    expect(foundationTypeCompatibility("motion", "transition")).toBe("compatible");
  });

  it("tipo ausente (null) → unknown (no inventa tipo)", () => {
    for (const def of FOUNDATION_CATEGORIES) {
      expect(foundationTypeCompatibility(def.id, null)).toBe("unknown");
    }
  });

  it("tipo desconocido (no reconocido por DTCG) → unknown (no se reinterpreta)", () => {
    expect(foundationTypeCompatibility("color", "rgb")).toBe("unknown");
    expect(foundationTypeCompatibility("spacing", "length")).toBe("unknown");
    expect(foundationTypeCompatibility("motion", "")).toBe("unknown");
    expect(foundationTypeCompatibility("color", "Color")).toBe("unknown"); // case-sensitive
  });

  it("dimension compatible en spacing/radius/sizing/typography/border pero no determina la categoría", () => {
    for (const id of ["spacing", "radius", "sizing", "typography", "border"] as const) {
      expect(foundationTypeCompatibility(id, "dimension")).toBe("compatible");
    }
    // El mismo tipo `dimension` es compatible con varias categorías: por sí solo no las distingue.
    expect(foundationTypeCompatibility("color", "dimension")).toBe("mismatch");
    expect(foundationTypeCompatibility("opacity", "dimension")).toBe("mismatch");
  });

  it("border y typography siguen exactamente sus supportedTypes del registro", () => {
    expect(foundationCategoryDefinition("border").supportedTypes).toEqual([
      "dimension",
      "strokeStyle",
      "color",
      "border",
    ]);
    for (const t of ["dimension", "strokeStyle", "color", "border"]) {
      expect(foundationTypeCompatibility("border", t)).toBe("compatible");
    }
    expect(foundationCategoryDefinition("typography").supportedTypes).toEqual([
      "dimension",
      "fontFamily",
      "fontWeight",
      "number",
      "typography",
    ]);
    for (const t of ["dimension", "fontFamily", "fontWeight", "number", "typography"]) {
      expect(foundationTypeCompatibility("typography", t)).toBe("compatible");
    }
  });

  it("solo color es deep; la compatibilidad no afirma profundidad", () => {
    // `color + color` es compatible (deep), pero `spacing + dimension` también es compatible (surface).
    expect(foundationCategoryDefinition("color").validationDepth).toBe("deep");
    expect(foundationCategoryDefinition("spacing").validationDepth).toBe("surface");
    expect(foundationTypeCompatibility("color", "color")).toBe("compatible");
    expect(foundationTypeCompatibility("spacing", "dimension")).toBe("compatible");
  });

  it("determinista: mismo input → mismo resultado; cubre los 13 tipos reconocidos", () => {
    for (const t of RECOGNIZED_DTCG_TYPES) {
      const a = foundationTypeCompatibility("color", t);
      const b = foundationTypeCompatibility("color", t);
      expect(a).toBe(b);
      expect(["compatible", "mismatch", "unknown"]).toContain(a);
    }
  });
});
