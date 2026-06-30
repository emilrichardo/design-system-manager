// T098 (006) — Contrato público `BuildJsonEnvelopeV1` y mapper explícito desde `BuildResult`. Capa de
// aplicación: solo tipos + transformación pura; sin filesystem/Commander/serialización. Independiente
// de 003/004/005 (sin cast). Sin bytes de artifact, sin rutas absolutas, sin `Error`/stack/env. Orden
// de claves exactamente el del contrato `build-json-v1.contract.md`.
import type { BuildFormat } from "../../../domain/build-export/build-format.js";
import type { BuildOutcome } from "../../../domain/build-export/build-outcome.js";
import type { BuildResult } from "../../../domain/build-export/build-result.js";
import type { BuildVerification } from "../../../domain/build-export/verification.js";

export const BUILD_JSON_FORMAT_VERSION = "1.0.0";

/** Outcome del envelope: outcomes de build + `internal-error` (solo en el adapter). */
export type BuildJsonOutcomeV1 = BuildOutcome | "internal-error";

export interface BuildJsonSourceV1 {
  readonly path: string;
  readonly hash: string;
}

export interface BuildJsonArtifactV1 {
  readonly format: BuildFormat;
  readonly relativePath: string;
  readonly contentType: string;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface BuildJsonManifestV1 {
  readonly relativePath: string;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface BuildJsonConflictV1 {
  readonly code: string;
  readonly path: string | null;
  readonly format: BuildFormat | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksWrite: boolean;
}

export interface BuildJsonVerificationCheckV1 {
  readonly kind: string;
  readonly status: string;
  readonly code: string | null;
  readonly message: string | null;
}

export interface BuildJsonVerificationArtifactV1 {
  readonly relativePath: string;
  readonly expectedHash: string | null;
  readonly actualHash: string | null;
  readonly expectedByteLength: number | null;
  readonly actualByteLength: number | null;
  readonly status: string;
}

export interface BuildJsonVerificationV1 {
  readonly status: string;
  readonly checks: readonly BuildJsonVerificationCheckV1[];
  readonly artifacts: readonly BuildJsonVerificationArtifactV1[];
}

export interface BuildJsonErrorV1 {
  readonly code: string;
  readonly message: string;
  readonly path: string | null;
  readonly details: Readonly<Record<string, unknown>> | null;
}

export interface BuildJsonEnvelopeV1 {
  readonly formatVersion: typeof BUILD_JSON_FORMAT_VERSION;
  readonly command: "build";
  readonly outcome: BuildJsonOutcomeV1;
  readonly source: BuildJsonSourceV1 | null;
  readonly outputDirectory: string | null;
  readonly wrote: boolean;
  readonly outputAvailable: boolean | null;
  readonly artifacts: readonly BuildJsonArtifactV1[];
  readonly manifest: BuildJsonManifestV1 | null;
  readonly verification: BuildJsonVerificationV1 | null;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
  readonly conflict: BuildJsonConflictV1 | null;
  readonly error: BuildJsonErrorV1 | null;
}

function mapVerification(verification: BuildVerification | null): BuildJsonVerificationV1 | null {
  if (verification === null) return null;
  return {
    status: verification.status,
    checks: verification.checks.map((c) => ({ kind: c.kind, status: c.status, code: c.code, message: c.message })),
    artifacts: verification.artifacts.map((a) => ({
      relativePath: a.relativePath,
      expectedHash: a.expectedHash,
      actualHash: a.actualHash,
      expectedByteLength: a.expectedByteLength,
      actualByteLength: a.actualByteLength,
      status: a.status,
    })),
  };
}

/** Mapea un `BuildResult` de dominio al envelope público, con orden de claves contractual. */
export function mapBuildResultToJsonEnvelope(result: BuildResult): BuildJsonEnvelopeV1 {
  return {
    formatVersion: BUILD_JSON_FORMAT_VERSION,
    command: "build",
    outcome: result.outcome,
    source: result.source === null ? null : { path: result.source.logicalPath, hash: result.source.hash },
    outputDirectory: result.outputDirectory,
    wrote: result.wrote,
    outputAvailable: result.outputAvailable,
    artifacts: result.artifacts.map((a) => ({ format: a.format, relativePath: a.relativePath, contentType: a.contentType, contentHash: a.contentHash, byteLength: a.byteLength })),
    manifest: result.manifest === null ? null : { relativePath: result.manifest.relativePath, contentHash: result.manifest.contentHash, byteLength: result.manifest.byteLength },
    verification: mapVerification(result.verification),
    backupRelativePath: result.backupRelativePath,
    recoveryRequired: result.recoveryRequired,
    conflict: result.conflict === null ? null : { code: result.conflict.code, path: result.conflict.path, format: result.conflict.format, severity: result.conflict.severity, message: result.conflict.message, blocksWrite: result.conflict.blocksWrite },
    error: result.error === null ? null : { code: result.error.code, message: result.error.message, path: result.error.path, details: result.error.details },
  };
}

/** Envelope `internal-error` SOLO de adapter (excepción inesperada). Mensaje genérico y seguro. */
export function buildInternalErrorJsonEnvelope(): BuildJsonEnvelopeV1 {
  return {
    formatVersion: BUILD_JSON_FORMAT_VERSION,
    command: "build",
    outcome: "internal-error",
    source: null,
    outputDirectory: null,
    wrote: false,
    outputAvailable: null,
    artifacts: [],
    manifest: null,
    verification: null,
    backupRelativePath: null,
    recoveryRequired: false,
    conflict: null,
    error: { code: "internal-error", message: "An unexpected internal error occurred.", path: null, details: null },
  };
}
