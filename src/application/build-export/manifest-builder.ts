// T069 (006) — Builder puro del build manifest desde artifacts + sourceHash. No lee ni escribe
// filesystem, no muta los artifacts, no agrega self-entry. Valida formatos requeridos/únicos, paths
// únicos y contractuales, hashes SHA-256 lowercase y `byteLength === bytes.length`. Errores internos
// tipados (los outcomes públicos llegan en el Checkpoint H).
import type { BuildArtifact } from "../../domain/build-export/artifact.js";
import { BUILD_FORMATS, artifactFilename, type BuildFormat } from "../../domain/build-export/build-format.js";
import {
  BUILD_BRAND_ARTIFACT_FILENAME,
  BUILD_MANIFEST_FORMAT_VERSION,
  isSafeRelativePath,
  isSha256Hex,
  type BuildBrandArtifactV1,
  type BuildManifestArtifactV1,
  type BuildManifestV1,
} from "../../domain/build-export/build-manifest.js";

export interface ManifestBuilderError {
  readonly code:
    | "artifact-missing"
    | "duplicate-format"
    | "duplicate-path"
    | "unknown-format"
    | "non-contractual-path"
    | "unsafe-path"
    | "invalid-hash"
    | "invalid-byte-length"
    | "byte-length-mismatch"
    | "invalid-source";
  readonly message: string;
  readonly path: string | null;
}

export type ManifestBuilderResult =
  | { readonly ok: true; readonly manifest: BuildManifestV1 }
  | { readonly ok: false; readonly error: ManifestBuilderError };

function fail(code: ManifestBuilderError["code"], message: string, path: string | null): ManifestBuilderResult {
  return { ok: false, error: { code, message, path } };
}

export interface ManifestBuilderInput {
  readonly source: string;
  readonly sourceHash: string;
  readonly artifacts: readonly BuildArtifact[];
  readonly brandArtifact?: {
    readonly relativePath: string;
    readonly contentHash: string;
    readonly byteLength: number;
  } | null;
}

/** Ensambla un `BuildManifestV1` readonly y determinista (orden css/json/typescript). */
export function buildBuildManifest(input: ManifestBuilderInput): ManifestBuilderResult {
  if (!isSafeRelativePath(input.source)) return fail("invalid-source", "source no es un path relativo seguro.", null);
  if (!isSha256Hex(input.sourceHash)) return fail("invalid-hash", "sourceHash inválido.", null);

  const seenFormats = new Set<BuildFormat>();
  const seenPaths = new Set<string>();
  const entries: BuildManifestArtifactV1[] = [];

  for (const artifact of input.artifacts) {
    const { format, relativePath, contentHash, byteLength, bytes } = artifact;
    if (!BUILD_FORMATS.includes(format)) return fail("unknown-format", `Formato desconocido: ${String(format)}.`, relativePath);
    if (!isSafeRelativePath(relativePath)) return fail("unsafe-path", `Path inseguro: ${relativePath}.`, relativePath);
    if (relativePath !== artifactFilename(format)) return fail("non-contractual-path", `Path no contractual para ${format}: ${relativePath}.`, relativePath);
    if (!isSha256Hex(contentHash)) return fail("invalid-hash", `contentHash inválido en ${relativePath}.`, relativePath);
    if (!Number.isInteger(byteLength) || byteLength < 0) return fail("invalid-byte-length", `byteLength inválido en ${relativePath}.`, relativePath);
    if (byteLength !== bytes.length) return fail("byte-length-mismatch", `byteLength no coincide con bytes en ${relativePath}.`, relativePath);
    if (seenFormats.has(format)) return fail("duplicate-format", `Formato duplicado: ${format}.`, relativePath);
    if (seenPaths.has(relativePath)) return fail("duplicate-path", `Path duplicado: ${relativePath}.`, relativePath);
    seenFormats.add(format);
    seenPaths.add(relativePath);
    entries.push({ format, relativePath, contentHash, byteLength });
  }

  for (const format of BUILD_FORMATS) {
    if (!seenFormats.has(format)) return fail("artifact-missing", `Falta el artifact de formato ${format}.`, null);
  }

  let brand: BuildBrandArtifactV1 = {
    status: "absent",
    relativePath: null,
    contentHash: null,
    byteLength: null,
  };
  if (input.brandArtifact !== undefined && input.brandArtifact !== null) {
    if (input.brandArtifact.relativePath !== BUILD_BRAND_ARTIFACT_FILENAME) {
      return fail("non-contractual-path", `Path no contractual para brand artifact: ${input.brandArtifact.relativePath}.`, input.brandArtifact.relativePath);
    }
    if (!isSafeRelativePath(input.brandArtifact.relativePath)) {
      return fail("unsafe-path", `Path inseguro: ${input.brandArtifact.relativePath}.`, input.brandArtifact.relativePath);
    }
    if (!isSha256Hex(input.brandArtifact.contentHash)) {
      return fail("invalid-hash", `contentHash inválido en ${input.brandArtifact.relativePath}.`, input.brandArtifact.relativePath);
    }
    if (!Number.isInteger(input.brandArtifact.byteLength) || input.brandArtifact.byteLength < 0) {
      return fail("invalid-byte-length", `byteLength inválido en ${input.brandArtifact.relativePath}.`, input.brandArtifact.relativePath);
    }
    brand = {
      status: "generated",
      relativePath: BUILD_BRAND_ARTIFACT_FILENAME,
      contentHash: input.brandArtifact.contentHash,
      byteLength: input.brandArtifact.byteLength,
    };
  }

  const ordered = [...entries].sort((a, b) => BUILD_FORMATS.indexOf(a.format) - BUILD_FORMATS.indexOf(b.format));
  return {
    ok: true,
    manifest: Object.freeze({
      formatVersion: BUILD_MANIFEST_FORMAT_VERSION,
      source: input.source,
      sourceHash: input.sourceHash,
      artifacts: Object.freeze(ordered.map((entry) => Object.freeze(entry))),
      brand: Object.freeze(brand),
    }),
  };
}
