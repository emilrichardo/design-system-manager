// T091 (006) — Caso de uso headless `build`. Orquesta: resolve/lectura semántica → proyección → render
// de los 3 formatos en memoria → manifest → ownership → (writer cuando se permite). All-or-nothing: un
// renderer no soportado retorna `unsupported-value` con `wrote:false` SIN invocar manifest/ownership/
// writer. Capa de aplicación: sin filesystem/Commander/stdout; todo por puertos inyectados.
import { artifactMetadata, type BuildArtifact, type BuildArtifactMetadata } from "../../domain/build-export/artifact.js";
import {
  BUILD_MANIFEST_FILENAME,
  BUILD_OUTPUT_ROOT,
  validateBuildManifestV1,
  type BuildManifestV1,
} from "../../domain/build-export/build-manifest.js";
import { ownershipAllowsPublish, type BuildConflict, type BuildOwnership } from "../../domain/build-export/build-outcome.js";
import type { BuildResult } from "../../domain/build-export/build-result.js";
import type { AnalyzedSourceSnapshot, ArtifactRenderer, ArtifactSetWriter, BuildOutputInspection, BuildOutputInspector, SourceSnapshotReader } from "./build-ports.js";
import type { BuildProjectionResult } from "./create-build-projection.js";
import type { ManifestBuilderInput, ManifestBuilderResult } from "./manifest-builder.js";
import type { OwnershipInput } from "./ownership.js";

export interface BuildDesignSystemDependencies {
  readonly snapshotReader: SourceSnapshotReader;
  readonly createProjection: (snapshot: AnalyzedSourceSnapshot) => BuildProjectionResult;
  /** Renderers en orden canónico css/json/typescript. */
  readonly renderers: readonly ArtifactRenderer[];
  readonly buildManifest: (input: ManifestBuilderInput) => ManifestBuilderResult;
  readonly serializeManifest: (manifest: BuildManifestV1) => Uint8Array;
  readonly hashBytes: (bytes: Uint8Array) => string;
  readonly outputInspector: BuildOutputInspector;
  readonly classifyOwnership: (input: OwnershipInput) => BuildOwnership;
  readonly writer: ArtifactSetWriter;
}

const EMPTY: Omit<BuildResult, "outcome" | "wrote"> = {
  source: null,
  outputDirectory: null,
  outputAvailable: null,
  artifacts: [],
  manifest: null,
  verification: null,
  backupRelativePath: null,
  recoveryRequired: false,
  conflict: null,
  error: null,
};

function result(outcome: BuildResult["outcome"], wrote: boolean, extra: Partial<BuildResult> = {}): BuildResult {
  return Object.freeze({ ...EMPTY, outcome, wrote, ...extra });
}

function toSafeError(error: { readonly code: string; readonly message: string } | null): BuildResult["error"] {
  return error === null ? null : { code: error.code, message: error.message, path: null, details: null };
}

/** ¿Los artifacts recién renderizados coinciden con un manifest previo confiable? */
function isUnchanged(inspection: BuildOutputInspection, sourceHash: string, artifacts: readonly BuildArtifact[]): boolean {
  if (inspection.previousManifest.state !== "parsed") return false;
  const validation = validateBuildManifestV1(inspection.previousManifest.value);
  if (!validation.ok) return false;
  if (validation.manifest.sourceHash !== sourceHash) return false;
  const declared = new Map(validation.manifest.artifacts.map((a) => [a.relativePath, a]));
  if (declared.size !== artifacts.length) return false;
  return artifacts.every((a) => {
    const d = declared.get(a.relativePath);
    return d !== undefined && d.contentHash === a.contentHash && d.byteLength === a.byteLength;
  });
}

