// T005 (004) — Registro canónico de categorías: 9 ids, orden 0–8, profundidad, inmutabilidad.
import { describe, expect, it } from "vitest";
import {
  FOUNDATION_CATEGORIES,
  FOUNDATION_CATEGORY_IDS,
  foundationCategoryDefinition,
  isFoundationCategoryId,
} from "../../../src/domain/foundations/foundation-category.js";
import { RECOGNIZED_DTCG_TYPES } from "../../../src/domain/dtcg/recognized-types.js";

const CANONICAL = ["color", "spacing", "typography", "radius", "border", "shadow", "opacity", "sizing", "motion"];
const ALLOWED_KEYS = ["id", "displayOrder", "supportedTypes", "validationDepth", "allowsPrimitive", "allowsSemantic"].sort();

describe("FOUNDATION_CATEGORIES (T002/T005)", () => {
  it("contiene exactamente nueve ids únicos en orden canónico", () => {
    expect(FOUNDATION_CATEGORIES).toHaveLength(9);
    expect(FOUNDATION_CATEGORY_IDS).toEqual(CANONICAL);
    expect(new Set(FOUNDATION_CATEGORY_IDS).size).toBe(9);
  });

  it("displayOrder es 0–8 continuo y coincide con el índice", () => {
    expect(FOUNDATION_CATEGORIES.map((c) => c.displayOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("solo `color` es deep; las otras ocho son surface", () => {
    for (const c of FOUNDATION_CATEGORIES) {
      expect(c.validationDepth).toBe(c.id === "color" ? "deep" : "surface");
    }
  });

  it("supportedTypes usa solo tipos DTCG reconocidos por 002", () => {
    const recognized = new Set<string>(RECOGNIZED_DTCG_TYPES);
    for (const c of FOUNDATION_CATEGORIES) {
      expect(c.supportedTypes.length).toBeGreaterThan(0);
      for (const t of c.supportedTypes) expect(recognized.has(t)).toBe(true);
    }
  });

  it("cada definición tiene exactamente las claves aprobadas (sin valores/preset/CSS/componentes)", () => {
    for (const c of FOUNDATION_CATEGORIES) {
      expect(Object.keys(c).sort()).toEqual(ALLOWED_KEYS);
    }
  });

  it("admite primitive y semantic en todas las categorías (v1)", () => {
    for (const c of FOUNDATION_CATEGORIES) {
      expect(c.allowsPrimitive).toBe(true);
      expect(c.allowsSemantic).toBe(true);
    }
  });

  it("registro, definiciones y supportedTypes son inmutables", () => {
    expect(Object.isFrozen(FOUNDATION_CATEGORIES)).toBe(true);
    for (const c of FOUNDATION_CATEGORIES) {
      expect(Object.isFrozen(c)).toBe(true);
      expect(Object.isFrozen(c.supportedTypes)).toBe(true);
    }
    expect(() => (FOUNDATION_CATEGORIES as { push: (x: unknown) => void }).push({})).toThrow();
  });

  it("isFoundationCategoryId: match exacto (sin plurales/sinónimos/case-folding)", () => {
    for (const id of CANONICAL) expect(isFoundationCategoryId(id)).toBe(true);
    for (const bad of ["colors", "space", "font", "size", "animation", "Color", "COLOR", ""]) {
      expect(isFoundationCategoryId(bad)).toBe(false);
    }
  });

  it("foundationCategoryDefinition devuelve la definición esperada", () => {
    expect(foundationCategoryDefinition("color").validationDepth).toBe("deep");
    expect(foundationCategoryDefinition("motion").supportedTypes).toEqual(["duration", "cubicBezier", "transition"]);
  });
});
