// T026-T028 (§24/§26) — Integración de módulo: JSON parseado → traversal/read-validator → índice →
// aliases → estadísticas. Incluye la regresión: el documento de tokens de `init` es VÁLIDO para el
// validador de lectura amplio (sin tocar el schema estricto de generación).
import { describe, expect, it } from "vitest";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";
import { serializeJson } from "../../../src/infrastructure/serialization/json.js";
import { traverseDtcgTree } from "../../../src/infrastructure/analysis/traverse-dtcg-tree.js";
import { createDtcgReadValidator } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";

const color = { colorSpace: "srgb", components: [0.2, 0.5, 0.9], alpha: 1, hex: "#3b82f6" };
const ctok = { $type: "color", $value: color, $description: "d" };

describe("Regresión 001 — documento de init en el read-validator", () => {
  it("buildTokens() → parse → traverseDtcgTree → válido (sin errores)", () => {
    const parsed = JSON.parse(serializeJson(buildTokens())) as unknown;
    const r = traverseDtcgTree(parsed);
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
    // Tiene al menos un color concreto y un alias válido (estructura de init).
    expect(r.statistics.byType.color).toBeGreaterThanOrEqual(1);
    expect(r.statistics.aliases).toBeGreaterThanOrEqual(1);
  });

  it("createDtcgReadValidator no produce errores sobre el documento de init", () => {
    const parsed = JSON.parse(serializeJson(buildTokens())) as unknown;
    const issues = createDtcgReadValidator().validate(parsed);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

describe("Integración del módulo de análisis DTCG", () => {
  it("tipos heredados + alias encadenado + estadísticas coherentes", () => {
    const r = traverseDtcgTree({
      color: { $type: "color", base: { $value: color, $description: "d" }, brand: { $value: "{color.base}", $description: "d" }, accent: { $value: "{color.brand}", $description: "d" } },
      size: { $type: "dimension", sm: { $value: { value: 8, unit: "px" }, $description: "d" } },
    });
    expect(r.valid).toBe(true);
    expect(r.statistics.total).toBe(4);
    expect(r.statistics.aliases).toBe(2);
    expect(r.statistics.byType).toEqual({ color: 3, dimension: 1 });
  });

  it("documento con múltiples errores acumula todos", () => {
    const r = traverseDtcgTree({
      g: {
        unknown: { $type: "weird", $value: "v", $description: "d" },
        broken: { $value: "{g.nope}", $description: "d" },
        badcolor: { $type: "color", $value: "#fff", $description: "d" },
      },
    });
    const codes = r.errors.map((i) => i.code);
    expect(codes).toContain("dtcg-type-unrecognized");
    expect(codes).toContain("alias-missing");
    expect(codes).toContain("dtcg-color-value-invalid");
    expect(r.valid).toBe(false);
  });

  it("árbol profundo (dentro de límites) se analiza completo", () => {
    let node: Record<string, unknown> = ctok;
    for (let i = 0; i < 10; i += 1) node = { [`l${i}`]: node };
    const r = traverseDtcgTree(node);
    expect(r.valid).toBe(true);
    expect(r.statistics.maxDepth).toBe(10);
  });
});
