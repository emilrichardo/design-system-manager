import { describe, expect, it } from "vitest";
import { createName } from "../../src/domain/identity/name.js";

describe("createName (T008)", () => {
  it("acepta un nombre válido y preserva el texto legible", () => {
    const r = createName("Acme Design System");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.value).toBe("Acme Design System");
  });

  it("recorta espacios externos pero preserva los internos", () => {
    const r = createName("  Municipal   UI  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.value).toBe("Municipal   UI");
  });

  it("rechaza nombre vacío", () => {
    const r = createName("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("name-empty");
  });

  it("rechaza nombre compuesto solo por espacios", () => {
    const r = createName("    ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("name-empty");
  });
});
