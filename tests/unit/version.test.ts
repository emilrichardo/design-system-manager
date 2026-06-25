import { describe, expect, it } from "vitest";
import { DEFAULT_VERSION, validateVersion } from "../../src/domain/identity/version.js";

describe("validateVersion (T011, ADR-0003)", () => {
  it("usa 0.1.0 por defecto", () => {
    expect(DEFAULT_VERSION).toBe("0.1.0");
    const r = validateVersion();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.value).toBe("0.1.0");
  });

  it.each(["0.1.0", "1.0.0", "1.2.3", "1.0.0-beta.1"])("acepta SemVer válido %s", (v) => {
    const r = validateVersion(v);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.value).toBe(v);
  });

  it.each(["", " ", "1.0.0 ", "v1.2", "1", "1.2", "abc", "1.0.0.0"])(
    "rechaza versión inválida %j",
    (v) => {
      const r = validateVersion(v);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("version-invalid");
    },
  );
});
