// T027 (005) — Validación DTCG/foundations en memoria reutilizando el motor de `002` y `004`.
import { describe, expect, it } from "vitest";
import { validatePresetEnvelope } from "../../../src/infrastructure/presets/preset-envelope-validator.js";
import { analyzePresetTokens } from "../../../src/infrastructure/presets/preset-token-analyzer.js";
import { validatePreset } from "../../../src/application/presets/validate-preset.js";
import { traverseDtcgTree } from "../../../src/infrastructure/analysis/traverse-dtcg-tree.js";
import type { DtcgAnalyzer } from "../../../src/application/analysis-ports.js";
import type { AnalyzePresetTokensDeps } from "../../../src/infrastructure/presets/preset-token-analyzer.js";

const NS = "ar.neuraz.design-system-manager";
const cv = { colorSpace: "srgb", components: [0, 0, 0] };
const primitive = { [NS]: { foundation: { level: "primitive" } } };

function codesFor(
  includedCategories: readonly string[],
  tokens: Record<string, unknown>,
  deps?: AnalyzePresetTokensDeps,
): readonly string[] {
  const { envelope, issues } = validatePresetEnvelope({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories, tokens });
  if (!envelope) return issues.map((i) => i.code);
  const v = validatePreset(envelope, analyzePresetTokens(envelope.tokens, deps));
  return [...v.errors, ...v.warnings].map((i) => i.code);
}

describe("preset DTCG/foundation validation (T027)", () => {
  it("flags an invalid DTCG node structure", () => {
    expect(codesFor(["color"], { color: { $type: "color", a: 5 } })).toContain("preset-dtcg-invalid");
  });

  it("flags an unrecognized $type", () => {
    expect(codesFor(["color"], { color: { a: { $type: "bogus", $value: cv } } })).toContain("preset-dtcg-invalid");
  });

  it("flags an unsupported type/category pairing", () => {
    expect(
      codesFor(["spacing"], { spacing: { $type: "color", $extensions: primitive, a: { $value: cv } } }),
    ).toContain("preset-type-mismatch");
  });

  it("flags invalid Neuraz foundation metadata", () => {
    expect(
      codesFor(["color"], { color: { $type: "color", $extensions: { [NS]: { foundation: { level: "core" } } }, a: { $value: cv } } }),
    ).toContain("preset-foundation-metadata-invalid");
  });

  it("flags a missing alias inside the preset", () => {
    expect(
      codesFor(["color"], { color: { $type: "color", $extensions: primitive, a: { $value: cv }, b: { $value: "{color.zzz}" } } }),
    ).toContain("preset-alias-missing");
  });

  it("flags an alias cycle", () => {
    expect(
      codesFor(["color"], { color: { $type: "color", $extensions: primitive, a: { $value: "{color.b}" }, b: { $value: "{color.a}" } } }),
    ).toContain("preset-alias-cycle");
  });

  it("flags an alias pointing to a group", () => {
    expect(
      codesFor(["color"], { color: { $type: "color", $extensions: primitive, grp: { x: { $value: cv } }, a: { $value: "{color.grp}" } } }),
    ).toContain("preset-alias-to-group");
  });

  it("flags an alias external to the preset", () => {
    expect(
      codesFor(["color"], { color: { $type: "color", $extensions: primitive, a: { $value: cv }, b: { $value: "{external.x}" } } }),
    ).toContain("preset-reference-external");
  });

  it("flags traversal limits exceeded as a partial, non-valid result", () => {
    const tight: DtcgAnalyzer = {
      analyze: (doc) => traverseDtcgTree(doc, { maxDepth: 1, maxNodes: 100_000, maxPathLength: 512, maxAliasLength: 256, maxIssues: 1_000 }),
    };
    const deep = { color: { $type: "color", $extensions: primitive, a: { b: { $value: cv } } } };
    const { envelope } = validatePresetEnvelope({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: deep });
    expect(envelope).not.toBeNull();
    if (!envelope) return;
    const v = validatePreset(envelope, analyzePresetTokens(envelope.tokens, { analyzer: tight }));
    expect(v.valid).toBe(false);
    expect(v.errors.map((e) => e.code)).toContain("preset-limit-exceeded");
  });

  it("warns (does not invalidate) on an unclassified own token", () => {
    const { envelope } = validatePresetEnvelope({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: { $type: "color", a: { $value: cv } } } });
    expect(envelope).not.toBeNull();
    if (!envelope) return;
    const v = validatePreset(envelope, analyzePresetTokens(envelope.tokens));
    expect(v.warnings.map((w) => w.code)).toContain("preset-token-unclassified");
    expect(v.valid).toBe(true);
  });

  it("issues are sanitized: no Error, stack, env, or absolute paths", () => {
    const { envelope } = validatePresetEnvelope({ id: "p", name: "P", description: "d", version: "1.0.0", includedCategories: ["color"], tokens: { color: { $type: "color", a: { $value: cv }, b: { $value: "{color.zzz}" } } } });
    if (!envelope) return;
    const v = validatePreset(envelope, analyzePresetTokens(envelope.tokens));
    for (const issue of [...v.errors, ...v.warnings]) {
      expect(typeof issue.message).toBe("string");
      expect(issue.message).not.toMatch(/\/(Users|home|tmp|var)\//);
      expect(issue.message.toLowerCase()).not.toContain("error:");
      expect(issue).not.toHaveProperty("stack");
    }
  });
});
