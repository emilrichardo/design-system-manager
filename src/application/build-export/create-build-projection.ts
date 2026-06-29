// T016/T018/T019 (006) — Proyección normalizada pura desde el AnalyzedSourceSnapshot. Reutiliza la
// ResolvedTokenView (alias/valores/tipos del análisis único) y UNA proyección de foundations
// (category/foundationLevel) — no recalcula nada. Excluye grupos (la ResolvedTokenView ya solo contiene
// tokens) y RECHAZA de forma tipada todo nodo no publicable: all-or-nothing, sin conjunto parcial.
// Copias defensivas + congelamiento: el output es inmune a mutaciones posteriores del input. Capa de
// aplicación: pura, sin filesystem ni infraestructura.
import { ANALYSIS_LIMITS } from "../../domain/traversal/limits.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type { FoundationLevel } from "../../domain/foundations/foundation-level.js";
import { compareCanonical } from "../../domain/build-export/build-token-order.js";
import type { NormalizedBuildToken, NormalizedTokenSet } from "../../domain/build-export/normalized-token.js";
import type { FoundationTokenInspection } from "../foundations/foundations-ports.js";
import type { AnalyzedSourceSnapshot, ResolvedTokenRecord } from "./build-ports.js";
import { computeFormatCompatibility } from "./compatibility.js";

export interface BuildProjectionError {
  readonly code:
    | "missing-source-projection"
    | "alias-missing"
    | "alias-cyclic"
    | "alias-to-group"
    | "alias-malformed"
    | "type-unresolved"
    | "trust-untrusted"
    | "duplicate-path"
    | "empty-path"
    | "value-not-json-safe"
    | "limit-tokens-exceeded"
    | "limit-depth-exceeded";
  readonly message: string;
  readonly path: string | null;
}

export type BuildProjectionResult =
  | { readonly ok: true; readonly set: NormalizedTokenSet }
  | { readonly ok: false; readonly error: BuildProjectionError };

function fail(code: BuildProjectionError["code"], message: string, path: string | null): BuildProjectionResult {
  return { ok: false, error: { code, message, path } };
}

/** Verifica que un valor sea JSON-safe (sin undefined/función/bigint/símbolo; números finitos). */
function isJsonSafe(value: unknown): boolean {
  if (value === null) return true;
  switch (typeof value) {
    case "boolean":
    case "string":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object": {
      if (Array.isArray(value)) return value.every(isJsonSafe);
      return Object.values(value as Record<string, unknown>).every(isJsonSafe);
    }
    default:
      return false; // undefined, function, bigint, symbol
  }
}

/** Clona profundamente un valor JSON-safe (copia defensiva). */
function cloneValue(value: unknown): unknown {
  return value === undefined ? null : structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

const ALIAS_REJECTION: Partial<Record<ResolvedTokenRecord["aliasState"], BuildProjectionError["code"]>> = {
  missing: "alias-missing",
  cyclic: "alias-cyclic",
  "to-group": "alias-to-group",
  malformed: "alias-malformed",
};

/** Indexa la inspección foundation por path (categorías + unresolved). */
function indexFoundationTokens(
  categories: readonly { readonly tokens: readonly FoundationTokenInspection[] }[],
  unresolved: readonly FoundationTokenInspection[],
): Map<string, FoundationTokenInspection> {
  const byPath = new Map<string, FoundationTokenInspection>();
  for (const category of categories) for (const token of category.tokens) byPath.set(token.path, token);
  for (const token of unresolved) byPath.set(token.path, token);
  return byPath;
}

/**
 * Construye `NormalizedTokenSet` desde el snapshot. Determinista: distinto insertion order produce el
 * mismo resultado (orden canónico). All-or-nothing: cualquier nodo no publicable produce un error
 * tipado y NINGÚN conjunto parcial.
 */
export function createBuildProjection(snapshot: AnalyzedSourceSnapshot): BuildProjectionResult {
  if (snapshot.foundationProjection === null) {
    return fail("missing-source-projection", "Falta la proyección de foundations del snapshot.", null);
  }

  const records = snapshot.resolvedTokenView.tokens;
  if (records.length > ANALYSIS_LIMITS.maxNodes) {
    return fail("limit-tokens-exceeded", `Demasiados tokens (> ${ANALYSIS_LIMITS.maxNodes}).`, null);
  }

  const foundationByPath = indexFoundationTokens(snapshot.foundationProjection.categories, snapshot.foundationProjection.unresolved);
  const descByPath = new Map<string, string | null>();
  for (const node of snapshot.analysis.nodes) descByPath.set(node.path, node.description);

  const seen = new Set<string>();
  const tokens: NormalizedBuildToken[] = [];

  for (const record of records) {
    const path = record.path;
    if (path.length === 0 || path.split(".").some((s) => s.length === 0)) {
      return fail("empty-path", "Path de token vacío o con segmento vacío.", path || null);
    }
    if (seen.has(path)) return fail("duplicate-path", `Path de token duplicado: ${path}.`, path);
    seen.add(path);

    const segments = path.split(".");
    if (segments.length > ANALYSIS_LIMITS.maxDepth) {
      return fail("limit-depth-exceeded", `Profundidad de path excedida (> ${ANALYSIS_LIMITS.maxDepth}).`, path);
    }

    const aliasReject = ALIAS_REJECTION[record.aliasState];
    if (aliasReject !== undefined) {
      return fail(aliasReject, `Alias no publicable (${record.aliasState}) en ${path}.`, path);
    }
    if (record.trust === "untrusted") {
      return fail("trust-untrusted", `Token no confiable en ${path}.`, path);
    }
    if (record.effectiveType === null) {
      return fail("type-unresolved", `Tipo efectivo no resuelto en ${path}.`, path);
    }
    if (!isJsonSafe(record.declaredValue) || !isJsonSafe(record.resolvedValue)) {
      return fail("value-not-json-safe", `Valor no JSON-safe en ${path}.`, path);
    }

    const foundation = foundationByPath.get(path);
    const category: FoundationCategoryId | null =
      foundation && foundation.category !== "unresolved" ? foundation.category : null;
    const foundationLevel: FoundationLevel = foundation ? foundation.level : "unclassified";

    tokens.push({
      path,
      segments: Object.freeze([...segments]),
      category,
      foundationLevel,
      effectiveType: record.effectiveType,
      sourceValue: deepFreeze(cloneValue(record.declaredValue)),
      resolvedValue: deepFreeze(cloneValue(record.resolvedValue)),
      aliasOf: record.immediateAliasTarget,
      aliasChain: Object.freeze([...record.aliasChain]),
      description: descByPath.get(path) ?? null,
      trust: record.trust,
      order: -1, // asignado tras ordenar
      compatibility: Object.freeze(computeFormatCompatibility()),
    });
  }

  // Orden canónico determinista (categoría → path); asigna el índice `order`.
  tokens.sort(compareCanonical);
  const ordered: NormalizedBuildToken[] = tokens.map((token, index) => Object.freeze({ ...token, order: index }));

  const byPath = new Map<string, NormalizedBuildToken>(ordered.map((t) => [t.path, t]));
  const set: NormalizedTokenSet = Object.freeze({
    source: Object.freeze({ logicalPath: snapshot.logicalSourcePath, sourceHash: snapshot.sourceHash }),
    tokens: Object.freeze(ordered),
    byPath,
    warnings: Object.freeze([]),
  });
  return { ok: true, set };
}
