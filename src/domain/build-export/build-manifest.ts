// T068 (006) — Build manifest (`design-system/build/manifest.json`, `BuildManifestV1`). Es el manifest
// DE BUILD y autoridad de ownership; NO es el Design System host manifest
// (`design-system/design-system.json`), que pertenece a `init` y no se toca aquí. Dominio puro: solo
// tipos, constantes, validación y helpers; sin filesystem, sin timestamps/cwd/hostname/rutas absolutas.
import { BUILD_FORMATS, artifactFilename, isBuildFormat, type BuildFormat } from "./build-format.js";

/** Versión del contrato del build manifest. */
export const BUILD_MANIFEST_FORMAT_VERSION = "1.0.0";
/** Filename relativo del build manifest dentro del output root (no es un artifact listado). */
export const BUILD_MANIFEST_FILENAME = "manifest.json";
/** Raíz lógica de salida. */
export const BUILD_OUTPUT_ROOT = "design-system/build";
/** Path lógico de la fuente de tokens (no el host manifest). */
export const BUILD_SOURCE_LOGICAL_PATH = "design-system/tokens/base.tokens.json";

/** Entrada de artifact en el build manifest. */
export interface BuildManifestArtifactV1 {
  readonly format: BuildFormat;
  readonly relativePath: string;
  readonly contentHash: string;
  readonly byteLength: number;
}

/** Build manifest v1. `formatVersion` es la primera clave; `artifacts` en orden css/json/typescript. */
export interface BuildManifestV1 {
  readonly formatVersion: typeof BUILD_MANIFEST_FORMAT_VERSION;
  readonly source: string;
  readonly sourceHash: string;
  readonly artifacts: readonly BuildManifestArtifactV1[];
}

/** SHA-256 hex en minúsculas (64 chars `[0-9a-f]`). */
export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/** Path lógico relativo seguro: no vacío, sin absolute/drive/UNC, sin traversal ni separador inseguro. */
export function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("/") || value.startsWith("\\")) return false; // absolute / UNC
  if (/^[A-Za-z]:/.test(value)) return false; // drive letter
  if (value.includes("\\")) return false; // backslash separators
  const segments = value.split("/");
  return segments.every((s) => s.length > 0 && s !== "." && s !== "..");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const ARTIFACT_KEYS = ["format", "relativePath", "contentHash", "byteLength"] as const;
const ROOT_KEYS = ["formatVersion", "source", "sourceHash", "artifacts"] as const;

export type BuildManifestValidation =
  | { readonly ok: true; readonly manifest: BuildManifestV1 }
  | { readonly ok: false; readonly reason: string };

function invalid(reason: string): BuildManifestValidation {
  return { ok: false, reason };
}

/**
 * Valida una estructura ya parseada como `BuildManifestV1` confiable. Rechaza versión no soportada,
 * shape inválida, claves extra (prototype pollution incluida), hashes inválidos, byteLength inválido,
 * paths inseguros, formatos desconocidos, filenames no contractuales, duplicados y self-entry.
 */
export function validateBuildManifestV1(candidate: unknown): BuildManifestValidation {
  if (!isPlainRecord(candidate)) return invalid("manifest no es un objeto plano");
  for (const key of Object.keys(candidate)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) return invalid(`clave raíz desconocida: ${key}`);
  }
  if (candidate.formatVersion !== BUILD_MANIFEST_FORMAT_VERSION) return invalid("formatVersion no soportada");
  if (!isSafeRelativePath(candidate.source)) return invalid("source no es un path relativo seguro");
  if (!isSha256Hex(candidate.sourceHash)) return invalid("sourceHash inválido");
  if (!Array.isArray(candidate.artifacts)) return invalid("artifacts no es un array");

  const seenFormats = new Set<BuildFormat>();
  const seenPaths = new Set<string>();
  const artifacts: BuildManifestArtifactV1[] = [];

  for (const entry of candidate.artifacts) {
    if (!isPlainRecord(entry)) return invalid("artifact no es un objeto plano");
    for (const key of Object.keys(entry)) {
      if (!(ARTIFACT_KEYS as readonly string[]).includes(key)) return invalid(`clave de artifact desconocida: ${key}`);
    }
    if (!isBuildFormat(entry.format)) return invalid("formato de artifact desconocido");
    const format = entry.format;
    if (typeof entry.relativePath !== "string" || entry.relativePath !== artifactFilename(format)) {
      return invalid("relativePath de artifact no contractual");
    }
    if (!isSafeRelativePath(entry.relativePath)) return invalid("relativePath de artifact inseguro");
    if (entry.relativePath === BUILD_MANIFEST_FILENAME) return invalid("self-entry del manifest no permitido");
    if (!isSha256Hex(entry.contentHash)) return invalid("contentHash de artifact inválido");
    if (typeof entry.byteLength !== "number" || !Number.isInteger(entry.byteLength) || entry.byteLength < 0) {
      return invalid("byteLength de artifact inválido");
    }
    if (seenFormats.has(format)) return invalid("formato de artifact duplicado");
    if (seenPaths.has(entry.relativePath)) return invalid("relativePath de artifact duplicado");
    seenFormats.add(format);
    seenPaths.add(entry.relativePath);
    artifacts.push({ format, relativePath: entry.relativePath, contentHash: entry.contentHash, byteLength: entry.byteLength });
  }

  for (const format of BUILD_FORMATS) {
    if (!seenFormats.has(format)) return invalid(`falta el artifact de formato ${format}`);
  }

  // Orden canónico css/json/typescript (defensivo).
  const ordered = [...artifacts].sort((a, b) => BUILD_FORMATS.indexOf(a.format) - BUILD_FORMATS.indexOf(b.format));
  return {
    ok: true,
    manifest: Object.freeze({
      formatVersion: BUILD_MANIFEST_FORMAT_VERSION,
      source: candidate.source,
      sourceHash: candidate.sourceHash,
      artifacts: Object.freeze(ordered.map((a) => Object.freeze(a))),
    }),
  };
}
