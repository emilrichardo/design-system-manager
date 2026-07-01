// T026 — Estructura general DTCG y política de $type (reconocido/profundo/desconocido/heredado).
import { describe, expect, it } from "vitest";
import { traverseDtcgTree } from "../../../src/infrastructure/analysis/traverse-dtcg-tree.js";
import { createDtcgReadValidator } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";

describe("createDtcgReadValidator (T026, puerto)", () => {
  const color = { colorSpace: "srgb", components: [0, 0, 0], hex: "#000000" };
  it("documento válido ⇒ sin errores (puede haber warnings)", () => {
    const issues = createDtcgReadValidator().validate({ c: { $type: "color", $value: color, $description: "d" } });
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
  it("documento inválido ⇒ devuelve AnalysisIssue[] con error", () => {
    const issues = createDtcgReadValidator().validate({ x: { $type: "weird", $value: "v", $description: "d" } });
    expect(issues.some((i) => i.severity === "error" && i.code === "dtcg-type-unrecognized")).toBe(true);
  });
});

const color = (hex = "#000000") => ({ colorSpace: "srgb", components: [0, 0, 0], hex });
const codes = (r: { errors: readonly { code: string }[]; warnings: readonly { code: string }[] }) => ({
  errors: r.errors.map((i) => i.code),
  warnings: r.warnings.map((i) => i.code),
});

describe("DTCG read — estructura", () => {
  it("documento no objeto → error dtcg-document-invalid", () => {
    expect(traverseDtcgTree(42).valid).toBe(false);
    expect(codes(traverseDtcgTree(42)).errors).toContain("dtcg-document-invalid");
    expect(traverseDtcgTree(null).valid).toBe(false);
    expect(traverseDtcgTree([]).valid).toBe(false);
  });

  it("documento vacío {} → válido, 0 tokens, 0 grupos", () => {
    const r = traverseDtcgTree({});
    expect(r.valid).toBe(true);
    expect(r.statistics.total).toBe(0);
    expect(r.statistics.groups).toBe(0);
  });

  it("grupo válido con token; raíz no cuenta como grupo", () => {
    const r = traverseDtcgTree({ color: { blue: { $type: "color", $value: color("#0000ff"), $description: "azul" } } });
    expect(r.valid).toBe(true);
    expect(r.statistics.groups).toBe(1); // 'color' es grupo; la raíz no
    expect(r.statistics.total).toBe(1);
  });

  it("grupo vacío → warning dtcg-empty-group (no invalida)", () => {
    const r = traverseDtcgTree({ empty: {} });
    expect(r.valid).toBe(true);
    expect(codes(r).warnings).toContain("dtcg-empty-group");
  });

  it("nodo primitivo (no grupo ni token) → dtcg-node-invalid", () => {
    const r = traverseDtcgTree({ bad: "x" });
    expect(r.valid).toBe(false);
    expect(codes(r).errors).toContain("dtcg-node-invalid");
  });

  it("$extensions no se trata como hijo del árbol", () => {
    const r = traverseDtcgTree({ g: { $extensions: { vendor: { whatever: 1 } }, t: { $type: "color", $value: color("#ffffff"), $description: "x" } } });
    expect(r.statistics.total).toBe(1); // solo 't', no 'vendor/whatever'
  });

  it("token sin $description → warning dtcg-description-missing (no invalida)", () => {
    const r = traverseDtcgTree({ g: { t: { $type: "color", $value: color("#ffffff") } } });
    expect(r.valid).toBe(true);
    expect(codes(r).warnings).toContain("dtcg-description-missing");
  });
});

describe("DTCG read — política de $type", () => {
  it("color profundo válido → válido", () => {
    const r = traverseDtcgTree({ c: { $type: "color", $value: color("#ffffff"), $description: "d" } });
    expect(r.valid).toBe(true);
    expect(r.nodes[0]?.trust).toBe("valid");
  });

  it("color profundo inválido (hex plano) → error dtcg-color-value-invalid", () => {
    const r = traverseDtcgTree({ c: { $type: "color", $value: "#fff", $description: "d" } });
    expect(r.valid).toBe(false);
    expect(codes(r).errors).toContain("dtcg-color-value-invalid");
    expect(r.nodes[0]?.trust).toBe("untrusted");
  });

  it("dimension inválido → error específico, sin warning genérico", () => {
    const r = traverseDtcgTree({ s: { $type: "dimension", $value: "16px", $description: "d" } });
    expect(r.valid).toBe(false);
    expect(codes(r).errors).toContain("dimension-shape-invalid");
    expect(codes(r).warnings).not.toContain("dtcg-type-not-deeply-inspected");
    expect(r.statistics.byType).toEqual({ dimension: 1 });
    expect(r.nodes[0]?.trust).toBe("untrusted");
  });

  it("los 13 tipos reconocidos usan validación profunda y ya no emiten el warning genérico", () => {
    const cases: Array<[string, unknown]> = [
      ["dimension", { value: 16, unit: "px" }],
      ["fontFamily", ["Inter", "sans-serif"]],
      ["fontWeight", 700],
      ["duration", { value: 200, unit: "ms" }],
      ["cubicBezier", [0.4, 0, 0.2, 1]],
      ["number", 8],
      ["strokeStyle", "solid"],
      ["border", { color: color("#ffffff"), width: { value: 1, unit: "px" }, style: "solid" }],
      ["transition", { duration: { value: 200, unit: "ms" }, delay: { value: 0, unit: "ms" }, timingFunction: [0.4, 0, 0.2, 1] }],
      ["shadow", { color: color("#ffffff"), offsetX: { value: 1, unit: "px" }, offsetY: { value: 1, unit: "px" } }],
      ["gradient", [{ color: color("#ffffff"), position: 0 }]],
      ["typography", { fontFamily: "Inter", fontSize: { value: 16, unit: "px" } }],
    ];
    for (const [t, value] of cases) {
      const r = traverseDtcgTree({ x: { $type: t, $value: value, $description: "d" } });
      expect(r.valid).toBe(true);
      expect(codes(r).warnings).not.toContain("dtcg-type-not-deeply-inspected");
    }
  });

  it("tipo desconocido → error dtcg-type-unrecognized, untrusted, literal en byType", () => {
    const r = traverseDtcgTree({ x: { $type: "elevation", $value: "v", $description: "d" } });
    expect(r.valid).toBe(false);
    expect(codes(r).errors).toContain("dtcg-type-unrecognized");
    expect(r.nodes[0]?.trust).toBe("untrusted");
    expect(r.statistics.byType).toEqual({ elevation: 1 });
  });

  it("$extensions no legitima un tipo desconocido", () => {
    const r = traverseDtcgTree({ x: { $type: "weird", $value: "v", $description: "d", $extensions: { foo: 1 } } });
    expect(r.valid).toBe(false);
    expect(codes(r).errors).toContain("dtcg-type-unrecognized");
  });

  it("token sin tipo propio ni heredado → dtcg-type-undeterminable", () => {
    const r = traverseDtcgTree({ g: { t: { $value: "v", $description: "d" } } });
    expect(r.valid).toBe(false);
    expect(codes(r).errors).toContain("dtcg-type-undeterminable");
    expect(r.nodes[0]?.effectiveType).toBeNull();
  });

  it("tipo heredado del grupo ancestro (typeOrigin group + typeSourcePath)", () => {
    const r = traverseDtcgTree({ color: { $type: "color", blue: { $value: color("#0000ff"), $description: "d" } } });
    expect(r.valid).toBe(true);
    const node = r.nodes[0];
    expect(node?.effectiveType).toBe("color");
    expect(node?.typeOrigin).toBe("group");
    expect(node?.typeSourcePath).toBe("color");
  });
});
