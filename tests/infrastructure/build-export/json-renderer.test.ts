import { afterEach, describe, expect, it } from "vitest";
import type { ResolvedTokensV1 } from "../../../src/application/build-export/resolved-tokens-mapper.js";
import { renderResolvedTokensArtifact, serializeResolvedTokensV1 } from "../../../src/infrastructure/build-export/json-renderer.js";
import type { BuildFormat } from "../../../src/domain/build-export/build-format.js";
import type { FormatCompatibility, NormalizedBuildToken, NormalizedTokenSet } from "../../../src/domain/build-export/normalized-token.js";
import type { FoundationCategoryId } from "../../../src/domain/foundations/foundation-category.js";
import type { FoundationLevel } from "../../../src/domain/foundations/foundation-level.js";

function compat(): readonly FormatCompatibility[] {
  return (["css", "json", "typescript"] as BuildFormat[]).map((format) => ({ format, representable: true, reason: null }));
}

function tokenOf(options: {
  readonly path: string;
  readonly effectiveType: string;
  readonly value: unknown;
  readonly category?: FoundationCategoryId | null;
  readonly foundationLevel?: FoundationLevel;
  readonly description?: string | null;
  readonly aliasOf?: string | null;
  readonly aliasChain?: readonly string[];
  readonly order?: number;
}): NormalizedBuildToken {
  return Object.freeze({
    path: options.path,
    segments: Object.freeze(options.path.split(".")),
    category: options.category ?? null,
    foundationLevel: options.foundationLevel ?? "unclassified",
    effectiveType: options.effectiveType,
    sourceValue: options.value,
    resolvedValue: options.value,
    aliasOf: options.aliasOf ?? null,
    aliasChain: Object.freeze([...(options.aliasChain ?? [])]),
    description: options.description ?? null,
    trust: "valid",
    order: options.order ?? 0,
    compatibility: Object.freeze(compat()),
  });
}

function setOf(tokens: readonly NormalizedBuildToken[]): NormalizedTokenSet {
  return Object.freeze({
    source: Object.freeze({
      logicalPath: "design-system/tokens/base.tokens.json",
      sourceHash: "c".repeat(64),
    }),
    tokens: Object.freeze(tokens),
    byPath: new Map(tokens.map((token) => [token.path, token])),
    warnings: Object.freeze([]),
  });
}

