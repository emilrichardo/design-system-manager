// T005 (008) — Superficie pública del dominio de mutaciones de tokens. Solo tipos y funciones puras; sin
// filesystem, sin CLI, sin planner/validación/writer (checkpoints posteriores).
export type {
  DtcgValue,
  TokenOperationKind,
  GroupOperationKind,
  TokenMutationOperationKind,
  CreateTokenOp,
  UpdateValueOp,
  UpdateTypeOp,
  UpdateDescriptionOp,
  UpdateCategoryOp,
  SetAliasOp,
  RemoveAliasOp,
  RenameTokenOp,
  MoveTokenOp,
  DuplicateTokenOp,
  RemoveTokenOp,
  CreateGroupOp,
  RenameGroupOp,
  MoveGroupOp,
  RemoveEmptyGroupOp,
  TokenMutationOperationV1,
} from "./operation.js";
export { TOKEN_MUTATION_OPERATION_KINDS, isTokenMutationOperationKind } from "./operation.js";

export type { TokenMutationCommandV1 } from "./command.js";
export { TOKEN_MUTATION_FORMAT_VERSION, createTokenMutationCommand } from "./command.js";

export type {
  TokenMutationDiffKind,
  SafePublicValue,
  TokenMutationDiffEntry,
  TokenMutationDiffSummary,
  TokenMutationDiffV1,
} from "./diff.js";
export { TOKEN_MUTATION_DIFF_KINDS, orderDiffEntries, summarizeDiff, buildDiff, EMPTY_DIFF } from "./diff.js";

export type {
  TokenMutationOutcome,
  MutationIssueCode,
  MutationIssue,
  MutationRecoveryState,
  SafeMutationError,
  SourceSnapshotIdentity,
} from "./outcome.js";
export { TOKEN_MUTATION_OUTCOMES, wroteInvariantHolds, recoveryInvariantHolds, issue } from "./outcome.js";

export type { TokenMutationPlanV1, TokenMutationResultV1 } from "./result.js";

export {
  isSafeTokenPath,
  segments,
  lastSegment,
  parentPath,
  joinPath,
  isWithin,
  rewritePrefix,
} from "./paths.js";

// 011 T002 — metadata de capa de token (Neuraz extension) y reglas puras R1-R5.
export type { TokenLayer, TokenLayerV1, TokenProvenanceV1 } from "./token-layer.js";
export {
  TOKEN_LAYERS,
  TOKEN_LAYER_ISSUE_CODES,
  isTokenLayer,
  emptyTokenLayer,
  validateTokenLayerShape,
  unclassifiedLayerWarning,
  evaluateAliasLayerTransition,
} from "./token-layer.js";
