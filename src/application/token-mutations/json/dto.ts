// T035 (008) — DTO público del envelope JSON de mutaciones (`TokenMutationJsonEnvelopeV1`),
// independiente de `JsonEnvelopeV1` (003), `FoundationsJsonEnvelopeV1` (004), `BuildJsonEnvelopeV1` (006)
// y `PresetsJsonEnvelopeV1` (007/005). Solo paths lógicos, valores públicos seguros y valores JSON-safe:
// nunca bytes crudos, nodos parseados internos, `Error`/stack ni paths absolutos.
import type { TokenMutationDiffKind, SafePublicValue } from "../../../domain/token-mutations/diff.js";
import type { TokenMutationOutcome } from "../../../domain/token-mutations/outcome.js";
import type { TokenMutationJsonFormatVersion } from "./format-version.js";

export type TokenMutationJsonCommandV1 = "token-plan" | "token-apply";

export type TokenMutationJsonOutcomeV1 = TokenMutationOutcome | "internal-error";

export interface TokenMutationJsonErrorV1 {
  readonly code: string;
  readonly message: string;
  readonly path: string | null;
}

export interface TokenMutationJsonDiffEntryV1 {
  readonly kind: TokenMutationDiffKind;
  readonly path: string;
  readonly previousPath: string | null;
  readonly before: SafePublicValue | null;
  readonly after: SafePublicValue | null;
  readonly references: readonly string[];
}

export interface TokenMutationJsonDiffSummaryV1 {
  readonly added: number;
  readonly updated: number;
  readonly renamed: number;
  readonly moved: number;
  readonly removed: number;
  readonly aliasChanged: number;
  readonly metadataChanged: number;
  readonly groupChanged: number;
}

export interface TokenMutationJsonDiffV1 {
  readonly entries: readonly TokenMutationJsonDiffEntryV1[];
  readonly summary: TokenMutationJsonDiffSummaryV1;
}

export interface TokenMutationJsonConflictV1 {
  readonly code: string;
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksApply: boolean;
  readonly dependents: readonly string[];
}

export interface TokenMutationJsonPlanV1 {
  readonly candidateHash: string;
  readonly writable: boolean;
  readonly diff: TokenMutationJsonDiffV1;
}

export interface TokenMutationJsonSourceV1 {
  readonly logicalPath: string;
  readonly contentHash: string;
}

export interface TokenMutationJsonRecoveryV1 {
  readonly sourceAvailable: boolean;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
}

export interface TokenMutationJsonResultV1 {
  readonly wrote: boolean;
  readonly plan: TokenMutationJsonPlanV1 | null;
  readonly diff: TokenMutationJsonDiffV1 | null;
  readonly conflicts: readonly TokenMutationJsonConflictV1[];
  readonly recovery: TokenMutationJsonRecoveryV1 | null;
  readonly source: TokenMutationJsonSourceV1 | null;
  readonly error: TokenMutationJsonErrorV1 | null;
}

export interface TokenMutationJsonEnvelopeV1 {
  readonly formatVersion: TokenMutationJsonFormatVersion;
  readonly command: TokenMutationJsonCommandV1;
  readonly outcome: TokenMutationJsonOutcomeV1;
  readonly result: TokenMutationJsonResultV1 | null;
  readonly error: TokenMutationJsonErrorV1 | null;
}
