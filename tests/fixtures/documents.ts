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
