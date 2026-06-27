// T001 (003) — JSON_FORMAT_VERSION: valor canónico estable, independiente del paquete.
import { describe, expect, it } from "vitest";
import { JSON_FORMAT_VERSION } from "../../../src/application/json/format-version.js";

describe("JSON_FORMAT_VERSION (T001)", () => {
  it("es exactamente '1.0.0'", () => {
    expect(JSON_FORMAT_VERSION).toBe("1.0.0");
  });

  it("es un literal de tres componentes semver", () => {
    expect(JSON_FORMAT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
