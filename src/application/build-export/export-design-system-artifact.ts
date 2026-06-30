// T092 (006) — Caso de uso headless `export <format>`. Flujo: resolve/lectura semántica → proyección →
// UN renderer → bytes. READ-ONLY estricto: nunca manifest/ownership/writer/staging/backup/reread/mtime;
// no escribe filesystem. Capa de aplicación: todo por puertos inyectados.
import type { BuildFormat } from "../../domain/build-export/build-format.js";
import type { ExportResult } from "../../domain/build-export/build-result.js";
import type { AnalyzedSourceSnapshot, ArtifactRenderer, SourceSnapshotReader } from "./build-ports.js";
import type { BuildProjectionResult } from "./create-build-projection.js";

export interface ExportDesignSystemArtifactDependencies {
  readonly snapshotReader: SourceSnapshotReader;
  readonly createProjection: (snapshot: AnalyzedSourceSnapshot) => BuildProjectionResult;
  /** Devuelve el ÚNICO renderer para el formato solicitado. */
  readonly rendererFor: (format: BuildFormat) => ArtifactRenderer;
}

export interface ExportInput {
  readonly executionDir: string;
  readonly format: BuildFormat;
}

export async function exportDesignSystemArtifact(input: ExportInput, deps: ExportDesignSystemArtifactDependencies): Promise<ExportResult> {
  const snapshotResult = await deps.snapshotReader.read({ executionDir: input.executionDir });
  if (snapshotResult.outcome !== "ready") {
    return Object.freeze({ outcome: snapshotResult.outcome, format: input.format, source: null, error: { code: snapshotResult.outcome, message: snapshotResult.reason, path: null, details: null } });
  }
  const snapshot = snapshotResult.snapshot;
  const sourceRef = { logicalPath: snapshot.logicalSourcePath, hash: snapshot.sourceHash };

  const projection = deps.createProjection(snapshot);
  if (!projection.ok) {
    return Object.freeze({ outcome: "invalid-design-system", format: input.format, source: sourceRef, error: { code: projection.error.code, message: projection.error.message, path: projection.error.path, details: null } });
  }

  const renderer = deps.rendererFor(input.format);
  const rendered = renderer.render(projection.set);
  if (rendered.outcome !== "rendered") {
    const first = rendered.errors[0];
    return Object.freeze({
      outcome: "unsupported-value",
      format: input.format,
      source: sourceRef,
      error: first ? { code: first.code, message: first.message, path: first.tokenPath, details: first.type === null ? null : { type: first.type } } : { code: "unsupported-value", message: "Renderer no soportado.", path: null, details: null },
    });
  }

  const artifact = rendered.artifact;
  return Object.freeze({
    outcome: "exported",
    format: artifact.format,
    logicalFilename: artifact.relativePath,
    contentType: artifact.contentType,
    bytes: artifact.bytes,
    contentHash: artifact.contentHash,
    byteLength: artifact.byteLength,
  });
}
