// T038 (006) — CSS type matrix: dimension (CONDITIONALLY_SUPPORTED): px/rem/em/%.
import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

function render(value: unknown) {
  return renderCssArtifact(setOf([tokenOf({ path: "spacing.x", effectiveType: "dimension", value })]));
}

describe("CSS type matrix — dimension (T038)", () => {
  it.each([
    ["px", { value: 16, unit: "px" }, ":root {\n  --spacing-x: 16px;\n}\n"],
    ["rem", { value: 1, unit: "rem" }, ":root {\n  --spacing-x: 1rem;\n}\n"],
    ["em", { value: 0.5, unit: "em" }, ":root {\n  --spacing-x: 0.5em;\n}\n"],
    ["%", { value: 50, unit: "%" }, ":root {\n  --spacing-x: 50%;\n}\n"],
    ["zero", { value: 0, unit: "px" }, ":root {\n  --spacing-x: 0px;\n}\n"],
  ])("unidad %s emite bytes exactos", (_label, value, expected) => {
    const r = render(value);
    expect(r.outcome).toBe("rendered");
    if (r.outcome === "rendered") expect(new TextDecoder().decode(r.artifact.bytes)).toBe(expected);
  });

  it("unidad inválida → css-dimension-unsupported-shape", () => {
    const r = render({ value: 16, unit: "pt" });
    expect(r.outcome).toBe("unsupported-value");
    if (r.outcome === "unsupported-value") expect(r.errors[0]!.code).toBe("css-dimension-unsupported-shape");
  });

  it("value no finito → unsupported-shape", () => {
    expect(render({ value: NaN, unit: "px" }).outcome).toBe("unsupported-value");
    expect(render({ value: Infinity, unit: "px" }).outcome).toBe("unsupported-value");
  });

  it("dimension no objeto → unsupported-shape", () => {
    expect(render("16px").outcome).toBe("unsupported-value");
  });
});
