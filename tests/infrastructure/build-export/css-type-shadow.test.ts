import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — shadow (T049)", () => {
  it("siempre rechaza shadow", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "shadow.card", effectiveType: "shadow", value: [{ x: 0, y: 2 }] })]),
    );
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]).toMatchObject({ code: "css-type-unsupported", tokenPath: "shadow.card", type: "shadow" });
    }
  });
});
