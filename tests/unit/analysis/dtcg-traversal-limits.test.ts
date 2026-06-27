// T027/T028 — Recorrido (orden, rutas, profundidad), límites inyectables, estadísticas, orden de issues.
import { describe, expect, it } from "vitest";
import { traverseDtcgTree, type TraversalLimits } from "../../../src/infrastructure/analysis/traverse-dtcg-tree.js";
import { ANALYSIS_LIMITS } from "../../../src/domain/traversal/limits.js";

const color = { colorSpace: "srgb", components: [0, 0, 0], hex: "#000000" };
const tok = (extra: Record<string, unknown> = {}) => ({ $type: "color", $value: color, $description: "d", ...extra });

function withLimits(over: Partial<TraversalLimits>): TraversalLimits {
  return { ...ANALYSIS_LIMITS, ...over };
}

describe("recorrido — orden y rutas", () => {
  it("orden determinista = orden de inserción (pre-orden DFS)", () => {
    const r = traverseDtcgTree({
      color: { a: tok(), b: tok() },
      space: { s: { $type: "dimension", $value: "1px", $description: "d" } },
    });
    expect(r.nodes.map((n) => n.path)).toEqual(["color.a", "color.b", "space.s"]);
  });

  it("rutas canónicas y profundidad (raíz=0; depth = nº de segmentos)", () => {
    const r = traverseDtcgTree({ color: { brand: { primary: tok() } } });
    const node = r.nodes[0];
    expect(node?.path).toBe("color.brand.primary");
    expect(node?.depth).toBe(3);
    expect(r.statistics.maxDepth).toBe(3);
  });

  it("dos ejecuciones idénticas ⇒ mismos nodos, estadísticas e issues (determinismo)", () => {
    const doc = { color: { a: tok(), b: { $value: "{color.a}", $description: "d" } } };
    expect(traverseDtcgTree(doc)).toEqual(traverseDtcgTree(doc));
  });
});

describe("límites del análisis (inyectables)", () => {
  it("límite de profundidad → error limit-depth-exceeded + partial + inválido", () => {
    const r = traverseDtcgTree({ a: { b: { c: tok() } } }, withLimits({ maxDepth: 2 }));
    expect(r.errors.some((i) => i.code === "limit-depth-exceeded")).toBe(true);
    expect(r.limits.partial).toBe(true);
    expect(r.valid).toBe(false);
  });

  it("límite de nodos → error limit-nodes-exceeded + partial; conserva lo analizado", () => {
    const r = traverseDtcgTree({ g: { a: tok(), b: tok(), c: tok() } }, withLimits({ maxNodes: 2 }));
    expect(r.errors.some((i) => i.code === "limit-nodes-exceeded")).toBe(true);
    expect(r.limits.partial).toBe(true);
    expect(r.nodes.length).toBeLessThanOrEqual(2 + 1); // detiene cerca del límite, sin ocultar lo previo
  });

  it("ruta demasiado larga → error limit-path-len-exceeded", () => {
    const r = traverseDtcgTree({ averylongname: tok() }, withLimits({ maxPathLength: 3 }));
    expect(r.errors.some((i) => i.code === "limit-path-len-exceeded")).toBe(true);
    expect(r.limits.partial).toBe(true);
  });

  it("límite de issues → terminal limit-issues-exceeded, total ≤ maxIssues, partial", () => {
    const many: Record<string, unknown> = {};
    for (let i = 0; i < 20; i += 1) many[`bad${i}`] = { $type: "weird", $value: "v", $description: "d" };
    const r = traverseDtcgTree(many, withLimits({ maxIssues: 5 }));
    expect(r.errors.length + r.warnings.length).toBeLessThanOrEqual(5);
    expect(r.errors.some((i) => i.code === "limit-issues-exceeded")).toBe(true);
    expect(r.limits.partial).toBe(true);
  });
});

describe("estadísticas", () => {
  it("grupos/tokens/concretos/aliases/byType/maxDepth correctos", () => {
    const r = traverseDtcgTree({
      color: { $type: "color", blue: { $value: color, $description: "d" }, primary: { $value: "{color.blue}", $description: "d" } },
      empty: {},
    });
    expect(r.statistics.groups).toBe(2); // color, empty
    expect(r.statistics.total).toBe(2); // blue, primary
    expect(r.statistics.aliases).toBe(1); // primary
    expect(r.statistics.concreteValues).toBe(1); // blue
    expect(r.statistics.byType).toEqual({ color: 2 }); // ambos tipo efectivo color
    expect(r.valid).toBe(true);
  });

  it("sin tipo efectivo → categoría (untyped) en byType", () => {
    const r = traverseDtcgTree({ g: { t: { $value: "v", $description: "d" } } });
    expect(r.statistics.byType).toEqual({ "(untyped)": 1 });
  });
});

describe("issues — severidad y orden", () => {
  it("errores y warnings en arrays separados; orden de recorrido", () => {
    const r = traverseDtcgTree({ a: { $type: "color", $value: color }, b: { $type: "weird", $value: "v", $description: "d" } });
    // 'a' sin descripción → warning; 'b' tipo desconocido → error.
    expect(r.warnings.some((i) => i.code === "dtcg-description-missing")).toBe(true);
    expect(r.errors.some((i) => i.code === "dtcg-type-unrecognized")).toBe(true);
  });
});