export async function buildDesignSystem(input: { readonly executionDir: string }, deps: BuildDesignSystemDependencies): Promise<BuildResult> {
  const snapshotResult = await deps.snapshotReader.read(input);
  if (snapshotResult.outcome !== "ready") {
    return result(snapshotResult.outcome, false, { error: { code: snapshotResult.outcome, message: snapshotResult.reason, path: null, details: null } });
  }
  const snapshot = snapshotResult.snapshot;
  const sourceRef = { logicalPath: snapshot.logicalSourcePath, hash: snapshot.sourceHash };

  const projection = deps.createProjection(snapshot);
  if (!projection.ok) {
    return result("invalid-design-system", false, { source: sourceRef, error: { code: projection.error.code, message: projection.error.message, path: projection.error.path, details: null } });
  }

  // Render de los 3 formatos en memoria (fail-fast); sin manifest/ownership/writer si falla alguno.
  const artifacts: BuildArtifact[] = [];
  for (const renderer of deps.renderers) {
    const rendered = renderer.render(projection.set);
    if (rendered.outcome !== "rendered") {
      const first = rendered.errors[0];
      return result("unsupported-value", false, {
        source: sourceRef,
        error: first ? { code: first.code, message: first.message, path: first.tokenPath, details: first.type === null ? null : { type: first.type } } : { code: "unsupported-value", message: "Renderer no soportado.", path: null, details: null },
      });
    }
    artifacts.push(rendered.artifact);
  }

  // Manifest solo tras los 3 artifacts.
  const manifestResult = deps.buildManifest({ source: snapshot.logicalSourcePath, sourceHash: snapshot.sourceHash, artifacts });
  if (!manifestResult.ok) {
    // Inconsistencia inesperada sobre artifacts contractuales: se propaga al adapter (internal-error en H/L).
    throw new Error(`build manifest builder failed: ${manifestResult.error.code}`);
  }
  const manifestBytes = deps.serializeManifest(manifestResult.manifest);
  const manifestHash = deps.hashBytes(manifestBytes);
  const manifestSummary = { relativePath: BUILD_MANIFEST_FILENAME, contentHash: manifestHash, byteLength: manifestBytes.length };
  const metadata: readonly BuildArtifactMetadata[] = artifacts.map(artifactMetadata);

  // Ownership (autoridad: build manifest previo).
  const inspection = await deps.outputInspector.inspect();
  const ownership = deps.classifyOwnership({ previousManifest: inspection.previousManifest, artifactNodes: inspection.artifactNodes });
  if (!ownershipAllowsPublish(ownership.state)) {
    const primary: BuildConflict | null = ownership.conflicts[0] ?? null;
    return result("conflict", false, { source: sourceRef, outputDirectory: BUILD_OUTPUT_ROOT, outputAvailable: true, artifacts: metadata, manifest: manifestSummary, conflict: primary });
  }

  if (ownership.state === "trusted" && isUnchanged(inspection, snapshot.sourceHash, artifacts)) {
    return result("unchanged", false, { source: sourceRef, outputDirectory: BUILD_OUTPUT_ROOT, outputAvailable: true, artifacts: metadata, manifest: manifestSummary });
  }

  // Publicación del conjunto completo mediante el writer port.
  const writeResult = await deps.writer.write({
    outputRoot: BUILD_OUTPUT_ROOT,
    artifacts,
    manifest: { relativePath: BUILD_MANIFEST_FILENAME, bytes: manifestBytes, contentHash: manifestHash, byteLength: manifestBytes.length },
    strategy: "candidate-directory-set-v1",
    expectedHashes: {
      source: snapshot.sourceHash,
      artifacts: Object.fromEntries(artifacts.map((a) => [a.relativePath, a.contentHash])),
      buildManifest: manifestHash,
    },
  });

  const base: Partial<BuildResult> = {
    source: sourceRef,
    outputDirectory: BUILD_OUTPUT_ROOT,
    outputAvailable: writeResult.outputAvailable,
    artifacts: metadata,
    manifest: manifestSummary,
    verification: writeResult.verification,
    backupRelativePath: writeResult.backupRelativePath,
    recoveryRequired: writeResult.recoveryRequired,
  };

  switch (writeResult.outcome) {
    case "published":
      return result("built", true, base);
    case "unchanged":
      return result("unchanged", false, base);
    case "conflict":
    case "unsafe-target":
      return result("conflict", false, { ...base, conflict: writeResult.conflicts[0] ?? null });
    case "write-error":
      return result("write-error", false, { ...base, error: toSafeError(writeResult.error) });
    case "verification-error":
      return result("verification-error", true, { ...base, error: toSafeError(writeResult.error) });
    default: {
      const _exhaustive: never = writeResult.outcome;
      throw new Error(`writer outcome no soportado: ${String(_exhaustive)}`);
    }
  }
}
