import { describe, expect, it } from "vitest";
import {
  validationResult,
  validResult,
} from "../../src/domain/validation/validation-result.js";

describe("ValidationResult (T016)", () => {
  it("sin errores es ok", () => {
    expect(validResult.ok).toBe(true);
    expect(validationResult().ok).toBe(true);
  });

  it("con errores no es ok", () => {
    const r = validationResult([{ code: "x", message: "fallo" }]);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
  });

  it("las advertencias no afectan a ok", () => {
    const r = validationResult([], [{ code: "w", message: "aviso" }]);
    expect(r.ok).toBe(true);
    expect(r.warnings).toHaveLength(1);
  });
});
