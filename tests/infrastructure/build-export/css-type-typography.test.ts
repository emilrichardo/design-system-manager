import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — typography (T051)", () => {
  it("siempre rechaza typography", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "typography.body", effectiveType: "typography", value: { fontSize: 16 } })]),
    );
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]).toMatchObject({ code: "css-type-unsupported", tokenPath: "typography.body", type: "typography" });
    }
  });
});
