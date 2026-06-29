import { describe, expect, it } from "vitest";
import { artifactContentType } from "../../../src/domain/build-export/build-format.js";
import { renderTypeScriptTokensArtifact } from "../../../src/infrastructure/build-export/ts-renderer.js";
import { sha256Hex } from "../../../src/infrastructure/build-export/hash.js";
import { setOf, tokenOf } from "./ts-renderer-helpers.js";

describe("typescript renderer shape (T061/T063/T064)", () => {
  it("emite tokens.ts autocontenido con tokens, tokenMetadata y TokenPath", () => {
    const result = renderTypeScriptTokensArtifact(
      setOf([
        tokenOf({
          path: "color.alias",
          effectiveType: "color",
          value: "#ffffff",
          sourceValue: "{color.base}",
          category: "color",
          foundationLevel: "semantic",
          aliasOf: "color.base",
          aliasChain: ["color.base"],
          description: "Alias inmediato",
          order: 1,
        }),
        tokenOf({
          path: "color.base",
          effectiveType: "color",
          value: "#ffffff",
          sourceValue: "#fff",
          category: "color",
          foundationLevel: "primitive",
          order: 0,
        }),
      ]),
    );

    expect(result.outcome).toBe("rendered");
    if (result.outcome !== "rendered") return;

    const text = new TextDecoder().decode(result.artifact.bytes);
    expect(result.artifact.format).toBe("typescript");
    expect(result.artifact.relativePath).toBe("tokens.ts");
    expect(result.artifact.contentType).toBe("text/typescript; charset=utf-8");
    expect(artifactContentType("typescript")).toBe("text/typescript; charset=utf-8");
    expect(result.artifact.contentHash).toBe(sha256Hex(result.artifact.bytes));
    expect(result.artifact.byteLength).toBe(result.artifact.bytes.byteLength);
    expect([...result.artifact.bytes].slice(0, 3)).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect(text).toBe(`export const tokens = {
  "color.alias": "#ffffff",
  "color.base": "#ffffff",
} as const;

export const tokenMetadata = {
  "color.alias": {
    aliasOf: "color.base",
    type: "color",
    category: "color",
    foundationLevel: "semantic",
    description: "Alias inmediato",
  },
  "color.base": {
    aliasOf: null,
    type: "color",
    category: "color",
    foundationLevel: "primitive",
    description: null,
  },
} as const;

export type TokenPath = keyof typeof tokens;
`);
  });

  it("no filtra campos internos del NormalizedTokenSet ni del snapshot", () => {
    const result = renderTypeScriptTokensArtifact(
      Object.freeze({
        ...setOf([
          tokenOf({
            path: "spacing.safe",
            effectiveType: "dimension",
            value: { value: 8, unit: "px" },
            sourceValue: "SOURCE_VALUE_MARKER",
            category: "spacing",
            foundationLevel: "primitive",
            aliasChain: ["ALIAS_CHAIN_MARKER"],
          }),
        ]),
        source: Object.freeze({
          logicalPath: "/ABSOLUTE/PATH/MARKER/base.tokens.json",
          sourceHash: "RAW_BYTES_MARKER",
        }),
        warnings: Object.freeze([{ code: "STACK_MARKER", path: null, message: "ERROR_MARKER", severity: "warning" as const }]),
      }),
    );

    expect(result.outcome).toBe("rendered");
    if (result.outcome !== "rendered") return;

    const text = new TextDecoder().decode(result.artifact.bytes);
    for (const forbidden of [
      "SOURCE_VALUE_MARKER",
      "ALIAS_CHAIN_MARKER",
      "RAW_BYTES_MARKER",
      "/ABSOLUTE/PATH/MARKER",
      "STACK_MARKER",
      "ERROR_MARKER",
      "sourceValue",
      "aliasChain",
      "compatibility",
      "trust",
      "canonicalOrder",
      "segments",
      "$extensions",
      "Error",
      "stack",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("rechaza all-or-nothing si un token no puede serializarse", () => {
    const result = renderTypeScriptTokensArtifact(
      setOf([
        tokenOf({ path: "good.token", effectiveType: "number", value: 1, category: "opacity" }),
        tokenOf({ path: "bad.token", effectiveType: "number", value: Number.NaN, category: "opacity" }),
      ]),
    );

    expect(result).toEqual({
      outcome: "unsupported-value",
      errors: [
        {
          format: "typescript",
          code: "typescript-literal-invalid",
          tokenPath: "bad.token",
          message: "Valor TypeScript no soportado en bad.token: number no finito.",
        },
      ],
    });
    expect("artifact" in result).toBe(false);
  });
});
