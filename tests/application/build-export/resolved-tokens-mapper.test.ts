import { describe, expect, it } from "vitest";
import { mapResolvedTokensV1, RESOLVED_TOKENS_FORMAT_VERSION } from "../../../src/application/build-export/resolved-tokens-mapper.js";
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
  readonly resolvedValue: unknown;
  readonly sourceValue?: unknown;
  readonly category?: FoundationCategoryId | null;
  readonly foundationLevel?: FoundationLevel;
  readonly aliasOf?: string | null;
  readonly aliasChain?: readonly string[];
  readonly description?: string | null;
  readonly order?: number;
}): NormalizedBuildToken {
  return Object.freeze({
    path: options.path,
    segments: Object.freeze(options.path.split(".")),
    category: options.category ?? null,
    foundationLevel: options.foundationLevel ?? "unclassified",
    effectiveType: options.effectiveType,
    sourceValue: options.sourceValue ?? options.resolvedValue,
    resolvedValue: options.resolvedValue,
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
      sourceHash: "a".repeat(64),
    }),
    tokens: Object.freeze(tokens),
    byPath: new Map(tokens.map((token) => [token.path, token])),
    warnings: Object.freeze([]),
  });
}

describe("mapResolvedTokensV1 (T055)", () => {
  it("mapea un flat record con source lógico, valor resuelto y alias inmediato", () => {
    const baseColor = { colorSpace: "srgb", components: [0.96, 0.96, 0.96], alpha: 1, hex: "#f5f5f5" };
    const result = mapResolvedTokensV1(
      setOf([
        tokenOf({
          path: "color.gray.100",
          effectiveType: "color",
          resolvedValue: baseColor,
          category: "color",
          foundationLevel: "primitive",
          description: null,
          order: 0,
        }),
        tokenOf({
          path: "color.alias.direct",
          effectiveType: "color",
          resolvedValue: baseColor,
          sourceValue: "{color.gray.100}",
          aliasOf: "color.gray.100",
          aliasChain: ["color.gray.100"],
          category: "color",
          foundationLevel: "semantic",
          description: "Alias directo",
          order: 1,
        }),
        tokenOf({
          path: "color.alias.chain",
          effectiveType: "color",
          resolvedValue: baseColor,
          sourceValue: "{color.alias.direct}",
          aliasOf: "color.alias.direct",
          aliasChain: ["color.alias.direct", "color.gray.100"],
          category: "color",
          foundationLevel: "semantic",
          description: "Alias en cadena",
          order: 2,
        }),
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.envelope.formatVersion).toBe(RESOLVED_TOKENS_FORMAT_VERSION);
    expect(result.envelope.source).toEqual({
      path: "design-system/tokens/base.tokens.json",
      hash: "a".repeat(64),
    });
    expect(Object.keys(result.envelope)).toEqual(["formatVersion", "source", "tokens"]);
    expect(Object.keys(result.envelope.tokens)).toEqual([
      "color.gray.100",
      "color.alias.direct",
      "color.alias.chain",
    ]);

    expect(result.envelope.tokens["color.gray.100"]).toEqual({
      value: baseColor,
      aliasOf: null,
      type: "color",
      category: "color",
      foundationLevel: "primitive",
      description: null,
    });
    expect(result.envelope.tokens["color.alias.chain"]).toEqual({
      value: baseColor,
      aliasOf: "color.alias.direct",
      type: "color",
      category: "color",
      foundationLevel: "semantic",
      description: "Alias en cadena",
    });
  });

  it("mantiene el orden contractual de propiedades y la null policy exacta", () => {
    const result = mapResolvedTokensV1(
      setOf([
        tokenOf({
          path: "misc.note",
          effectiveType: "string",
          resolvedValue: "hola",
          category: null,
          foundationLevel: "unclassified",
          description: null,
        }),
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.envelope.tokens["misc.note"])).toEqual([
      "value",
      "aliasOf",
      "type",
      "category",
      "foundationLevel",
      "description",
    ]);
    expect(result.envelope.tokens["misc.note"]).toEqual({
      value: "hola",
      aliasOf: null,
      type: "string",
      category: null,
      foundationLevel: "unclassified",
      description: null,
    });
    expect("undefined" in result.envelope.tokens["misc.note"]).toBe(false);
  });

  it("acepta strings, numbers, booleans, arrays, objetos, unicode y caracteres escapables", () => {
    const objectValue = {
      list: ["linea\nuno", "\"dos\"", "\\tres", "árbol"],
      nested: { enabled: true, count: 2, empty: null },
    };
    const result = mapResolvedTokensV1(
      setOf([
        tokenOf({ path: "string.token", effectiveType: "string", resolvedValue: "Línea \"uno\"\n\\dos" }),
        tokenOf({ path: "number.token", effectiveType: "number", resolvedValue: 0.875 }),
        tokenOf({ path: "boolean.token", effectiveType: "boolean", resolvedValue: false }),
        tokenOf({ path: "array.token", effectiveType: "shadow", resolvedValue: ["uno", 2, true, null] }),
        tokenOf({ path: "object.token", effectiveType: "typography", resolvedValue: objectValue }),
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.envelope.tokens["string.token"].value).toBe("Línea \"uno\"\n\\dos");
    expect(result.envelope.tokens["number.token"].value).toBe(0.875);
    expect(result.envelope.tokens["boolean.token"].value).toBe(false);
    expect(result.envelope.tokens["array.token"].value).toEqual(["uno", 2, true, null]);
    expect(result.envelope.tokens["object.token"].value).toEqual(objectValue);
    expect(result.envelope.tokens["object.token"].value).not.toBe(objectValue);
  });

  it("rechaza valores no JSON-safe con error tipado y sin envelope parcial", () => {
    const result = mapResolvedTokensV1(
      setOf([tokenOf({ path: "broken.number", effectiveType: "number", resolvedValue: Number.NaN })]),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "resolved-token-value-invalid",
        tokenPath: "broken.number",
        message: "Valor JSON no soportado en broken.number: number no finito.",
      },
    });
  });
});
