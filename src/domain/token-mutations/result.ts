// T003 (008) — Plan y resultado público de mutaciones. Dominio puro: outcomes semánticos, sin exit
// codes, sin `Error`/stack, sin rutas absolutas. El plan es read-only y determinista.
import type { TokenMutationOperationV1 } from "./operation.js";
import type { TokenMutationDiffV1 } from "./diff.js";
import type { MutationIssue, MutationRecoveryState, SafeMutationError, SourceSnapshotIdentity, TokenMutationOutcome } from "./outcome.js";

/** Plan de mutación: proyección read-only y determinista de lo que cambiaría. */
export interface TokenMutationPlanV1 {
  readonly operations: readonly TokenMutationOperationV1[];
  readonly diff: TokenMutationDiffV1;
  /** SHA-256 del documento candidato serializado. */
  readonly candidateHash: string;
  /** Identidad del snapshot capturada al planificar (para concurrencia en apply). */
  readonly source: SourceSnapshotIdentity;
  /** `false` si existe algún issue bloqueante. */
  readonly writable: boolean;
}

/** Resultado discriminado por `outcome` de `plan`/`apply`. */
export interface TokenMutationResultV1 {
  readonly outcome: TokenMutationOutcome;
  readonly wrote: boolean;
  readonly plan: TokenMutationPlanV1 | null;
  readonly diff: TokenMutationDiffV1 | null;
  readonly conflicts: readonly MutationIssue[];
  readonly recovery: MutationRecoveryState | null;
  readonly source: SourceSnapshotIdentity | null;
  readonly error: SafeMutationError | null;
}
