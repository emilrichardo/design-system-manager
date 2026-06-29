// T027 (006) — Validación de nombres CSS: case preservado, sin lowercase ni Unicode normalization ni
// identifier escaping; rechazo tipado para segmentos vacíos/Unicode/espacios/slash/backslash/signos.
import { describe, expect, it } from "vitest";
import { validateCssCustomPropertyName } from "../../../src/domain/build-export/css-name.js";

function expectValid(path: string, expectedName: string): void {
  const r = validateCssCustomPropertyName(path);
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.name).toBe(expectedName);
}

function expectInvalid(path: string): void {
  const r = validateCssCustomPropertyName(path);
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.code).toBe("css-name-invalid");
    expect(r.tokenPath).toBe(path);
  }
}

describe("validateCssCustomPropertyName (T026)", () => {
  it("acepta letras, números, underscore y hyphen", () => {
    expectValid("color.gray.100", "--color-gray-100");
    expectValid("a.b.c", "--a-b-c");
    expectValid("foo_bar.baz_qux", "--foo_bar-baz_qux");
    expectValid("a-b.c-d", "--a-b-c-d");
  });

  it("acepta segmentos que empiezan con dígito o underscore", () => {
    expectValid("color.100", "--color-100");
    expectValid("_a._b", "--_a-_b");
  });

  it("preserva case (no aplica lowercase ni Unicode normalization)", () => {
    expectValid("Color.Gray.A100", "--Color-Gray-A100");
    expectValid("CamelCase.PascalCase", "--CamelCase-PascalCase");
  });

  it("rechaza segmento vacío y path vacío", () => {
    expectInvalid("");
    expectInvalid(".");
    expectInvalid("a.");
    expectInvalid(".a");
    expectInvalid("a..b");
  });

  it("rechaza Unicode no-ASCII (sin normalización)", () => {
    expectInvalid("color.café"); // é
    expectInvalid("ñ.x");
    expectInvalid("color.日本");
  });

  it("rechaza espacios, slash, backslash y signos no admitidos", () => {
    expectInvalid("color.gray 100");
    expectInvalid("color/gray.100");
    expectInvalid("color\\gray.100");
    expectInvalid("color.gray+100");
    expectInvalid("color.gray*100");
    expectInvalid("color.gray@100");
    expectInvalid("color.gray.");
  });

  it("rechaza segmento que empieza con `-` (no es válido como inicio)", () => {
    expectInvalid("-color.gray");
    expectInvalid("a.-b");
  });

  it("no transforma automáticamente nombres inválidos en válidos", () => {
    const r = validateCssCustomPropertyName("color.gray 100");
    expect(r.ok).toBe(false);
    // No produce un nombre "saneado" alterando el path.
    if (!r.ok) expect(r.tokenPath).toBe("color.gray 100");
  });
});
