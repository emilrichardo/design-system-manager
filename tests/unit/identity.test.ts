import { describe, expect, it } from "vitest";
import { createIdentity } from "../../src/domain/identity/design-system-identity.js";

describe("createIdentity (T012)", () => {
  it("construye una identidad válida con slug derivado y versión por defecto", () => {
    const r = createIdentity({ name: "Acme Design System" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name.value).toBe("Acme Design System");
      expect(r.value.slug.value).toBe("acme-design-system");
      expect(r.value.version.value).toBe("0.1.0");
      expect(r.value.description).toBeUndefined();
    }
  });

  it("acepta slug manual válido y descripción opcional", () => {
    const r = createIdentity({
      name: "Acme",
      slug: "acme-ui",
      description: "DS de Acme",
      version: "1.2.3",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.slug.value).toBe("acme-ui");
      expect(r.value.description).toBe("DS de Acme");
      expect(r.value.version.value).toBe("1.2.3");
    }
  });

  it("rechaza nombre vacío", () => {
    const r = createIdentity({ name: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("name-empty");
  });

  it("rechaza slug manual inválido (sin corregir en silencio)", () => {
    const r = createIdentity({ name: "Acme", slug: "Acme UI" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("slug-invalid");
  });

  it("rechaza versión inválida", () => {
    const r = createIdentity({ name: "Acme", version: "v1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("version-invalid");
  });
});
