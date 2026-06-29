import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

function render(value: unknown) {
  return renderCssArtifact(setOf([tokenOf({ path: "motion.curve", effectiveType: "cubicBezier", value })]));
}

describe("CSS type matrix — cubicBezier (T045)", () => {
  it("serializa bytes exactos para la shape valida", () => {
    const result = render([0.4, 0, 0.2, 1]);
    expect(result.outcome).toBe("rendered");
    if (result.outcome === "rendered") {
      expect(new TextDecoder().decode(result.artifact.bytes)).toBe(
        ":root {\n  --motion-curve: cubic-bezier(0.4, 0, 0.2, 1);\n}\n",
      );
    }
  });

  it("rechaza longitud incorrecta, no finitos y x1/x2 fuera de rango", () => {
    for (const value of [[0.4, 0, 0.2], [0.4, 0, 1.2, 1], [Infinity, 0, 0.2, 1]]) {
      const result = render(value);
      expect(result.outcome).toBe("unsupported-value");
      if (result.outcome === "unsupported-value") {
        expect(result.errors[0]!.code).toBe("css-cubic-bezier-unsupported-shape");
      }
    }
  });
});
