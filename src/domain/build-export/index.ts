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
  BuildOwnershipState,
  BuildOwnership,
} from "./build-outcome.js";
export {
  BUILD_OUTCOMES,
  EXPORT_OUTCOMES,
  BLOCKING_OWNERSHIP_STATES,
  recoveryInvariantHolds,
  wroteInvariantHolds,
  ownershipAllowsPublish,
} from "./build-outcome.js";

export type { BuildManifestV1, BuildManifestArtifactV1, BuildManifestValidation } from "./build-manifest.js";
export {
  BUILD_MANIFEST_FORMAT_VERSION,
  BUILD_MANIFEST_FILENAME,
  BUILD_OUTPUT_ROOT,
  BUILD_SOURCE_LOGICAL_PATH,
  isSha256Hex,
  isSafeRelativePath,
  validateBuildManifestV1,
} from "./build-manifest.js";

export type {
  PreviousBuildManifest,
  UnknownPreservationPolicy,
  CandidateBuildManifest,
  BuildPlan,
} from "./build-plan.js";

export type {
  BuildManifestSummary,
  BuildSourceRef,
  BuildResult,
  ExportSuccess,
  ExportFailure,
  ExportResult,
} from "./build-result.js";

export type {
  RequiredPathState,
  RequiredPathStatus,
  UnknownOutputNode,
  RawNodeKind,
  RawOutputNode,
  BuildSnapshot,
  PublicationState,
} from "./build-snapshot.js";
export { PUBLICATION_STATES, COMMIT_POINT } from "./build-snapshot.js";

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

export type { CssNameValidation, CssNameCollision, CssNameMapResult } from "./css-name.js";
export { tokenPathToCssCustomPropertyName, validateCssCustomPropertyName, buildCssNameMap } from "./css-name.js";
