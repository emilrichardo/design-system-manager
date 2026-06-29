// T056 (006) — Serializer/renderer puro del artefacto `tokens.resolved.json`. Consume solo
// `NormalizedTokenSet`, construye el contrato `ResolvedTokensV1`, serializa en UTF-8 determinista
// (2 espacios + LF final, sin BOM) y devuelve un `BuildArtifact`. No toca filesystem ni reporters.
import { createBuildArtifact, type BuildArtifact } from "../../domain/build-export/artifact.js";
import { BUILD_FORMATS, artifactContentType, artifactFilename, type BuildFormat } from "../../domain/build-export/build-format.js";
import { compareCanonical } from "../../domain/build-export/build-token-order.js";
import type { BuildManifestV1 } from "../../domain/build-export/build-manifest.js";
import type { NormalizedTokenSet } from "../../domain/build-export/normalized-token.js";
import {
  mapResolvedTokensV1,
  type ResolvedTokenV1,
  type ResolvedTokenValue,
  type ResolvedTokensV1,
} from "../../application/build-export/resolved-tokens-mapper.js";
import { sha256Hex } from "./hash.js";

export interface ResolvedTokensRenderError {
  readonly format: BuildFormat;
  readonly code: "resolved-token-value-invalid";
  readonly tokenPath: string | null;
  readonly message: string;
}

export type ResolvedTokensSerializerResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly error: Omit<ResolvedTokensRenderError, "format"> };

export type ResolvedTokensRenderResult =
  | { readonly outcome: "rendered"; readonly artifact: BuildArtifact }
  | { readonly outcome: "unsupported-value"; readonly errors: readonly ResolvedTokensRenderError[] };

type CloneResolvedTokenValueResult =
  | { readonly ok: true; readonly value: ResolvedTokenValue }
  | { readonly ok: false; readonly error: Omit<ResolvedTokensRenderError, "format"> };

function invalidValue(tokenPath: string | null, detail: string): CloneResolvedTokenValueResult {
  return {
    ok: false,
    error: {
      code: "resolved-token-value-invalid",
      tokenPath,
      message: tokenPath === null ? detail : `Valor JSON no soportado en ${tokenPath}: ${detail}.`,
    },
  };
}

function isPlainRecord(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneResolvedTokenValue(
  value: unknown,
  tokenPath: string | null,
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

function canonicalToken(
  token: ResolvedTokenV1,
  tokenPath: string,
):
  | { readonly ok: true; readonly token: ResolvedTokenV1 }
  | { readonly ok: false; readonly error: Omit<ResolvedTokensRenderError, "format"> } {
  const clonedValue = cloneResolvedTokenValue(token.value, tokenPath);
  if (!clonedValue.ok) return clonedValue;
  return {
    ok: true,
    token: {
      value: clonedValue.value,
      aliasOf: token.aliasOf,
      type: token.type,
      category: token.category,
      foundationLevel: token.foundationLevel,
      description: token.description,
    },
  };
}

export function serializeResolvedTokensV1(envelope: ResolvedTokensV1): ResolvedTokensSerializerResult {
  const canonicalTokens: Record<string, ResolvedTokenV1> = {};

  const tokenEntries = Object.entries(envelope.tokens).sort(([leftPath, left], [rightPath, right]) =>
    compareCanonical(
      { path: leftPath, category: left.category },
      { path: rightPath, category: right.category },
    ),
  );

  for (const [tokenPath, token] of tokenEntries) {
    const canonical = canonicalToken(token, tokenPath);
    if (!canonical.ok) {
      return canonical;
    }
    canonicalTokens[tokenPath] = Object.freeze(canonical.token);
  }

  const canonicalEnvelope: ResolvedTokensV1 = Object.freeze({
    formatVersion: envelope.formatVersion,
    source: Object.freeze({
      path: envelope.source.path,
      hash: envelope.source.hash,
    }),
    tokens: Object.freeze(canonicalTokens),
  });

  const text = `${JSON.stringify(canonicalEnvelope, null, 2)}\n`;
  return { ok: true, bytes: new TextEncoder().encode(text) };
}

export function renderResolvedTokensArtifact(set: NormalizedTokenSet): ResolvedTokensRenderResult {
  const mapped = mapResolvedTokensV1(set);
  if (!mapped.ok) {
    return {
      outcome: "unsupported-value",
      errors: Object.freeze([{ format: "json", ...mapped.error }]),
    };
  }

  const serialized = serializeResolvedTokensV1(mapped.envelope);
  if (!serialized.ok) {
    return {
      outcome: "unsupported-value",
      errors: Object.freeze([{ format: "json", ...serialized.error }]),
    };
  }

  return {
    outcome: "rendered",
    artifact: createBuildArtifact({
      format: "json",
      relativePath: artifactFilename("json"),
      contentType: artifactContentType("json"),
      bytes: serialized.bytes,
      contentHash: sha256Hex(serialized.bytes),
    }),
  };
}

// ── T070 (006) — Serializer determinista del build manifest (design-system/build/manifest.json) ──
// Construye explícitamente el orden de claves del contrato (formatVersion, source, sourceHash,
// artifacts) y de cada artifact (format, relativePath, contentHash, byteLength); reordena artifacts
// css/json/typescript de forma defensiva (no depende del insertion order); no muta el input.
export function serializeBuildManifestV1(manifest: BuildManifestV1): Uint8Array {
  const orderedArtifacts = [...manifest.artifacts]
    .sort((a, b) => BUILD_FORMATS.indexOf(a.format) - BUILD_FORMATS.indexOf(b.format))
    .map((artifact) => ({
      format: artifact.format,
      relativePath: artifact.relativePath,
      contentHash: artifact.contentHash,
      byteLength: artifact.byteLength,
    }));

  const document = {
    formatVersion: manifest.formatVersion,
    source: manifest.source,
    sourceHash: manifest.sourceHash,
    artifacts: orderedArtifacts,
  };

  const text = `${JSON.stringify(document, null, 2)}\n`;
  return new TextEncoder().encode(text);
}
