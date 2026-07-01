import { describe, expect, it } from "vitest";
import { traverseDtcgTree } from "../../../src/infrastructure/analysis/traverse-dtcg-tree.js";

const color = (hex = "#000000") => ({ colorSpace: "srgb", components: [0, 0, 0], alpha: 1, hex });

describe("traverseDtcgTree deep DTCG validation (011 T012)", () => {
  it("border/transition/shadow/gradient/typography válidos pasan sin warnings genéricos", () => {
    const result = traverseDtcgTree({
      border: {
        stroke: {
          $type: "border",
          $description: "border",
          $value: { color: color("#ffffff"), width: { value: 1, unit: "px" }, style: "solid" },
        },
      },
      motion: {
        fast: {
          $type: "transition",
          $description: "transition",
          $value: {
            duration: { value: 150, unit: "ms" },
            delay: { value: 0, unit: "ms" },
            timingFunction: [0.4, 0, 0.2, 1],
          },
        },
      },
      shadow: {
        card: {
          $type: "shadow",
          $description: "shadow",
          $value: {
            color: color("#111111"),
            offsetX: { value: 0, unit: "px" },
            offsetY: { value: 4, unit: "px" },
            blur: { value: 12, unit: "px" },
            spread: { value: 0, unit: "px" },
          },
        },
      },
      gradient: {
        hero: {
          $type: "gradient",
          $description: "gradient",
          $value: [
            { color: color("#000000"), position: 0 },
            { color: color("#ffffff"), position: 1 },
          ],
        },
      },
      typography: {
        body: {
          $type: "typography",
          $description: "typography",
          $value: {
            fontFamily: ["Inter", "sans-serif"],
            fontSize: { value: 16, unit: "px" },
            fontWeight: 400,
            lineHeight: 1.5,
            letterSpacing: { value: 0, unit: "px" },
          },
        },
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((warning) => warning.code)).not.toContain("dtcg-type-not-deeply-inspected");
  });

  it("transition inválida devuelve un código específico y accionable", () => {
    const result = traverseDtcgTree({
      motion: {
        broken: {
          $type: "transition",
          $description: "broken",
          $value: {
            duration: { value: 150, unit: "ms" },
            timingFunction: [1.4, 0, 0.2, 1],
          },
        },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("cubic-bezier-shape-invalid");
  });
});
