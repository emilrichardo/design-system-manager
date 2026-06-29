import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — transition (T048)", () => {
  it("siempre rechaza transition", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "motion.transition", effectiveType: "transition", value: { duration: 120 } })]),
    );
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]).toMatchObject({ code: "css-type-unsupported", tokenPath: "motion.transition", type: "transition" });
    }
  });
});
