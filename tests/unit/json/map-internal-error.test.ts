// T013 (003) — toJsonInternalErrorEnvelope: forma fija segura, sin exponer detalles internos.
import { describe, expect, it } from "vitest";
import {
  INTERNAL_CLI_ERROR_CODE,
  INTERNAL_CLI_ERROR_MESSAGE,
  toJsonInternalErrorEnvelope,
} from "../../../src/application/json/map-internal-error.js";
import { undefinedPaths } from "./json-test-utils.js";

describe("toJsonInternalErrorEnvelope (T013)", () => {
  it("validate: forma contractual exacta", () => {
    expect(toJsonInternalErrorEnvelope("validate")).toEqual({
      formatVersion: "1.0.0",
      command: "validate",
      outcome: "internal-error",
      result: null,
      error: { code: "internal-cli-error", message: "Ocurrió un error interno." },
    });
  });

  it("inspect: solo cambia command", () => {
    const env = toJsonInternalErrorEnvelope("inspect");
    expect(env.command).toBe("inspect");
    expect(env.outcome).toBe("internal-error");
    expect(env.result).toBeNull();
  });

  it("código y mensaje provienen de constantes únicas", () => {
    const env = toJsonInternalErrorEnvelope("validate");
    expect(env.error.code).toBe(INTERNAL_CLI_ERROR_CODE);
    expect(env.error.message).toBe(INTERNAL_CLI_ERROR_MESSAGE);
  });

  it("nunca expone stack/cause/path/name (forma fija de dos campos)", () => {
    const env = toJsonInternalErrorEnvelope("inspect");
    expect(Object.keys(env.error).sort()).toEqual(["code", "message"]);
    const serialized = JSON.stringify(env);
    expect(serialized).not.toMatch(/stack|cause|at \/|ENOENT|\/Users\//i);
  });

  it("orden canónico de claves y sin undefined; determinista", () => {
    const env = toJsonInternalErrorEnvelope("validate");
    expect(Object.keys(env)).toEqual(["formatVersion", "command", "outcome", "result", "error"]);
    expect(undefinedPaths(env)).toEqual([]);
    expect(toJsonInternalErrorEnvelope("validate")).toEqual(env);
  });
});
