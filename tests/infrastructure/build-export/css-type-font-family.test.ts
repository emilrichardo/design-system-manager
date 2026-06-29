import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "./css-renderer-helpers.js";

function render(value: unknown) {
  return renderCssArtifact(setOf([tokenOf({ path: "typography.family", effectiveType: "fontFamily", value })]));
}

describe("CSS type matrix — fontFamily (T042)", () => {
  it("acepta string unico y arrays con quoting correcto", () => {
    const single = render("Inter");
    expect(single.outcome).toBe("rendered");
    if (single.outcome === "rendered") {
      expect(new TextDecoder().decode(single.artifact.bytes)).toBe(':root {\n  --typography-family: "Inter";\n}\n');
    }

    const list = render(["Inter", "system-ui", "A B"]);
    expect(list.outcome).toBe("rendered");
    if (list.outcome === "rendered") {
      expect(new TextDecoder().decode(list.artifact.bytes)).toBe(
        ':root {\n  --typography-family: "Inter", system-ui, "A B";\n}\n',
      );
    }
  });

  it("preserva generic keywords admitidos sin comillas", () => {
    const result = render("sans-serif");
    expect(result.outcome).toBe("rendered");
    if (result.outcome === "rendered") {
      expect(new TextDecoder().decode(result.artifact.bytes)).toContain("--typography-family: sans-serif;");
    }
  });

  it("rechaza strings vacios, arrays vacios y miembros invalidos", () => {
    for (const value of ["", [], ["", "Inter"], ["Inter", 2]]) {
      const result = render(value);
      expect(result.outcome).toBe("unsupported-value");
      if (result.outcome === "unsupported-value") {
        expect(result.errors[0]!.code).toBe("css-font-family-unsupported-shape");
      }
    }
  });
});
