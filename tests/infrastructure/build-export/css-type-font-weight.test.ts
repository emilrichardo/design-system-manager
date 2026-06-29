import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

function render(value: unknown) {
  return renderCssArtifact(setOf([tokenOf({ path: "typography.weight", effectiveType: "fontWeight", value })]));
}

describe("CSS type matrix — fontWeight (T043)", () => {
  it.each([
    [700, "700"],
    ["normal", "normal"],
    ["bold", "bold"],
  ])("acepta %p", (value, expected) => {
    const result = render(value);
    expect(result.outcome).toBe("rendered");
    if (result.outcome === "rendered") {
      expect(new TextDecoder().decode(result.artifact.bytes)).toBe(
        `:root {\n  --typography-weight: ${expected};\n}\n`,
      );
    }
  });

  it("rechaza fuera de rango, no enteros y keywords no admitidos", () => {
    for (const value of [0, 1001, 550.5, "bolder"]) {
      const result = render(value);
      expect(result.outcome).toBe("unsupported-value");
      if (result.outcome === "unsupported-value") {
        expect(result.errors[0]!.code).toBe("css-font-weight-unsupported-shape");
      }
    }
  });
});
