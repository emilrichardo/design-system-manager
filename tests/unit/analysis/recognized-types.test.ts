// T009 — Tipos DTCG reconocidos (research §1, ADR-0008).
import { describe, expect, it } from "vitest";
import {
  DEEPLY_SUPPORTED_DTCG_TYPES,
  RECOGNIZED_DTCG_TYPES,
  UNTYPED_CATEGORY,
  isDeeplySupportedType,
  isRecognizedButShallow,
  isRecognizedType,
} from "../../../src/domain/dtcg/recognized-types.js";

describe("RECOGNIZED_DTCG_TYPES", () => {
  it("contiene exactamente los 13 tipos estándar de DTCG 2025.10", () => {
    expect([...RECOGNIZED_DTCG_TYPES].sort()).toEqual(
      [
        "border",
        "color",
        "cubicBezier",
        "dimension",
        "duration",
        "fontFamily",
        "fontWeight",
        "gradient",
        "number",
        "shadow",
        "strokeStyle",
        "transition",
        "typography",
      ].sort(),
    );
  });

  it("no tiene duplicados", () => {
    expect(new Set(RECOGNIZED_DTCG_TYPES).size).toBe(RECOGNIZED_DTCG_TYPES.length);
    expect(RECOGNIZED_DTCG_TYPES.length).toBe(13);
  });

  it("reconoce tipos estándar y rechaza desconocidos", () => {
    expect(isRecognizedType("color")).toBe(true);
    expect(isRecognizedType("typography")).toBe(true);
    expect(isRecognizedType("elevation")).toBe(false);
    expect(isRecognizedType("")).toBe(false);
  });

  it("solo color tiene soporte profundo hoy", () => {
    expect(DEEPLY_SUPPORTED_DTCG_TYPES).toEqual(["color"]);
    expect(isDeeplySupportedType("color")).toBe(true);
    expect(isDeeplySupportedType("dimension")).toBe(false);
  });

  it("isRecognizedButShallow: reconocido pero no profundo (warning)", () => {
    expect(isRecognizedButShallow("dimension")).toBe(true); // reconocido, no profundo
    expect(isRecognizedButShallow("color")).toBe(false); // profundo
    expect(isRecognizedButShallow("elevation")).toBe(false); // no reconocido
  });

  it("la categoría de no tipado es estable", () => {
    expect(UNTYPED_CATEGORY).toBe("(untyped)");
  });
});
