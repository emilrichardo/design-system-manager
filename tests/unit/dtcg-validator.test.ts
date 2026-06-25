import { describe, expect, it } from "vitest";
import { validateDtcgDocument } from "../../src/infrastructure/validation/dtcg-validator.js";
import {
  tokensBadAlpha,
  tokensBadComponentRange,
  tokensBadHex,
  tokensBrokenAlias,
  tokensConcreteHexString,
  tokensDirectCycle,
  tokensMalformedAlias,
  tokensUnsupportedType,
  tokensValidColorObject,
  tokensWrongComponentCount,
  validTokens,
} from "../fixtures/documents.js";

const codes = (doc: unknown) => validateDtcgDocument(doc).map((i) => i.code);

describe("validateDtcgDocument (T028, DTCG 2025.10)", () => {
  it("acepta el documento mínimo válido (grupo, $type, $value objeto, $description, alias)", () => {
    expect(validateDtcgDocument(validTokens)).toEqual([]);
  });

  it("acepta un objeto de color sRGB válido", () => {
    expect(validateDtcgDocument(tokensValidColorObject)).toEqual([]);
  });

  it("rechaza un string hexadecimal como valor de color concreto", () => {
    expect(codes(tokensConcreteHexString)).toContain("dtcg-color-value-invalid");
  });

  it("rechaza componentes fuera de rango", () => {
    expect(codes(tokensBadComponentRange)).toContain("schema:tokens");
  });

  it("rechaza una cantidad incorrecta de componentes", () => {
    expect(codes(tokensWrongComponentCount)).toContain("schema:tokens");
  });

  it("rechaza alpha fuera de rango", () => {
    expect(codes(tokensBadAlpha)).toContain("schema:tokens");
  });

  it("rechaza hex inválido", () => {
    expect(codes(tokensBadHex)).toContain("schema:tokens");
  });

  it("rechaza un $type no soportado (estructura)", () => {
    expect(codes(tokensUnsupportedType)).toContain("schema:tokens");
  });

  it("detecta referencia inexistente", () => {
    expect(codes(tokensBrokenAlias)).toContain("dtcg-ref-missing");
  });

  it("detecta alias malformado", () => {
    expect(codes(tokensMalformedAlias)).toContain("dtcg-alias-malformed");
  });

  it("detecta ciclo directo de aliases", () => {
    expect(codes(tokensDirectCycle)).toContain("dtcg-cycle");
  });

  it("detecta referencia a un grupo (no token)", () => {
    const doc = {
      color: {
        $type: "color",
        base: { x: { $value: "#fff", $description: "x" } },
        ref: { $value: "{color.base}", $description: "apunta a grupo" },
      },
    };
    expect(codes(doc)).toContain("dtcg-ref-not-token");
  });
});
