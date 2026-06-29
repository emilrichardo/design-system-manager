// T055 (006) — Mapper puro desde `NormalizedTokenSet` al contrato público `ResolvedTokensV1`. Reutiliza
// exclusivamente la proyección normalizada cerrada en B: no recalcula aliases, tipos, categorías ni
// foundations. El contrato público es independiente y no expone `undefined`, trust, sourceValue,
// aliasChain, compatibility ni datos internos del snapshot.
import type { NormalizedTokenSet } from "../../domain/build-export/normalized-token.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type { FoundationLevel } from "../../domain/foundations/foundation-level.js";

export const RESOLVED_TOKENS_FORMAT_VERSION = "1.0.0" as const;

export type ResolvedTokenValue =
  | string
  | number
  | boolean
  | null
  | readonly ResolvedTokenValue[]
  | { readonly [key: string]: ResolvedTokenValue };

export interface ResolvedTokenV1 {
  readonly value: ResolvedTokenValue;
  readonly aliasOf: string | null;
  readonly type: string;
  readonly category: FoundationCategoryId | null;
  readonly foundationLevel: FoundationLevel;
  readonly description: string | null;
}

export interface ResolvedTokensV1 {
  readonly formatVersion: typeof RESOLVED_TOKENS_FORMAT_VERSION;
  readonly source: {
    readonly path: string;
    readonly hash: string;
  };
  readonly tokens: Readonly<Record<string, ResolvedTokenV1>>;
}

export interface ResolvedTokensMapperError {
  readonly code: "resolved-token-value-invalid";
  readonly tokenPath: string | null;
  readonly message: string;
}

export type ResolvedTokensMapperResult =
  | { readonly ok: true; readonly envelope: ResolvedTokensV1 }
  | { readonly ok: false; readonly error: ResolvedTokensMapperError };

type CloneResolvedTokenValueResult =
  | { readonly ok: true; readonly value: ResolvedTokenValue }
  | { readonly ok: false; readonly error: ResolvedTokensMapperError };

function invalidValue(tokenPath: string, detail: string): CloneResolvedTokenValueResult {
  return {
    ok: false,
    error: {
      code: "resolved-token-value-invalid",
      tokenPath,
      message: `Valor JSON no soportado en ${tokenPath}: ${detail}.`,
    },
  };
}

function isPlainRecord(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneResolvedTokenValue(
  value: unknown,
  tokenPath: string,
  seen: Set<object> = new Set(),
): CloneResolvedTokenValueResult {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return { ok: true, value };
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? { ok: true, value } : invalidValue(tokenPath, "number no finito");
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return invalidValue(tokenPath, "array cíclico");
    seen.add(value);
    const copy: ResolvedTokenValue[] = [];
    for (const entry of value) {
      const cloned = cloneResolvedTokenValue(entry, tokenPath, seen);
      if (!cloned.ok) {
        seen.delete(value);
        return cloned;
      }
      copy.push(cloned.value);
    }
    seen.delete(value);
    return { ok: true, value: Object.freeze(copy) };
  }
  if (typeof value === "object") {
    if (!isPlainRecord(value)) return invalidValue(tokenPath, "instancia no JSON-safe");
    if (Object.getOwnPropertySymbols(value).length > 0) return invalidValue(tokenPath, "symbols no soportados");
    if (seen.has(value)) return invalidValue(tokenPath, "objeto cíclico");
    seen.add(value);
    const copy: Record<string, ResolvedTokenValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      const cloned = cloneResolvedTokenValue(entry, tokenPath, seen);
      if (!cloned.ok) {
        seen.delete(value);
        return cloned;
      }
      copy[key] = cloned.value;
    }
    seen.delete(value);
    return { ok: true, value: Object.freeze(copy) };
  }
  return invalidValue(tokenPath, `tipo ${typeof value} no soportado`);
}

export function mapResolvedTokensV1(set: NormalizedTokenSet): ResolvedTokensMapperResult {
  const tokens: Record<string, ResolvedTokenV1> = {};

  for (const token of set.tokens) {
    const clonedValue = cloneResolvedTokenValue(token.resolvedValue, token.path);
    if (!clonedValue.ok) {
      return clonedValue;
    }
    tokens[token.path] = Object.freeze({
      value: clonedValue.value,
      aliasOf: token.aliasOf,
      type: token.effectiveType,
      category: token.category as FoundationCategoryId | null,
      foundationLevel: token.foundationLevel as FoundationLevel,
      description: token.description,
    });
  }

  return {
    ok: true,
    envelope: Object.freeze({
      formatVersion: RESOLVED_TOKENS_FORMAT_VERSION,
      source: Object.freeze({
        path: set.source.logicalPath,
        hash: set.source.sourceHash,
      }),
      tokens: Object.freeze(tokens),
    }),
  };
}
