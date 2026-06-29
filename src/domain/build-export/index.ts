// T005 (006) — Superficie pública del dominio build-export. Solo tipos y funciones puras; sin
// filesystem, sin CLI, sin renderers/writer (checkpoints posteriores).
export type { BuildFormat } from "./build-format.js";
export { BUILD_FORMATS, isBuildFormat, artifactFilename, artifactContentType } from "./build-format.js";

export type { BuildArtifact, BuildArtifactMetadata, BuildArtifactInput } from "./artifact.js";
export { createBuildArtifact, artifactMetadata } from "./artifact.js";

export type {
  BuildOutcome,
  ExportOutcome,
  BuildConflictCode,
  BuildConflict,
  BuildRecoveryState,
  SafeBuildError,
} from "./build-outcome.js";
export { BUILD_OUTCOMES, EXPORT_OUTCOMES, recoveryInvariantHolds, wroteInvariantHolds } from "./build-outcome.js";

export type {
  VerificationStatus,
  VerificationCheckKind,
  VerificationCheck,
  VerificationArtifactStatus,
  BuildVerification,
} from "./verification.js";
export { VERIFICATION_CHECK_ORDER, orderVerificationChecks } from "./verification.js";

export type {
  FormatCompatibility,
  BuildProjectionIssue,
  NormalizedBuildToken,
  NormalizedTokenSet,
} from "./normalized-token.js";

export type { OrderableToken } from "./build-token-order.js";
export { compareTokenPath, compareCanonical, orderCanonical } from "./build-token-order.js";
