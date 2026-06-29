// T037 (006) — CSS type matrix: color (CONDITIONALLY_SUPPORTED): hex válido lowercase; alpha≠1 / shape
// inválida → `css-color-unsupported-shape`.
import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

const validColor = { colorSpace: "srgb", components: [0.231, 0.509, 0.964], alpha: 1, hex: "#3B82F6" } as const;

describe("CSS type matrix — color (T037)", () => {
  it("hex válido se emite en lowercase `#rrggbb`", () => {
    const r = renderCssArtifact(setOf([tokenOf({ path: "color.brand", effectiveType: "color", value: validColor })]));
    expect(r.outcome).toBe("rendered");
    if (r.outcome !== "rendered") return;
    expect(new TextDecoder().decode(r.artifact.bytes)).toBe(":root {\n  --color-brand: #3b82f6;\n}\n");
  });

  it("alpha distinto de 1 → css-color-unsupported-shape", () => {
    const r = renderCssArtifact(setOf([tokenOf({ path: "color.x", effectiveType: "color", value: { ...validColor, alpha: 0.5 } })]));
    expect(r.outcome).toBe("unsupported-value");
    if (r.outcome !== "unsupported-value") return;
    expect(r.errors[0]).toMatchObject({ format: "css", code: "css-color-unsupported-shape", tokenPath: "color.x", type: "color" });
  });

  it("colorSpace distinto de srgb → unsupported-shape", () => {
    const r = renderCssArtifact(setOf([tokenOf({ path: "color.x", effectiveType: "color", value: { ...validColor, colorSpace: "display-p3" } })]));
    expect(r.outcome).toBe("unsupported-value");
    if (r.outcome !== "unsupported-value") return;
    expect(r.errors[0]!.code).toBe("css-color-unsupported-shape");
  });

  it("hex con longitud incorrecta → unsupported-shape", () => {
    const r = renderCssArtifact(setOf([tokenOf({ path: "color.x", effectiveType: "color", value: { ...validColor, hex: "#abc" } })]));
    expect(r.outcome).toBe("unsupported-value");
  });

  it("color no objeto → unsupported-shape", () => {
    const r = renderCssArtifact(setOf([tokenOf({ path: "color.x", effectiveType: "color", value: "#fff" })]));
    expect(r.outcome).toBe("unsupported-value");
  });
});
