// T032 (004) - Version exacta del contrato JSON foundations.
import { describe, expect, it } from "vitest";
import { FOUNDATIONS_JSON_FORMAT_VERSION } from "../../../../src/application/foundations/json/format-version.js";

describe("FOUNDATIONS_JSON_FORMAT_VERSION (T032)", () => {
  it("es el literal independiente 1.0.0", () => {
    expect(FOUNDATIONS_JSON_FORMAT_VERSION).toBe("1.0.0");
  });
});
