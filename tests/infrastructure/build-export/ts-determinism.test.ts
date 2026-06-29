import { describe, expect, it } from "vitest";
import { renderTypeScriptTokensArtifact } from "../../../src/infrastructure/build-export/ts-renderer.js";
import { setOf, tokenOf } from "./ts-renderer-helpers.js";

describe("typescript renderer determinism (T066)", () => {
  it("ordena por categoría y path canónico, no por insertion order", () => {
    const unordered = [
      tokenOf({ path: "spacing.a.b", effectiveType: "dimension", value: { value: 2, unit: "px" }, category: "spacing" }),
      tokenOf({ path: "color.b", effectiveType: "color", value: "#bbbbbb", category: "color" }),
      tokenOf({ path: "spacing.a", effectiveType: "dimension", value: { value: 1, unit: "px" }, category: "spacing" }),
      tokenOf({ path: "color.B", effectiveType: "color", value: "#aaaaaa", category: "color" }),
      tokenOf({ path: "misc.z", effectiveType: "string", value: "z", category: null }),
    ];
    const canonical = [unordered[3]!, unordered[1]!, unordered[2]!, unordered[0]!, unordered[4]!];

    const first = renderTypeScriptTokensArtifact(setOf(unordered, ["misc.z", "spacing.a.b", "color.b", "spacing.a", "color.B"]));
    const second = renderTypeScriptTokensArtifact(setOf(canonical, ["color.B", "color.b", "spacing.a", "spacing.a.b", "misc.z"]));

    expect(first.outcome).toBe("rendered");
    expect(second.outcome).toBe("rendered");
    if (first.outcome !== "rendered" || second.outcome !== "rendered") return;

    expect(first.artifact.bytes).toEqual(second.artifact.bytes);
    expect(first.artifact.byteLength).toBe(second.artifact.byteLength);
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    const text = new TextDecoder().decode(first.artifact.bytes);
    expect(text.indexOf("\"color.B\"")).toBeLessThan(text.indexOf("\"color.b\""));
    expect(text.indexOf("\"color.b\"")).toBeLessThan(text.indexOf("\"spacing.a\""));
    expect(text.indexOf("\"spacing.a\"")).toBeLessThan(text.indexOf("\"spacing.a.b\""));
    expect(text.indexOf("\"spacing.a.b\"")).toBeLessThan(text.indexOf("\"misc.z\""));
  });

  it("preserva bytes, byteLength y hash para renders repetidos del mismo set", () => {
    const set = setOf([
      tokenOf({ path: "color.base", effectiveType: "color", value: "#0066ff", category: "color", foundationLevel: "primitive" }),
      tokenOf({ path: "radius.sm", effectiveType: "dimension", value: { value: 4, unit: "px" }, category: "radius", foundationLevel: "semantic" }),
    ]);

    const first = renderTypeScriptTokensArtifact(set);
    const second = renderTypeScriptTokensArtifact(set);
    expect(first.outcome).toBe("rendered");
    expect(second.outcome).toBe("rendered");
    if (first.outcome !== "rendered" || second.outcome !== "rendered") return;

    expect(first.artifact.bytes).toEqual(second.artifact.bytes);
    expect(first.artifact.byteLength).toBe(first.artifact.bytes.byteLength);
    expect(second.artifact.byteLength).toBe(second.artifact.bytes.byteLength);
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
  });
});
