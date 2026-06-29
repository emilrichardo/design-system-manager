import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — boolean (T041)", () => {
  it("rechaza cualquier boolean", () => {
    for (const value of [true, false]) {
      const result = renderCssArtifact(
        setOf([tokenOf({ path: "state.enabled", effectiveType: "boolean", value })]),
      );
      expect(result.outcome).toBe("unsupported-value");
      if (result.outcome === "unsupported-value") {
        expect(result.errors[0]).toMatchObject({
          format: "css",
          code: "css-boolean-unsupported",
          tokenPath: "state.enabled",
          type: "boolean",
        });
      }
    }
  });
});
