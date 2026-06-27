// T004 (003) — Invariantes runtime que TS no garantiza: 4 campos base presentes y CERO `undefined`
// en cualquier nivel, para muestras válidas de los tres envelopes (validate/inspect/internal-error).
import { describe, expect, it } from "vitest";
import type {
  JsonInspectEnvelopeV1,
  JsonInternalErrorEnvelopeV1,
  JsonValidateEnvelopeV1,
} from "../../../src/application/json/dto.js";
import { JSON_FORMAT_VERSION } from "../../../src/application/json/format-version.js";

/** Recolecta rutas con valor `undefined` en cualquier nivel (arrays/objetos). */
function undefinedPaths(value: unknown, path = "$"): string[] {
  if (value === undefined) return [path];
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((v, i) => undefinedPaths(v, `${path}[${i}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    undefinedPaths(v, `${path}.${k}`),
  );
}

const validateValid: JsonValidateEnvelopeV1 = {
  formatVersion: JSON_FORMAT_VERSION,
  command: "validate",
  outcome: "valid",
  result: {
    host: { root: "/repo", designSystemPath: "/repo/design-system" },
    structuralState: "complete-valid",
    valid: true,
    checkedDocuments: ["neuraz-ds.config.json"],
    uncheckedDocuments: [],
    summary: { errors: 0, warnings: 0, tokens: 2 },
    errors: [],
    warnings: [],
    limits: { reached: false, partial: false, hits: [] },
  },
};

const validateNotFound: JsonValidateEnvelopeV1 = {
  formatVersion: JSON_FORMAT_VERSION,
  command: "validate",
  outcome: "not-found",
  result: null,
  error: null,
};

const inspectValid: JsonInspectEnvelopeV1 = {
  formatVersion: JSON_FORMAT_VERSION,
  command: "inspect",
  outcome: "valid",
  result: {
    host: { root: "/repo", designSystemPath: "/repo/design-system" },
    structuralState: "complete-valid",
    identity: {
      name: { value: "Acme", trust: "valid" },
      slug: { value: "acme", trust: "valid" },
      version: { value: "0.1.0", trust: "valid" },
      description: { value: null, trust: "unavailable" },
    },
    schemaVersions: null,
    files: { expected: ["neuraz-ds.config.json"], present: [], missing: [] },
    tokens: null,
    validation: {
      valid: true,
      structuralState: "complete-valid",
      checkedDocuments: [],
      uncheckedDocuments: [],
      summary: { errors: 0, warnings: 0, tokens: null },
      errors: [],
      warnings: [],
      limits: { reached: false, partial: false, hits: [] },
    },
    limits: { reached: false, partial: false, hits: [] },
  },
};

const internalError: JsonInternalErrorEnvelopeV1 = {
  formatVersion: JSON_FORMAT_VERSION,
  command: "inspect",
  outcome: "internal-error",
  result: null,
  error: { code: "internal-cli-error", message: "Ocurrió un error interno." },
};

describe("DTO invariants (T004)", () => {
  const samples = { validateValid, validateNotFound, inspectValid, internalError };

  for (const [name, env] of Object.entries(samples)) {
    it(`${name}: tiene los cuatro campos base`, () => {
      expect(env.formatVersion).toBe("1.0.0");
      expect(typeof env.command).toBe("string");
      expect(typeof env.outcome).toBe("string");
      expect("result" in env).toBe(true); // presente incluso cuando es null
    });

    it(`${name}: no contiene ningún undefined`, () => {
      expect(undefinedPaths(env)).toEqual([]);
    });

    it(`${name}: serializa y reparsea sin pérdida`, () => {
      expect(JSON.parse(JSON.stringify(env))).toEqual(env);
    });
  }

  it("not-found e internal-error llevan result null y campo error presente", () => {
    expect(validateNotFound.result).toBeNull();
    expect("error" in validateNotFound).toBe(true);
    expect(internalError.result).toBeNull();
    expect(internalError.error.code).toBe("internal-cli-error");
  });
});
