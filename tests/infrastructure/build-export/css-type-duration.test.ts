import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

function render(value: unknown) {
  return renderCssArtifact(setOf([tokenOf({ path: "motion.duration", effectiveType: "duration", value })]));
}

describe("CSS type matrix — duration (T044)", () => {
  it.each([
    [{ value: 120, unit: "ms" }, ":root {\n  --motion-duration: 120ms;\n}\n"],
    [{ value: 0.2, unit: "s" }, ":root {\n  --motion-duration: 0.2s;\n}\n"],
  ])("acepta runtime shape valida %#", (value, expected) => {
    const result = render(value);
    expect(result.outcome).toBe("rendered");
    if (result.outcome === "rendered") {
      expect(new TextDecoder().decode(result.artifact.bytes)).toBe(expected);
    }
  });

  it("rechaza unidad invalida, whitespace y valor no finito", () => {
    for (const value of [{ value: 120, unit: "m s" }, { value: 120, unit: "sec" }, { value: Infinity, unit: "s" }]) {
      const result = render(value);
      expect(result.outcome).toBe("unsupported-value");
      if (result.outcome === "unsupported-value") {
        expect(result.errors[0]!.code).toBe("css-duration-unsupported-shape");
      }
    }
  });
});
