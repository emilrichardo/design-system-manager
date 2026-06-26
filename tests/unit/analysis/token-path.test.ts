// T008 — Ruta canónica y profundidad (ADR-0010).
import { describe, expect, it } from "vitest";
import {
  depthOf,
  depthOfPath,
  pathSegments,
  tokenPath,
} from "../../../src/domain/traversal/token-path.js";

describe("tokenPath / pathSegments", () => {
  it("une y separa segmentos de forma simétrica", () => {
    expect(tokenPath(["color", "base", "blue-500"])).toBe("color.base.blue-500");
    expect(pathSegments("color.base.blue-500")).toEqual(["color", "base", "blue-500"]);
  });

  it("raíz: [] ↔ ''", () => {
    expect(tokenPath([])).toBe("");
    expect(pathSegments("")).toEqual([]);
  });

  it("preserva el orden de inserción (no reordena)", () => {
    expect(tokenPath(["z", "a", "m"])).toBe("z.a.m");
  });
});

describe("profundidad (raíz = 0)", () => {
  it("depthOf cuenta segmentos", () => {
    expect(depthOf([])).toBe(0);
    expect(depthOf(["color"])).toBe(1);
    expect(depthOf(["color", "base", "blue"])).toBe(3);
  });

  it("depthOfPath equivale sobre rutas canónicas", () => {
    expect(depthOfPath("")).toBe(0);
    expect(depthOfPath("color.base.blue")).toBe(3);
  });
});
