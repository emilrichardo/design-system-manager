// T005 (011) — Casos válidos e inválidos por tipo, per contracts/dtcg-type-support.md.
import { describe, expect, it } from "vitest";
import {
  parseDimension,
  parseDuration,
  parseNumberToken,
  parseFontFamily,
  parseFontWeight,
  parseCubicBezier,
  parseStrokeStyle,
  parseBorder,
  parseTransition,
  parseShadow,
  parseGradient,
  parseTypography,
  isConcreteSrgbColor,
} from "../../../../src/domain/dtcg/types/index.js";

const RED = { colorSpace: "srgb", components: [1, 0, 0], alpha: 1, hex: "#ff0000" };

describe("isConcreteSrgbColor", () => {
  it("acepta un color srgb concreto valido", () => {
    expect(isConcreteSrgbColor(RED)).toBe(true);
  });
  it("rechaza un alias string", () => {
    expect(isConcreteSrgbColor("{color.base.red}")).toBe(false);
  });
});

describe("dimension", () => {
  it("acepta {value,unit} valido", () => {
    const r = parseDimension({ value: 16, unit: "px" }, "spacing.4");
    expect(r.ok).toBe(true);
  });
  it("rechaza string plano (bug reproducido en sesion de aceptacion)", () => {
    const r = parseDimension("16px", "spacing.4");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issue.code).toBe("dimension-shape-invalid");
  });
  it("rechaza unit no reconocida", () => {
    const r = parseDimension({ value: 1, unit: "vw" }, "x");
    expect(r.ok).toBe(false);
  });
});

describe("duration", () => {
  it("acepta {value,unit:ms|s}", () => {
    expect(parseDuration({ value: 200, unit: "ms" }, "x").ok).toBe(true);
  });
  it("rechaza unit invalida", () => {
    expect(parseDuration({ value: 200, unit: "min" }, "x").ok).toBe(false);
  });
});

describe("number", () => {
  it("acepta finito", () => {
    expect(parseNumberToken(1.5, "x").ok).toBe(true);
  });
  it("rechaza NaN/Infinity", () => {
    expect(parseNumberToken(Number.NaN, "x").ok).toBe(false);
    expect(parseNumberToken(Number.POSITIVE_INFINITY, "x").ok).toBe(false);
  });
});

describe("fontFamily", () => {
  it("acepta string no vacio", () => {
    expect(parseFontFamily("Inter", "x").ok).toBe(true);
  });
  it("acepta array de strings no vacios", () => {
    expect(parseFontFamily(["Inter", "sans-serif"], "x").ok).toBe(true);
  });
  it("rechaza string vacio", () => {
    expect(parseFontFamily("", "x").ok).toBe(false);
  });
  it("rechaza array vacio", () => {
    expect(parseFontFamily([], "x").ok).toBe(false);
  });
});

describe("fontWeight", () => {
  it("acepta keywords y enteros en rango", () => {
    expect(parseFontWeight("bold", "x").ok).toBe(true);
    expect(parseFontWeight(700, "x").ok).toBe(true);
  });
  it("rechaza fuera de rango o no entero", () => {
    expect(parseFontWeight(1001, "x").ok).toBe(false);
    expect(parseFontWeight(400.5, "x").ok).toBe(false);
  });
});

describe("cubicBezier", () => {
  it("acepta [x1,y1,x2,y2] con x en [0,1]", () => {
    expect(parseCubicBezier([0.4, 0, 0.2, 1], "x").ok).toBe(true);
  });
  it("rechaza x1/x2 fuera de rango", () => {
    expect(parseCubicBezier([1.5, 0, 0.2, 1], "x").ok).toBe(false);
  });
  it("rechaza longitud distinta de 4", () => {
    expect(parseCubicBezier([0, 0, 1], "x").ok).toBe(false);
  });
});

describe("strokeStyle", () => {
  it("acepta keyword reconocido", () => {
    expect(parseStrokeStyle("dashed", "x").ok).toBe(true);
  });
  it("acepta objeto {dashArray,lineCap}", () => {
    const r = parseStrokeStyle({ dashArray: [{ value: 2, unit: "px" }], lineCap: "round" }, "x");
    expect(r.ok).toBe(true);
  });
  it("rechaza keyword desconocido", () => {
    expect(parseStrokeStyle("wavy", "x").ok).toBe(false);
  });
});

describe("border", () => {
  it("acepta composicion color+width+style validos", () => {
    const r = parseBorder({ color: RED, width: { value: 1, unit: "px" }, style: "solid" }, "x");
    expect(r.ok).toBe(true);
  });
  it("rechaza color invalido", () => {
    const r = parseBorder({ color: "#ff0000", width: { value: 1, unit: "px" }, style: "solid" }, "x");
    expect(r.ok).toBe(false);
  });
});

describe("transition", () => {
  it("acepta composicion valida", () => {
    const r = parseTransition({ duration: { value: 200, unit: "ms" }, timingFunction: [0, 0, 1, 1] }, "x");
    expect(r.ok).toBe(true);
  });
  it("rechaza sin duration", () => {
    const r = parseTransition({ timingFunction: [0, 0, 1, 1] }, "x");
    expect(r.ok).toBe(false);
  });
});

describe("shadow", () => {
  const layer = { color: RED, offsetX: { value: 1, unit: "px" }, offsetY: { value: 1, unit: "px" } };
  it("acepta una capa con defaults de blur/spread", () => {
    expect(parseShadow(layer, "x").ok).toBe(true);
  });
  it("acepta multi-capa (array no vacio)", () => {
    expect(parseShadow([layer, layer], "x").ok).toBe(true);
  });
  it("rechaza array vacio", () => {
    expect(parseShadow([], "x").ok).toBe(false);
  });
  it("rechaza color no concreto", () => {
    expect(parseShadow({ ...layer, color: "{shadow.color}" }, "x").ok).toBe(false);
  });
});

describe("gradient", () => {
  it("acepta stops validos ordenables", () => {
    const r = parseGradient([{ color: RED, position: 0 }, { color: RED, position: 1 }], "x");
    expect(r.ok).toBe(true);
  });
  it("rechaza array vacio", () => {
    expect(parseGradient([], "x").ok).toBe(false);
  });
  it("rechaza position fuera de [0,1]", () => {
    expect(parseGradient([{ color: RED, position: 1.2 }], "x").ok).toBe(false);
  });
});

describe("typography", () => {
  it("acepta fontFamily+fontSize obligatorios, resto opcional", () => {
    const r = parseTypography({ fontFamily: "Inter", fontSize: { value: 16, unit: "px" } }, "x");
    expect(r.ok).toBe(true);
  });
  it("acepta subset completo", () => {
    const r = parseTypography(
      { fontFamily: "Inter", fontSize: { value: 16, unit: "px" }, fontWeight: 400, lineHeight: 1.5, letterSpacing: { value: 0, unit: "px" } },
      "x",
    );
    expect(r.ok).toBe(true);
  });
  it("rechaza sin fontSize", () => {
    const r = parseTypography({ fontFamily: "Inter" }, "x");
    expect(r.ok).toBe(false);
  });
});
