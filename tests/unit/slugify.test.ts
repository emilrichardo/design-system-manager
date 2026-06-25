import { describe, expect, it } from "vitest";
import { deriveSlug } from "../../src/domain/identity/slugify.js";

function slugOf(name: string): string {
  const r = deriveSlug(name);
  if (!r.ok) throw new Error(`esperaba slug válido para "${name}": ${r.error.code}`);
  return r.value.value;
}

describe("deriveSlug (T010, ADR-0003)", () => {
  it("convierte espacios y mayúsculas", () => {
    expect(slugOf("MPF Design System")).toBe("mpf-design-system");
  });

  it("translitera diacríticos de forma predecible (ñ → n)", () => {
    // "Diseño" → NFD descompone ñ en n + tilde combinante, que se elimina → "diseno".
    expect(slugOf("Diseño Institucional")).toBe("diseno-institucional");
  });

  it("colapsa separadores múltiples y recorta extremos", () => {
    expect(slugOf("  Municipal   UI  2026 ")).toBe("municipal-ui-2026");
  });

  it("elimina guiones bajos, símbolos y guiones repetidos", () => {
    expect(slugOf("mpf__design")).toBe("mpf-design");
    expect(slugOf("Acme@@Brand!!")).toBe("acme-brand");
    expect(slugOf("a---b")).toBe("a-b");
  });

  it("preserva números", () => {
    expect(slugOf("UI 2026 v2")).toBe("ui-2026-v2");
  });

  it("rechaza cuando el nombre produce un slug vacío", () => {
    const r = deriveSlug("###");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("slug-empty-derivation");
  });
});
