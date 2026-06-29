import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("CSS type matrix — string (T040)", () => {
  it("usa css-string.ts para el escaping", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "content.label", effectiveType: "string", value: 'A "quote"\nnext' })]),
    );
    expect(result.outcome).toBe("rendered");
    if (result.outcome === "rendered") {
      expect(new TextDecoder().decode(result.artifact.bytes)).toBe(
        ':root {\n  --content-label: "A \\"quote\\"\\anext";\n}\n',
      );
    }
  });

  it("rechaza runtime shape no-string", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "content.label", effectiveType: "string", value: 42 })]),
    );
    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]).toMatchObject({
        format: "css",
        code: "css-string-unsupported-type",
        tokenPath: "content.label",
        type: "string",
      });
    }
  });
});
