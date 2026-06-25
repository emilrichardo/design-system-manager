import { describe, expect, it } from "vitest";
import { documentValidators } from "../../src/infrastructure/validation/schema-validators.js";
import {
  configAbsolutePath,
  configEscapePath,
  configMissingPath,
  configUnknownField,
  manifestEmptyName,
  manifestInvalidSlug,
  manifestInvalidVersion,
  validConfig,
  validManifest,
} from "../fixtures/documents.js";

const cfgCodes = (d: unknown) => documentValidators.validateConfig(d).map((i) => i.code);
const manCodes = (d: unknown) => documentValidators.validateManifest(d).map((i) => i.code);

describe("config validation (T029)", () => {
  it("acepta una configuración válida", () => {
    expect(documentValidators.validateConfig(validConfig)).toEqual([]);
  });
  it("rechaza ruta ausente", () => {
    expect(cfgCodes(configMissingPath).some((c) => c.startsWith("schema:config") || c === "config-shape")).toBe(true);
  });
  it("rechaza ruta absoluta", () => {
    expect(cfgCodes(configAbsolutePath)).toContain("config-path-unsafe");
  });
  it("rechaza ruta con escape", () => {
    expect(cfgCodes(configEscapePath)).toContain("config-path-unsafe");
  });
  it("rechaza campos desconocidos", () => {
    expect(cfgCodes(configUnknownField)).toContain("schema:config");
  });
});

describe("manifest validation (T029)", () => {
  it("acepta un manifiesto válido", () => {
    expect(documentValidators.validateManifest(validManifest)).toEqual([]);
  });
  it("rechaza nombre vacío", () => {
    // name vacío incumple minLength del schema y/o la regla de dominio.
    expect(manCodes(manifestEmptyName).length).toBeGreaterThan(0);
  });
  it("rechaza slug inválido", () => {
    expect(manCodes(manifestInvalidSlug)).toContain("manifest-slug-invalid");
  });
  it("rechaza versión inválida", () => {
    expect(manCodes(manifestInvalidVersion)).toContain("manifest-version-invalid");
  });
  it("acepta descripción opcional ausente", () => {
    const { description, ...noDesc } = validManifest as Record<string, unknown>;
    void description;
    expect(documentValidators.validateManifest(noDesc)).toEqual([]);
  });
});
