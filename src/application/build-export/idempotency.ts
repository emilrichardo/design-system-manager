// T136 (006) — Decisión de idempotencia (`unchanged`) ANTES de crear staging. No basta con el hash del
// build manifest: se compara el manifest previo (validado), el `sourceHash`, los hashes/byte lengths/paths
// de los artifacts candidatos contra los declarados, y la presencia + bytes reales en disco (ownership
// confiable). Pura: sin filesystem, sin renders, sin escritura. Si todo coincide, no se publica nada.
import { validateBuildManifestV1, type BuildManifestV1 } from "../../domain/build-export/build-manifest.js";
import type { BuildArtifactMetadata } from "../../domain/build-export/artifact.js";
import type { PreviousBuildManifestInput, RequiredPathNode } from "./ownership.js";

export interface IdempotencyInput {
  /** Lectura del build manifest previo (autoridad de ownership). */
  readonly previousManifest: PreviousBuildManifestInput;
  /** Estados en disco de los required paths (artifacts), sin seguir symlinks. */
  readonly artifactNodes: readonly RequiredPathNode[];
  /** El ownership clasificó el output como `trusted`. */
  readonly ownershipTrusted: boolean;
  /** Hash de la fuente recién analizada. */
  readonly sourceHash: string;
  /** Metadata de los artifacts recién renderizados (sin bytes). */
  readonly candidateArtifacts: readonly BuildArtifactMetadata[];
  readonly candidateBrandArtifact: {
    readonly status: "absent" | "generated";
    readonly relativePath: string | null;
    readonly contentHash: string | null;
    readonly byteLength: number | null;
  };
}

export interface IdempotencyDecision {
  readonly unchanged: boolean;
  /** Razón estable cuando NO es unchanged (para diagnóstico/tests); `null` si unchanged. */
  readonly reason: string | null;
}

function decided(reason: string): IdempotencyDecision {
  return { unchanged: false, reason };
}

/** Decide si una segunda ejecución es `unchanged` (no se debe publicar). */
export function decideUnchanged(input: IdempotencyInput): IdempotencyDecision {
  if (!input.ownershipTrusted) return decided("ownership-not-trusted");
  if (input.previousManifest.state !== "parsed") return decided("previous-manifest-absent");

  const validation = validateBuildManifestV1(input.previousManifest.value);
  if (!validation.ok) return decided("previous-manifest-invalid");
  const manifest: BuildManifestV1 = validation.manifest;

  if (manifest.sourceHash !== input.sourceHash) return decided("source-hash-changed");

  // Conjunto de artifacts declarado vs candidato: mismos paths, hashes y byte lengths.
  const declared = new Map(manifest.artifacts.map((a) => [a.relativePath, a]));
  if (declared.size !== input.candidateArtifacts.length) return decided("artifact-set-size-changed");
  for (const candidate of input.candidateArtifacts) {
    const d = declared.get(candidate.relativePath);
    if (d === undefined) return decided("artifact-path-changed");
    if (d.contentHash !== candidate.contentHash) return decided("artifact-hash-changed");
    if (d.byteLength !== candidate.byteLength) return decided("artifact-bytelength-changed");
  }

  // Presencia + bytes en disco: cada artifact declarado debe existir como file con hash/byte length iguales.
  const onDisk = new Map(input.artifactNodes.map((n) => [n.relativePath, n]));
  for (const declaredArtifact of manifest.artifacts) {
    const node = onDisk.get(declaredArtifact.relativePath);
    if (node === undefined || node.kind !== "file") return decided("artifact-not-present");
    if (node.contentHash !== declaredArtifact.contentHash) return decided("artifact-bytes-changed");
    if (node.byteLength !== declaredArtifact.byteLength) return decided("artifact-disk-bytelength-changed");
  }

  if (manifest.brand.status !== input.candidateBrandArtifact.status) return decided("brand-status-changed");
  if (manifest.brand.status === "generated") {
    const brandPath = manifest.brand.relativePath;
    if (brandPath === null) return decided("brand-manifest-changed");
    if (
      brandPath !== input.candidateBrandArtifact.relativePath ||
      manifest.brand.contentHash !== input.candidateBrandArtifact.contentHash ||
      manifest.brand.byteLength !== input.candidateBrandArtifact.byteLength
    ) {
      return decided("brand-manifest-changed");
    }
    const node = onDisk.get(brandPath);
    if (node === undefined || node.kind !== "file") return decided("brand-not-present");
    if (node.contentHash !== manifest.brand.contentHash) return decided("brand-bytes-changed");
    if (node.byteLength !== manifest.brand.byteLength) return decided("brand-disk-bytelength-changed");
  } else if (input.candidateBrandArtifact.status !== "absent") {
    return decided("brand-status-changed");
  }

  return { unchanged: true, reason: null };
}
