import { describe, expect, it } from "vitest";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { setOf, tokenOf } from "../../infrastructure/build-export/css-renderer-helpers.js";

describe("CSS all-or-nothing (T053)", () => {
  it("un token valido seguido por una sombra invalida no produce artifact", () => {
    const result = renderCssArtifact(
      setOf([
        tokenOf({ path: "color.brand", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#0066FF" } }),
        tokenOf({ path: "shadow.card", effectiveType: "shadow", value: [{ x: 0, y: 2 }] }),
      ]),
    );

    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors[0]).toMatchObject({ code: "css-shadow-unsupported-shape", tokenPath: "shadow.card", type: "shadow" });
    }
  });

  it("nombre invalido bloquea todo el artifact", () => {
    const result = renderCssArtifact(
      setOf([
        tokenOf({ path: "color.brand", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#0066FF" } }),
        tokenOf({ path: "bad name", effectiveType: "string", value: "x" }),
      ]),
    );

    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors.some((error) => error.code === "css-name-invalid")).toBe(true);
    }
  });

  it("colision bloquea todo el artifact", () => {
    const result = renderCssArtifact(
      setOf([
        tokenOf({ path: "foo.bar-baz", effectiveType: "number", value: 1 }),
        tokenOf({ path: "foo-bar.baz", effectiveType: "number", value: 2 }),
      ]),
    );

    expect(result.outcome).toBe("unsupported-value");
    if (result.outcome === "unsupported-value") {
      expect(result.errors.some((error) => error.code === "css-name-collision")).toBe(true);
    }
  });

  it("alias invalido y value shape invalida no producen bytes parciales", () => {
    const alias = renderCssArtifact(
      setOf([
        tokenOf({ path: "semantic.a", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#111111" }, aliasOf: "missing.target", aliasChain: ["missing.target"] }),
        tokenOf({ path: "primitive.c", effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0], hex: "#222222" } }),
      ]),
    );
    expect(alias.outcome).toBe("unsupported-value");

    const invalidValue = renderCssArtifact(
      setOf([tokenOf({ path: "spacing.x", effectiveType: "dimension", value: { value: 16, unit: "pt" } })]),
    );
    expect(invalidValue.outcome).toBe("unsupported-value");
  });
});
