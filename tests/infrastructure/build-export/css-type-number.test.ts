import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

function render(value: unknown) {
  return renderCssArtifact(setOf([tokenOf({ path: "motion.scale", effectiveType: "number", value })]));
}

describe("CSS type matrix — number (T039)", () => {
  it("serializa decimal estable con punto", () => {
    const result = render(0.875);
    expect(result.outcome).toBe("rendered");
    if (result.outcome === "rendered") {
      expect(new TextDecoder().decode(result.artifact.bytes)).toBe(":root {\n  --motion-scale: 0.875;\n}\n");
    }
  });

  it("normaliza -0 a 0", () => {
    const result = render(-0);
    expect(result.outcome).toBe("rendered");
    if (result.outcome === "rendered") {
      expect(new TextDecoder().decode(result.artifact.bytes)).toContain("--motion-scale: 0;");
    }
  });

  it("rechaza NaN, Infinity y -Infinity", () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      const result = render(value);
      expect(result.outcome).toBe("unsupported-value");
      if (result.outcome === "unsupported-value") {
        expect(result.errors[0]).toMatchObject({
          format: "css",
          code: "css-number-invalid",
          tokenPath: "motion.scale",
          type: "number",
        });
      }
    }
  });

  it("rechaza salidas en notacion cientifica", () => {
    const result = render(1e21);
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]!.code).toBe("css-number-invalid");
    }
  });
});
