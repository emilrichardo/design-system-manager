import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "../../infrastructure/build-export/css-renderer-helpers.js";

describe("CSS aliases (T052)", () => {
  it("emite el target inmediato para alias directo y chain", () => {
    const result = renderCssArtifact(
      setOf([
        tokenOf({ path: "semantic.a", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#111111" }, aliasOf: "semantic.b", aliasChain: ["semantic.b", "primitive.c"] }),
        tokenOf({ path: "semantic.b", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#111111" }, aliasOf: "primitive.c", aliasChain: ["primitive.c"] }),
        tokenOf({ path: "primitive.c", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#111111" } }),
      ]),
    );

    expect(result.outcome).toBe("rendered");
    if (result.outcome !== "rendered") return;

    expect(new TextDecoder().decode(result.artifact.bytes)).toBe(
      ":root {\n  --semantic-a: var(--semantic-b);\n  --semantic-b: var(--primitive-c);\n  --primitive-c: #111111;\n}\n",
    );
  });

  it("missing target o target no renderizable -> css-alias-target-unrenderable", () => {
    const missing = renderCssArtifact(
      setOf([tokenOf({ path: "semantic.a", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#111111" }, aliasOf: "missing.target", aliasChain: ["missing.target"] })]),
    );
    expect(missing.outcome).toBe("unsupported-value");
    if (missing.outcome === "unsupported-value") {
      expect(missing.errors[0]!.code).toBe("css-alias-target-unrenderable");
    }

    const unsupported = renderCssArtifact(
      setOf([
        tokenOf({ path: "semantic.a", effectiveType: "shadow", value: [{ x: 0, y: 2 }], aliasOf: "shadow.base", aliasChain: ["shadow.base"] }),
        tokenOf({ path: "shadow.base", effectiveType: "shadow", value: [{ x: 0, y: 2 }] }),
      ]),
    );
    expect(unsupported.outcome).toBe("unsupported-value");
    if (unsupported.outcome === "unsupported-value") {
      expect(unsupported.errors[0]!.code).toBe("css-alias-target-unrenderable");
    }
  });

  it("rechaza cycles e inconsistencias de alias chain sin fallback silencioso", () => {
    const cycle = renderCssArtifact(
      setOf([
        tokenOf({ path: "semantic.a", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#111111" }, aliasOf: "semantic.b", aliasChain: ["semantic.b", "semantic.a"] }),
        tokenOf({ path: "semantic.b", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#111111" }, aliasOf: "semantic.a", aliasChain: ["semantic.a", "semantic.b"] }),
      ]),
    );
    expect(cycle.outcome).toBe("unsupported-value");
    if (cycle.outcome === "unsupported-value") {
      expect(cycle.errors[0]!.code).toBe("css-alias-target-unrenderable");
    }
  });
});
