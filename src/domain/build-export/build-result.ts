// T091/T092 (006) — Resultados públicos de build/export. Dominio puro: outcomes semánticos sin exit
// codes, sin `Error`/stack, sin rutas absolutas. `internal-error` NO está aquí (vive en el adapter CLI).
import type { BuildArtifactMetadata } from "./artifact.js";
import type { BuildFormat } from "./build-format.js";
import type { BuildConflict, BuildOutcome, ExportOutcome, SafeBuildError } from "./build-outcome.js";
import type { BuildVerification } from "./verification.js";

/** Resumen público del build manifest (sin bytes). */
export interface BuildManifestSummary {
  readonly relativePath: string;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface BuildBrandArtifactSummary {
  readonly status: "absent" | "generated";
  readonly relativePath: string | null;
  readonly contentHash: string | null;
  readonly byteLength: number | null;
}

/** Identidad lógica de la fuente (sin ruta absoluta). */
export interface BuildSourceRef {
  readonly logicalPath: string;
  readonly hash: string;
}

/** Resultado de `build`, discriminado por `outcome` (campos comunes del data-model). */
export interface BuildResult {
  readonly outcome: BuildOutcome;
  readonly wrote: boolean;
  readonly source: BuildSourceRef | null;
  readonly outputDirectory: string | null;
  readonly outputAvailable: boolean | null;
  readonly artifacts: readonly BuildArtifactMetadata[];
  readonly manifest: BuildManifestSummary | null;
  readonly brandArtifact: BuildBrandArtifactSummary | null;
  readonly verification: BuildVerification | null;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
  readonly conflict: BuildConflict | null;
  readonly error: SafeBuildError | null;
}

/** Éxito de `export`: un solo artifact, bytes incluidos. */
export interface ExportSuccess {
  readonly outcome: "exported";
  readonly format: BuildFormat;
  readonly logicalFilename: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
  readonly contentHash: string;
  readonly byteLength: number;
}

/** Fallo de `export`: sin datos de write/manifest/output. */
export interface ExportFailure {
  readonly outcome: Exclude<ExportOutcome, "exported">;
  readonly format: BuildFormat | null;
  readonly source: BuildSourceRef | null;
  readonly error: SafeBuildError | null;
}

export type ExportResult = ExportSuccess | ExportFailure;
