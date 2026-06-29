// Helper compartido para los tests de tipo del renderer CSS. NO es un test; provee builders de
// `NormalizedTokenSet` mínimos con un único token para ejercitar cada serializer en aislamiento.
import type { BuildFormat } from "../../../src/domain/build-export/build-format.js";
import type { FormatCompatibility, NormalizedBuildToken, NormalizedTokenSet } from "../../../src/domain/build-export/normalized-token.js";
import type { FoundationCategoryId } from "../../../src/domain/foundations/foundation-category.js";

function compat(): readonly FormatCompatibility[] {
  return (["css", "json", "typescript"] as BuildFormat[]).map((format) => ({ format, representable: true, reason: null }));
}

export function tokenOf(options: {
  readonly path: string;
  readonly effectiveType: string;
  readonly value: unknown;
  readonly category?: FoundationCategoryId | null;
  readonly aliasOf?: string | null;
  readonly aliasChain?: readonly string[];
  readonly order?: number;
}): NormalizedBuildToken {
  const segments = options.path.split(".");
  return Object.freeze({
    path: options.path,
    segments: Object.freeze(segments),
    category: options.category ?? null,
    foundationLevel: "unclassified",
    effectiveType: options.effectiveType,
    sourceValue: options.value,
    resolvedValue: options.value,
    aliasOf: options.aliasOf ?? null,
    aliasChain: Object.freeze([...(options.aliasChain ?? [])]),
    description: null,
    trust: "valid",
    order: options.order ?? 0,
    compatibility: Object.freeze(compat()),
  });
}

export function setOf(tokens: readonly NormalizedBuildToken[]): NormalizedTokenSet {
  return Object.freeze({
    source: Object.freeze({ logicalPath: "design-system/tokens/base.tokens.json", sourceHash: "0".repeat(64) }),
    tokens: Object.freeze(tokens),
    byPath: new Map(tokens.map((t) => [t.path, t])),
    warnings: Object.freeze([]),
  });
}
