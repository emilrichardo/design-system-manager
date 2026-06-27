// T014 (003) — serializeJsonV1: formato canónico (2 espacios + 1 newline), determinismo, pureza.
import { describe, expect, it } from "vitest";
import { serializeJsonV1 } from "../../../src/infrastructure/reporter/json-serializer.js";
import type { JsonEnvelopeV1 } from "../../../src/application/json/dto.js";
import { deepFreeze } from "./json-test-utils.js";

const validateEnv: JsonEnvelopeV1 = {
  formatVersion: "1.0.0",
  command: "validate",
  outcome: "complete-invalid",
  result: {
    host: { root: "/some path/with spaces", designSystemPath: "/some path/with spaces/design-system" },
    structuralState: "complete-invalid",
    valid: false,
    checkedDocuments: ["neuraz-ds.config.json"],
    uncheckedDocuments: [],
    summary: { errors: 1, warnings: 0, tokens: null },
    errors: [{ severity: "error", code: "dtcg-type-unrecognized", message: "Tipo ✦ no reconocido 简体", document: "tokens", path: "color.brand.primary" }],
    warnings: [],
    limits: { reached: false, partial: false, hits: [] },
  },
};

const notFoundEnv: JsonEnvelopeV1 = {
  formatVersion: "1.0.0",
  command: "validate",
  outcome: "not-found",
  result: null,
  error: null,
};

const internalEnv: JsonEnvelopeV1 = {
  formatVersion: "1.0.0",
  command: "inspect",
  outcome: "internal-error",
  result: null,
  error: { code: "internal-cli-error", message: "Ocurrió un error interno." },
};

describe("serializeJsonV1 (T014)", () => {
  it("produce JSON parseable para validate/not-found/internal-error", () => {
    for (const env of [validateEnv, notFoundEnv, internalEnv]) {
      const text = serializeJsonV1(env);
      expect(JSON.parse(text)).toEqual(env);
    }
  });

  it("indentación de dos espacios", () => {
    const text = serializeJsonV1(validateEnv);
    expect(text).toContain('\n  "command": "validate"');
    expect(text.startsWith("{\n")).toBe(true);
  });

  it("exactamente un newline final y sin newline inicial", () => {
    const text = serializeJsonV1(notFoundEnv);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.endsWith("}\n\n")).toBe(false);
    expect(text.startsWith("\n")).toBe(false);
    expect(text.match(/\n+$/)?.[0]).toBe("\n");
  });

  it("sin BOM ni secuencias ANSI", () => {
    const text = serializeJsonV1(validateEnv);
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
    // Ninguna secuencia ANSI: no aparece el carácter ESC (code 27).
    expect([...text].some((ch) => ch.charCodeAt(0) === 27)).toBe(false);
  });

  it("conserva Unicode y paths con espacios", () => {
    const parsed = JSON.parse(serializeJsonV1(validateEnv));
    expect(parsed.result.errors[0].message).toBe("Tipo ✦ no reconocido 简体");
    expect(parsed.result.host.root).toBe("/some path/with spaces");
  });

  it("bytes deterministas: misma estructura → mismos bytes", () => {
    expect(serializeJsonV1(validateEnv)).toBe(serializeJsonV1(validateEnv));
    const clone: JsonEnvelopeV1 = JSON.parse(JSON.stringify(validateEnv));
    expect(serializeJsonV1(clone)).toBe(serializeJsonV1(validateEnv));
  });

  it("no muta el envelope congelado", () => {
    deepFreeze(internalEnv);
    expect(() => serializeJsonV1(internalEnv)).not.toThrow();
  });

  it("propaga la excepción de JSON.stringify ante un contrato violado (referencia circular)", () => {
    const circular: Record<string, unknown> = { formatVersion: "1.0.0", command: "validate", outcome: "valid" };
    circular.result = circular;
    expect(() => serializeJsonV1(circular as unknown as JsonEnvelopeV1)).toThrow();
  });
});
