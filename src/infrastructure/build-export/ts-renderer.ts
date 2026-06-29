// T061/T063/T064 (006) — Renderer puro de `tokens.ts`. Consume solo `NormalizedTokenSet`,
// emite bytes UTF-8 deterministas y valida literales sin filesystem, CLI ni ejecución de código.
import { createBuildArtifact, type BuildArtifact } from "../../domain/build-export/artifact.js";
import { artifactContentType, artifactFilename, type BuildFormat } from "../../domain/build-export/build-format.js";
import { compareCanonical } from "../../domain/build-export/build-token-order.js";
import type { NormalizedBuildToken, NormalizedTokenSet } from "../../domain/build-export/normalized-token.js";
import { sha256Hex } from "./hash.js";
import { serializeTypeScriptLiteral, type TypeScriptLiteralError } from "./ts-literal.js";

export interface TypeScriptRenderError {
  readonly format: BuildFormat;
  readonly code: TypeScriptLiteralError["code"];
  readonly tokenPath: string | null;
  readonly message: string;
}

export type TypeScriptRenderResult =
  | { readonly outcome: "rendered"; readonly artifact: BuildArtifact }
  | { readonly outcome: "unsupported-value"; readonly errors: readonly TypeScriptRenderError[] };

function renderError(error: TypeScriptLiteralError): TypeScriptRenderError {
  return Object.freeze({ format: "typescript", ...error });
}

function canonicalTokens(set: NormalizedTokenSet): NormalizedBuildToken[] {
  return [...set.tokens].sort((left, right) =>
    compareCanonical(
      { path: left.path, category: left.category },
      { path: right.path, category: right.category },
    ),
  );
}

function literal(value: unknown, tokenPath: string): string | TypeScriptRenderError {
  const serialized = serializeTypeScriptLiteral(value, tokenPath);
  return serialized.ok ? serialized.text : renderError(serialized.error);
}

function keyLiteral(key: string, tokenPath: string): string | TypeScriptRenderError {
  return literal(key, tokenPath);
}

function emitTokensRecord(tokens: readonly NormalizedBuildToken[]): string | TypeScriptRenderError {
  if (tokens.length === 0) return "{}";

  const lines: string[] = ["{"];
  for (const token of tokens) {
    const key = keyLiteral(token.path, token.path);
    if (typeof key !== "string") return key;
    const value = literal(token.resolvedValue, token.path);
    if (typeof value !== "string") return value;
    lines.push(`  ${key}: ${value},`);
  }
  lines.push("}");
  return lines.join("\n");
}

function emitMetadataRecord(tokens: readonly NormalizedBuildToken[]): string | TypeScriptRenderError {
  if (tokens.length === 0) return "{}";

  const lines: string[] = ["{"];
  for (const token of tokens) {
    const key = keyLiteral(token.path, token.path);
    if (typeof key !== "string") return key;
    const aliasOf = literal(token.aliasOf, token.path);
    const type = literal(token.effectiveType, token.path);
    const category = literal(token.category, token.path);
    const foundationLevel = literal(token.foundationLevel, token.path);
    const description = literal(token.description, token.path);
    for (const value of [aliasOf, type, category, foundationLevel, description]) {
      if (typeof value !== "string") return value;
    }

    lines.push(`  ${key}: {`);
    lines.push(`    aliasOf: ${aliasOf},`);
    lines.push(`    type: ${type},`);
    lines.push(`    category: ${category},`);
    lines.push(`    foundationLevel: ${foundationLevel},`);
    lines.push(`    description: ${description},`);
    lines.push("  },");
  }
  lines.push("}");
  return lines.join("\n");
}

function renderTypeScriptSource(tokens: readonly NormalizedBuildToken[]): string | TypeScriptRenderError {
  const tokenRecord = emitTokensRecord(tokens);
  if (typeof tokenRecord !== "string") return tokenRecord;
  const metadataRecord = emitMetadataRecord(tokens);
  if (typeof metadataRecord !== "string") return metadataRecord;

  return [
    `export const tokens = ${tokenRecord} as const;`,
    "",
    `export const tokenMetadata = ${metadataRecord} as const;`,
    "",
    "export type TokenPath = keyof typeof tokens;",
    "",
  ].join("\n");
}

export function renderTypeScriptTokensArtifact(set: NormalizedTokenSet): TypeScriptRenderResult {
  const source = renderTypeScriptSource(canonicalTokens(set));
  if (typeof source !== "string") {
    return { outcome: "unsupported-value", errors: Object.freeze([source]) };
  }

  const bytes = new TextEncoder().encode(source);
  return {
    outcome: "rendered",
    artifact: createBuildArtifact({
      format: "typescript",
      relativePath: artifactFilename("typescript"),
      contentType: artifactContentType("typescript"),
      bytes,
      contentHash: sha256Hex(bytes),
    }),
  };
}
