// T014 (004) — Resolución de categoría por primer segmento canónico exacto (T013).
import { describe, expect, it } from "vitest";
import { resolveFoundationCategory } from "../../../src/domain/foundations/resolve-foundation-category.js";
import { FOUNDATION_CATEGORY_IDS } from "../../../src/domain/foundations/foundation-category.js";
import { deepFreeze } from "../json/json-test-utils.js";

describe("resolveFoundationCategory (T014)", () => {
  it("resuelve las nueve categorías por su primer segmento", () => {
    for (const id of FOUNDATION_CATEGORY_IDS) {
      expect(resolveFoundationCategory(id)).toBe(id);
      expect(resolveFoundationCategory(`${id}.foo.bar`)).toBe(id);
    }
  });

  it("ejemplos del contrato (primer segmento, paths profundos)", () => {
    expect(resolveFoundationCategory("color.base.blue.500")).toBe("color");
    expect(resolveFoundationCategory("spacing.300")).toBe("spacing");
    expect(resolveFoundationCategory("typography.body.size")).toBe("typography");
    expect(resolveFoundationCategory("radius.medium")).toBe("radius");
    expect(resolveFoundationCategory("border.default.width")).toBe("border");
    expect(resolveFoundationCategory("shadow.elevation.100")).toBe("shadow");
    expect(resolveFoundationCategory("opacity.disabled")).toBe("opacity");
    expect(resolveFoundationCategory("sizing.container.default")).toBe("sizing");
    expect(resolveFoundationCategory("motion.duration.fast")).toBe("motion");
  });

  it("plurales/sinónimos/case-mismatch → unresolved (sin heurísticas)", () => {
    for (const p of [
      "colors.blue.500", // plural
      "space.300", // sinónimo
      "font.size.400", // sinónimo
      "size.container", // sinónimo
      "animation.fast", // sinónimo
      "Color.blue.500", // case mismatch
      "SPACING.300", // case mismatch
      "background.default", // rol semántico, no categoría
      "primary.default",
    ]) {
      expect(resolveFoundationCategory(p)).toBe("unresolved");
    }
  });

  it("paths vacíos/malformados no lanzan y se comportan de forma explícita", () => {
    expect(resolveFoundationCategory("")).toBe("unresolved"); // primer segmento vacío
    expect(resolveFoundationCategory(".")).toBe("unresolved"); // segmento vacío
    expect(resolveFoundationCategory(".color")).toBe("unresolved"); // primer segmento vacío
    expect(resolveFoundationCategory("color.")).toBe("color"); // primer segmento exacto "color"
    expect(resolveFoundationCategory("color..blue")).toBe("color"); // primer segmento exacto "color"
    expect(resolveFoundationCategory("colorblue")).toBe("unresolved"); // sin separador, no exacto
  });

  it("tipo de retorno: FoundationCategoryId | \"unresolved\"", () => {
    const r = resolveFoundationCategory("color.x");
    expect(typeof r).toBe("string");
    expect([...FOUNDATION_CATEGORY_IDS, "unresolved"]).toContain(r);
  });

  it("case-sensitive y determinista (mismo input → mismo resultado)", () => {
    expect(resolveFoundationCategory("Spacing.300")).toBe("unresolved");
    expect(resolveFoundationCategory("spacing.300")).toBe(resolveFoundationCategory("spacing.300"));
  });

  it("no muta el input (string congelado vía wrapper)", () => {
    const holder = deepFreeze({ path: "color.blue.500" });
    expect(resolveFoundationCategory(holder.path)).toBe("color");
    expect(holder.path).toBe("color.blue.500");
  });

  it("nivel ≠ categoría: la categoría no depende del nivel foundation", () => {
    // Un token semantic bajo `color.*` sigue perteneciendo a `color`; la función solo ve el path.
    expect(resolveFoundationCategory("color.role.background")).toBe("color");
    // Y un token bajo un rol semántico (sin segmento de categoría) no se "promueve" a categoría.
    expect(resolveFoundationCategory("background.color.default")).toBe("unresolved");
  });
});
