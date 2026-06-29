import { describe, expect, it } from "vitest";
import { artifactContentType, artifactFilename } from "../../../src/domain/build-export/build-format.js";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

describe("renderCssArtifact (T036)", () => {
  it("produce :root con indentacion, espacio despues de :, semicolon y newline final", () => {
    const result = renderCssArtifact(
      setOf([
        tokenOf({ path: "color.brand", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#0066FF" } }),
        tokenOf({ path: "spacing.100", effectiveType: "dimension", value: { value: 16, unit: "px" } }),
      ]),
    );

    expect(result.outcome).toBe("rendered");
    if (result.outcome !== "rendered") return;

    const text = new TextDecoder().decode(result.artifact.bytes);
    expect(text).toBe(":root {\n  --color-brand: #0066ff;\n  --spacing-100: 16px;\n}\n");
    expect(result.artifact.relativePath).toBe(artifactFilename("css"));
    expect(result.artifact.contentType).toBe(artifactContentType("css"));
  });

  it("usa UTF-8 sin BOM", () => {
    const result = renderCssArtifact(
      setOf([tokenOf({ path: "content.label", effectiveType: "string", value: "cafe" })]),
    );
    expect(result.outcome).toBe("rendered");
    if (result.outcome !== "rendered") return;

    const bytes = [...result.artifact.bytes];
    expect(bytes.slice(0, 3)).not.toEqual([0xef, 0xbb, 0xbf]);
  });

  it("es determinista para el mismo input", () => {
    const set = setOf([
      tokenOf({ path: "color.brand", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#0066FF" } }),
      tokenOf({ path: "spacing.100", effectiveType: "dimension", value: { value: 16, unit: "px" } }),
    ]);

    const first = renderCssArtifact(set);
    const second = renderCssArtifact(set);
    expect(first.outcome).toBe("rendered");
    expect(second.outcome).toBe("rendered");
    if (first.outcome !== "rendered" || second.outcome !== "rendered") return;

    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.artifact.byteLength).toBe(second.artifact.byteLength);
    expect(first.artifact.bytes).toEqual(second.artifact.bytes);
  });

  it("respeta el orden canonico ya resuelto en NormalizedTokenSet", () => {
    const result = renderCssArtifact(
      setOf([
        tokenOf({ path: "spacing.200", effectiveType: "dimension", value: { value: 32, unit: "px" }, order: 0 }),
        tokenOf({ path: "spacing.100", effectiveType: "dimension", value: { value: 16, unit: "px" }, order: 1 }),
      ]),
    );

    expect(result.outcome).toBe("rendered");
    if (result.outcome !== "rendered") return;

    expect(new TextDecoder().decode(result.artifact.bytes)).toBe(
      ":root {\n  --spacing-200: 32px;\n  --spacing-100: 16px;\n}\n",
    );
  });
});