describe("json renderer (T056/T058)", () => {
  it("serializa bytes exactos con 2 espacios, root/source contractuales y newline final", () => {
    const result = renderResolvedTokensArtifact(
      setOf([
        tokenOf({
          path: "color.base",
          effectiveType: "color",
          value: { colorSpace: "srgb", components: [0.2, 0.5, 0.9], alpha: 1, hex: "#3b82f6" },
          category: "color",
          description: "Color base",
          order: 0,
        }),
        tokenOf({
          path: "content.title",
          effectiveType: "string",
          value: "Línea \"uno\"\n\\dos",
          order: 1,
        }),
        tokenOf({
          path: "meta.flags",
          effectiveType: "boolean",
          value: true,
          order: 2,
        }),
      ]),
    );

    expect(result.outcome).toBe("rendered");
    if (result.outcome !== "rendered") return;

    const text = new TextDecoder().decode(result.artifact.bytes);
    expect(text).toBe(`{
  "formatVersion": "1.0.0",
  "source": {
    "path": "design-system/tokens/base.tokens.json",
    "hash": "${"c".repeat(64)}"
  },
  "tokens": {
    "color.base": {
      "value": {
        "colorSpace": "srgb",
        "components": [
          0.2,
          0.5,
          0.9
        ],
        "alpha": 1,
        "hex": "#3b82f6"
      },
      "aliasOf": null,
      "type": "color",
      "category": "color",
      "foundationLevel": "unclassified",
      "description": "Color base"
    },
    "content.title": {
      "value": "Línea \\"uno\\"\\n\\\\dos",
      "aliasOf": null,
      "type": "string",
      "category": null,
      "foundationLevel": "unclassified",
      "description": null
    },
    "meta.flags": {
      "value": true,
      "aliasOf": null,
      "type": "boolean",
      "category": null,
      "foundationLevel": "unclassified",
      "description": null
    }
  }
}
`);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
    expect([...result.artifact.bytes].slice(0, 3)).not.toEqual([0xef, 0xbb, 0xbf]);
  });

  it("permite contrato vacío si el set no tiene tokens y mantiene bytes parseables", () => {
    const envelope: ResolvedTokensV1 = {
      formatVersion: "1.0.0",
      source: { path: "design-system/tokens/base.tokens.json", hash: "0".repeat(64) },
      tokens: {},
    };

    const serialized = serializeResolvedTokensV1(envelope);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) return;

    const text = new TextDecoder().decode(serialized.bytes);
    expect(text).toBe(`{
  "formatVersion": "1.0.0",
  "source": {
    "path": "design-system/tokens/base.tokens.json",
    "hash": "${"0".repeat(64)}"
  },
  "tokens": {}
}
`);
    expect(JSON.parse(text)).toEqual(envelope);
  });

  it("es determinista para el mismo input semántico y no depende del insertion order de byPath", () => {
    const first = renderResolvedTokensArtifact(
      setOf([
        tokenOf({
          path: "color.alpha",
          effectiveType: "color",
          value: { colorSpace: "srgb", components: [0.2, 0.5, 0.9], alpha: 1, hex: "#3b82f6" },
          category: "color",
          order: 0,
        }),
        tokenOf({
          path: "color.beta",
          effectiveType: "color",
          value: { colorSpace: "srgb", components: [0.2, 0.5, 0.9], alpha: 1, hex: "#3b82f6" },
          category: "color",
          order: 1,
        }),
        tokenOf({
          path: "spacing.md",
          effectiveType: "dimension",
          value: { value: 16, unit: "px" },
          category: "spacing",
          order: 2,
        }),
      ]),
    );
    const secondTokens = [
      tokenOf({
        path: "color.alpha",
        effectiveType: "color",
        value: { colorSpace: "srgb", components: [0.2, 0.5, 0.9], alpha: 1, hex: "#3b82f6" },
        category: "color",
        order: 0,
      }),
      tokenOf({
        path: "color.beta",
        effectiveType: "color",
        value: { colorSpace: "srgb", components: [0.2, 0.5, 0.9], alpha: 1, hex: "#3b82f6" },
        category: "color",
        order: 1,
      }),
      tokenOf({
        path: "spacing.md",
        effectiveType: "dimension",
        value: { value: 16, unit: "px" },
        category: "spacing",
        order: 2,
      }),
    ];
    const second = renderResolvedTokensArtifact(
      Object.freeze({
        source: Object.freeze({
          logicalPath: "design-system/tokens/base.tokens.json",
          sourceHash: "c".repeat(64),
        }),
        tokens: Object.freeze(secondTokens),
        byPath: new Map([
          ["spacing.md", secondTokens[2]],
          ["color.beta", secondTokens[1]],
          ["color.alpha", secondTokens[0]],
        ]),
        warnings: Object.freeze([]),
      }),
    );

    expect(first.outcome).toBe("rendered");
    expect(second.outcome).toBe("rendered");
    if (first.outcome !== "rendered" || second.outcome !== "rendered") return;

    expect(first.artifact.bytes).toEqual(second.artifact.bytes);
    expect(first.artifact.byteLength).toBe(second.artifact.byteLength);
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(new TextDecoder().decode(first.artifact.bytes)).toContain('\n  "tokens": {\n    "color.alpha":');
  });

  it("rechaza envelopes no JSON-safe sin bytes parciales", () => {
    const serialized = serializeResolvedTokensV1({
      formatVersion: "1.0.0",
      source: { path: "design-system/tokens/base.tokens.json", hash: "b".repeat(64) },
      tokens: {
        broken: {
          value: Number.NaN as unknown as never,
          aliasOf: null,
          type: "number",
          category: null,
          foundationLevel: "unclassified",
          description: null,
        },
      },
    });

    expect(serialized).toEqual({
      ok: false,
      error: {
        code: "resolved-token-value-invalid",
        tokenPath: "broken",
        message: "Valor JSON no soportado en broken: number no finito.",
      },
    });
  });
});
