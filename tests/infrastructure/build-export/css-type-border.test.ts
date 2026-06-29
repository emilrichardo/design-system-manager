import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — border (T047)", () => {
  it("siempre rechaza border", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "border.default", effectiveType: "border", value: { color: "#000" } })]),
    );
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]).toMatchObject({ code: "css-type-unsupported", tokenPath: "border.default", type: "border" });
    }
  });
});
