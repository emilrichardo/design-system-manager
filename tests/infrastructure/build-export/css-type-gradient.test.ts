import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — gradient (T050)", () => {
  it("siempre rechaza gradient", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "color.gradient", effectiveType: "gradient", value: [{ color: "#000" }] })]),
    );
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]).toMatchObject({ code: "css-type-unsupported", tokenPath: "color.gradient", type: "gradient" });
    }
  });
});
