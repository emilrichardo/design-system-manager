import { describe, expect, it } from "vitest";
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { buildManifest } from "../../src/domain/builders/build-manifest.js";
import { buildTokens } from "../../src/domain/builders/build-tokens.js";
import { createIdentity } from "../../src/domain/identity/design-system-identity.js";

function identity(desc?: string) {
  const r = createIdentity(desc === undefined ? { name: "Acme" } : { name: "Acme", description: desc });
  if (!r.ok) throw new Error("identidad inválida");
  return r.value;
}

describe("builders (T025–T027)", () => {
  it("buildConfig es determinista y mínimo", () => {
    expect(buildConfig()).toEqual({
      configSchemaVersion: "0.1.0",
      designSystemDir: "design-system",
      formatVersion: "2025.10",
    });
    expect(buildConfig()).toEqual(buildConfig());
  });

  it("buildManifest mapea la identidad, sin valores visuales", () => {
    const m = buildManifest(identity("desc"));
    expect(m).toEqual({
      manifestSchemaVersion: "0.1.0",
      name: "Acme",
      slug: "acme",
      description: "desc",
      version: "0.1.0",
      tokensDir: "tokens",
    });
    expect(m).not.toHaveProperty("color");
  });

  it("buildManifest omite description cuando no se provee", () => {
    expect(buildManifest(identity())).not.toHaveProperty("description");
  });

  it("buildTokens produce un objeto de color DTCG 2025.10 y un alias", () => {
    const t = buildTokens() as any;
    expect(t.color.$type).toBe("color");
    const base = t.color.base["blue-500"].$value;
    expect(base.colorSpace).toBe("srgb");
    expect(base.components).toEqual([0.231372549, 0.509803922, 0.964705882]);
    expect(base.alpha).toBe(1);
    expect(base.hex).toBe("#3b82f6");
    expect(t.color.brand.primary.$value).toBe("{color.base.blue-500}");
    expect(buildTokens()).toEqual(buildTokens()); // determinista
  });

  it("los builders no mutan ni dependen de entrada externa variable", () => {
    const id = identity();
    const before = JSON.stringify(id);
    buildManifest(id);
    expect(JSON.stringify(id)).toBe(before);
  });
});
