import type { BuildFormat } from "../../../src/domain/build-export/build-format.js";
import type { FormatCompatibility, NormalizedBuildToken, NormalizedTokenSet } from "../../../src/domain/build-export/normalized-token.js";
import type { FoundationCategoryId } from "../../../src/domain/foundations/foundation-category.js";
import type { FoundationLevel } from "../../../src/domain/foundations/foundation-level.js";

function compat(): readonly FormatCompatibility[] {
  return (["css", "json", "typescript"] as BuildFormat[]).map((format) => ({ format, representable: true, reason: null }));
}

export function tokenOf(options: {
  readonly path: string;
  readonly effectiveType: string;
  readonly value: unknown;
  readonly sourceValue?: unknown;
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
    sourceValue: options.sourceValue ?? options.value,
    resolvedValue: options.value,
    aliasOf: options.aliasOf ?? null,
    aliasChain: Object.freeze([...(options.aliasChain ?? [])]),
    description: options.description ?? null,
    trust: "valid",
    order: options.order ?? 0,
    compatibility: Object.freeze(compat()),
  });
}

export function setOf(tokens: readonly NormalizedBuildToken[], byPathOrder: readonly string[] = tokens.map((token) => token.path)): NormalizedTokenSet {
  const tokenByPath = new Map(tokens.map((token) => [token.path, token]));
  return Object.freeze({
    source: Object.freeze({ logicalPath: "design-system/tokens/base.tokens.json", sourceHash: "0".repeat(64) }),
    tokens: Object.freeze(tokens),
    byPath: new Map(byPathOrder.map((path) => [path, tokenByPath.get(path)!])),
    warnings: Object.freeze([]),
  });
}
