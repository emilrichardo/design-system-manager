// Fixtures mínimos para validación/clasificación (T022–T030b). Sin bloques JSON grandes.
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { buildManifest } from "../../src/domain/builders/build-manifest.js";
import { buildTokens } from "../../src/domain/builders/build-tokens.js";
import { createIdentity } from "../../src/domain/identity/design-system-identity.js";

export const validIdentity = (() => {
  const r = createIdentity({ name: "Acme", description: "DS de Acme" });
  if (!r.ok) throw new Error("fixture identidad inválida");
  return r.value;
})();

export const validConfig = buildConfig();
export const validManifest = buildManifest(validIdentity);
export const validTokens = buildTokens();

// Variantes inválidas (objetos planos explícitos, mínimos).
export const configMissingPath = { configSchemaVersion: "0.1.0", formatVersion: "2025.10" };
export const configAbsolutePath = { configSchemaVersion: "0.1.0", designSystemDir: "/etc", formatVersion: "2025.10" };
export const configEscapePath = { configSchemaVersion: "0.1.0", designSystemDir: "../escape", formatVersion: "2025.10" };
export const configUnknownField = { configSchemaVersion: "0.1.0", designSystemDir: "design-system", surprise: true };

export const manifestEmptyName = { ...validManifest, name: "" };
export const manifestInvalidSlug = { ...validManifest, slug: "Acme UI" };
export const manifestInvalidVersion = { ...validManifest, version: "v1" };

export const tokensBrokenAlias = {
  color: { $type: "color", brand: { primary: { $value: "{color.base.missing}", $description: "x" } } },
};
export const tokensMalformedAlias = {
  color: { $type: "color", a: { $value: "{not closed", $description: "x" } },
};
export const tokensDirectCycle = {
  color: {
    $type: "color",
    a: { $value: "{color.b}", $description: "x" },
    b: { $value: "{color.a}", $description: "y" },
  },
};
export const tokensUnsupportedType = {
  weird: { $type: "rocket", a: { $value: "x", $description: "y" } },
};

// Color concreto: objeto sRGB válido (DTCG 2025.10) y variantes inválidas.
const srgb = (components: number[], extra: Record<string, unknown> = {}) => ({
  color: { $type: "color", base: { x: { $value: { colorSpace: "srgb", components, ...extra }, $description: "x" } } },
});
export const tokensValidColorObject = srgb([0.23, 0.5, 0.96], { alpha: 1, hex: "#3b82f6" });
export const tokensConcreteHexString = {
  color: { $type: "color", base: { x: { $value: "#3b82f6", $description: "hex directo no conforme" } } },
};
export const tokensBadComponentRange = srgb([1.5, 0.5, 0.96]);
export const tokensWrongComponentCount = srgb([0.23, 0.5]);
export const tokensBadAlpha = srgb([0.23, 0.5, 0.96], { alpha: 2 });
export const tokensBadHex = srgb([0.23, 0.5, 0.96], { hex: "blue" });
