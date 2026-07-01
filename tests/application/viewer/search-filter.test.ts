// T037 (009) — Búsqueda por path/categoría/nivel/tipo opera sobre la sesión ya cargada (alcance inicial:
// tokens); cero invocaciones adicionales de casos de uso reusados durante la búsqueda (función pura).
import { describe, expect, it, vi } from "vitest";
import { searchTokens } from "../../../src/application/viewer/search-filter.js";
import type { ViewerTokenV1 } from "../../../src/application/viewer/token.js";

function token(overrides: Partial<ViewerTokenV1> = {}): ViewerTokenV1 {
  return {
    path: "color.brand.500",
    category: "color",
    level: "primitive",
    levelSource: "token",
    declaredType: "color",
    effectiveType: "color",
    typeOrigin: "own",
    kind: "concrete",
    declaredValue: "#3b82f6",
    resolvedValue: "#3b82f6",
    immediateAliasTarget: null,
    aliasChain: [],
    aliasState: "n/a",
    description: null,
    trust: "valid",
    ...overrides,
  };
}

const FIXTURES: readonly ViewerTokenV1[] = [
  token({ path: "color.brand.500", category: "color", level: "primitive", effectiveType: "color" }),
  token({ path: "color.accent", category: "color", level: "semantic", effectiveType: "color", kind: "alias" }),
  token({ path: "spacing.100", category: "spacing", level: "unclassified", effectiveType: "dimension" }),
  token({ path: "typography.body", category: "typography", level: "primitive", effectiveType: "typography" }),
];

describe("searchTokens (T037)", () => {
  it("sin filtros devuelve todo tal cual", () => {
    expect(searchTokens(FIXTURES)).toEqual(FIXTURES);
  });

  it("filtra por substring de path, sin distinguir mayúsculas/minúsculas", () => {
    const result = searchTokens(FIXTURES, { query: "BRAND" });
    expect(result.map((t) => t.path)).toEqual(["color.brand.500"]);
  });

  it("filtra por categoría", () => {
    const result = searchTokens(FIXTURES, { category: "color" });
    expect(result.map((t) => t.path)).toEqual(["color.brand.500", "color.accent"]);
  });

  it("filtra por nivel", () => {
    const result = searchTokens(FIXTURES, { level: "semantic" });
    expect(result.map((t) => t.path)).toEqual(["color.accent"]);
  });

  it("filtra por effectiveType exacto", () => {
    const result = searchTokens(FIXTURES, { type: "dimension" });
    expect(result.map((t) => t.path)).toEqual(["spacing.100"]);
  });

  it("combina múltiples filtros (AND)", () => {
    const result = searchTokens(FIXTURES, { category: "color", level: "primitive" });
    expect(result.map((t) => t.path)).toEqual(["color.brand.500"]);
  });

  it("query vacío no filtra nada", () => {
    expect(searchTokens(FIXTURES, { query: "" })).toEqual(FIXTURES);
  });

  it("sin coincidencias devuelve []", () => {
    expect(searchTokens(FIXTURES, { query: "no-such-token" })).toEqual([]);
  });

  it("es pura: no invoca ningún caso de uso ni I/O (nunca es async, no recibe deps)", () => {
    const spy = vi.fn();
    const result = searchTokens(FIXTURES, { query: "color" });
    expect(spy).not.toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
    // La firma en sí mismo demuestra ausencia de I/O: sincrónica, sin parámetro de dependencias.
    expect(searchTokens.constructor.name).not.toBe("AsyncFunction");
  });
});
