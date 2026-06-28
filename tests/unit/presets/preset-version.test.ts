import { describe, expect, it } from "vitest";
import { validatePresetVersion } from "../../../src/domain/presets/preset-version.js";

describe("PresetVersion", () => {
  it.each(["0.1.0", "1.0.0", "1.2.3", "1.0.0-beta.1", "1.0.0+build.1"])("accepts strict SemVer %s", (version) => {
    const result = validatePresetVersion(version);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(version);
  });

  it.each(["", " ", "1", "1.0", "1.0.0 ", " 1.0.0", "v1.0.0", "latest", "2026.06"])(
    "rejects invalid version %j without normalization",
    (version) => {
      const result = validatePresetVersion(version);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("preset-version-invalid");
        expect(result.error.input).toBe(version);
      }
    },
  );
});
