// T002 (006) — Artefacto de build y su metadata pública. Dominio puro e inmutable. Los bytes se copian
// defensivamente; los paths son lógicos (relativos, sin separadores en v1) y nunca absolutos. Sin
// timestamps, cwd, hostname, streams ni handles de filesystem.
import type { BuildFormat } from "./build-format.js";

/** Artefacto renderizado con sus bytes exactos (consumido por manifest/writer/export). */
export interface BuildArtifact {
  readonly format: BuildFormat;
  /** Path relativo bajo `design-system/build/` (sin separadores en v1). */
  readonly relativePath: string;
  readonly contentType: string;
  /** Bytes UTF-8 exactos a escribir/emitir (copia defensiva, readonly). */
  readonly bytes: Uint8Array;
  /** SHA-256 hex en minúsculas de `bytes`. */
  readonly contentHash: string;
  /** Longitud en bytes (coherente con `bytes.length`). */
  readonly byteLength: number;
}

/** Igual que `BuildArtifact` pero sin `bytes` (para results, manifest y reportes públicos). */
export interface BuildArtifactMetadata {
  readonly format: BuildFormat;
  readonly relativePath: string;
  readonly contentType: string;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface BuildArtifactInput {
  readonly format: BuildFormat;
  readonly relativePath: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
  readonly contentHash: string;
}

/** Construye un `BuildArtifact` con copia defensiva de bytes y `byteLength` coherente. */
export function createBuildArtifact(input: BuildArtifactInput): BuildArtifact {
  const copy = Uint8Array.from(input.bytes);
  return Object.freeze({
    format: input.format,
    relativePath: input.relativePath,
    contentType: input.contentType,
    bytes: copy,
    contentHash: input.contentHash,
    byteLength: copy.byteLength,
  });
}

/** Proyecta la metadata pública (sin bytes) de un artefacto. */
export function artifactMetadata(artifact: BuildArtifact): BuildArtifactMetadata {
  return Object.freeze({
    format: artifact.format,
    relativePath: artifact.relativePath,
    contentType: artifact.contentType,
    contentHash: artifact.contentHash,
    byteLength: artifact.byteLength,
  });
}
