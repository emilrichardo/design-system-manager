import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — strokeStyle (T046)", () => {
  it("siempre rechaza strokeStyle", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "border.stroke", effectiveType: "strokeStyle", value: { dashArray: [1, 2] } })]),
    );
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]).toMatchObject({ code: "css-type-unsupported", tokenPath: "border.stroke", type: "strokeStyle" });
    }
  });
});
