// T034 (009) — `computeContrast`: casos `pass`/`fail`/`not-computable` para texto normal/grande y no
// texto, valores límite exactos (4.5:1/3:1).
import { describe, expect, it } from "vitest";
import { computeContrast } from "../../../src/application/viewer/contrast.js";
import type { ViewerSRgb } from "../../../src/application/viewer/color.js";

const BLACK: ViewerSRgb = { r: 0, g: 0, b: 0 };
const WHITE: ViewerSRgb = { r: 1, g: 1, b: 1 };
const text = (sRgb: ViewerSRgb | null) => ({ path: "text", sRgb });
const bg = (sRgb: ViewerSRgb | null) => ({ path: "bg", sRgb });

describe("computeContrast (T034)", () => {
  it("black on white: ratio 21:1, pass en ambos niveles", () => {
    const normal = computeContrast(text(BLACK), bg(WHITE), "AA-normal");
    expect(normal.state).toBe("pass");
    expect(normal.ratio).toBeCloseTo(21, 1);
    const large = computeContrast(text(BLACK), bg(WHITE), "AA-large");
    expect(large.state).toBe("pass");
  });

  it("mismo color: ratio 1:1, fail en ambos niveles", () => {
    const r = computeContrast(text(WHITE), bg(WHITE), "AA-normal");
    expect(r.ratio).toBeCloseTo(1, 5);
    expect(r.state).toBe("fail");
  });

  it("not-computable cuando el texto no es reducible a sRGB (ratio null)", () => {
    const r = computeContrast(text(null), bg(WHITE), "AA-normal");
    expect(r.state).toBe("not-computable");
    expect(r.ratio).toBeNull();
  });

  it("not-computable cuando el fondo no es reducible a sRGB (ratio null)", () => {
    const r = computeContrast(text(BLACK), bg(null), "AA-large");
    expect(r.state).toBe("not-computable");
    expect(r.ratio).toBeNull();
  });

  it("umbral exacto AA-normal (4.5:1): un gris con ratio >= 4.5 sobre blanco → pass; justo debajo → fail", () => {
    // #767676 sobre blanco ≈ 4.54:1 (justo por encima del umbral WCAG AA normal).
    const passGray: ViewerSRgb = { r: 0x76 / 255, g: 0x76 / 255, b: 0x76 / 255 };
    const passResult = computeContrast(text(passGray), bg(WHITE), "AA-normal");
    expect(passResult.ratio).toBeGreaterThanOrEqual(4.5);
    expect(passResult.state).toBe("pass");

    // #777777 sobre blanco ≈ 4.48:1 (justo por debajo del umbral).
    const failGray: ViewerSRgb = { r: 0x77 / 255, g: 0x77 / 255, b: 0x77 / 255 };
    const failResult = computeContrast(text(failGray), bg(WHITE), "AA-normal");
    expect(failResult.ratio).toBeLessThan(4.5);
    expect(failResult.state).toBe("fail");
  });

  it("umbral exacto AA-large (3:1): un gris más claro pasa para texto grande pero no para normal", () => {
    // #949494 sobre blanco ≈ 3.02:1: pasa large (>=3), falla normal (<4.5).
    const gray: ViewerSRgb = { r: 0x94 / 255, g: 0x94 / 255, b: 0x94 / 255 };
    const large = computeContrast(text(gray), bg(WHITE), "AA-large");
    expect(large.ratio).toBeGreaterThanOrEqual(3);
    expect(large.state).toBe("pass");
    const normal = computeContrast(text(gray), bg(WHITE), "AA-normal");
    expect(normal.state).toBe("fail");
  });

  it("orden de argumentos no afecta la ratio (conmutativo)", () => {
    const a = computeContrast(text(BLACK), bg(WHITE), "AA-normal");
    const b = computeContrast(text(WHITE), bg(BLACK), "AA-normal");
    expect(a.ratio).toBeCloseTo(b.ratio as number, 6);
  });

  it("conserva textPath/backgroundPath/level en el resultado", () => {
    const r = computeContrast({ path: "color.text.primary", sRgb: BLACK }, { path: "color.bg.primary", sRgb: WHITE }, "AA-large");
    expect(r.textPath).toBe("color.text.primary");
    expect(r.backgroundPath).toBe("color.bg.primary");
    expect(r.level).toBe("AA-large");
  });
});
