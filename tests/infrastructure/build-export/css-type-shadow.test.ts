import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — shadow (T049)", () => {
  it("renderiza shadow DTCG simple", () => {
    const result = renderCssArtifact(
      setOf([
        tokenOf({
          path: "shadow.card",
          effectiveType: "shadow",
          value: {
            color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.2, hex: "#000000" },
            offsetX: { value: 0, unit: "px" },
            offsetY: { value: 2, unit: "px" },
            blur: { value: 8, unit: "px" },
            spread: { value: 0, unit: "px" },
          },
        }),
      ]),
    );
    expect(result.outcome).toBe("rendered");
    if (result.outcome === "rendered") expect(Buffer.from(result.artifact.bytes).toString("utf8")).toContain("--shadow-card: 0px 2px 8px 0px rgb(0 0 0 / 0.2);");
  });

  it("rechaza shapes de shadow no representables", () => {
    const result = renderCssArtifact(setOf([tokenOf({ path: "shadow.card", effectiveType: "shadow", value: [{ x: 0, y: 2 }] })]));
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") expect(result.errors[0]).toMatchObject({ code: "css-shadow-unsupported-shape", tokenPath: "shadow.card", type: "shadow" });
  });
});
