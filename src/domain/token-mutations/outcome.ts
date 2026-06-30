// T003 (008) — Outcomes semánticos, issues, recovery y error seguro de mutaciones de tokens. Dominio
// puro: sin exit codes, sin `Error`, sin stack, sin rutas absolutas. `internal-error` NO pertenece al
// dominio (vive en la frontera CLI/adapter). Tampoco existen `partial`/`success`/`blocked`.

export type TokenMutationOutcome =
  | "planned"
  | "applied"
  | "unchanged"
  | "invalid-command"
  | "invalid-design-system"
  | "conflict"
  | "not-found"
  | "read-error"
  | "write-error"
  | "verification-error";

export const TOKEN_MUTATION_OUTCOMES: readonly TokenMutationOutcome[] = [
  "planned",
  "applied",
  "unchanged",
  "invalid-command",
  "invalid-design-system",
  "conflict",
  "not-found",
  "read-error",
  "write-error",
  "verification-error",
] as const;

/** Códigos estables de issue/conflicto de validación/concurrencia. */
export type MutationIssueCode =
  | "invalid-path"
  | "token-exists"
  | "token-not-found"
  | "group-not-found"
  | "rename-collision"
  | "move-collision"
  | "alias-not-found"
  | "alias-cycle"
  | "alias-to-group"
  | "type-mismatch"
  | "invalid-dtcg-value"
  | "parent-descendant-conflict"
  | "removal-with-dependents"
  | "group-removal-non-empty"
  | "concurrent-source-change";

export interface MutationIssue {
  readonly code: MutationIssueCode;
  /** Path lógico relativo o `null` cuando el issue es global. */
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksApply: boolean;
  /** Para `removal-with-dependents`: paths lógicos que dependen del token. */
  readonly dependents: readonly string[];
}

/** Estado de disponibilidad/recuperación de la fuente. Rutas relativas únicamente. */
export interface MutationRecoveryState {
  readonly sourceAvailable: boolean;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
}

/** Error público seguro: sin `Error`, sin stack, sin rutas absolutas. */
export interface SafeMutationError {
  readonly code: string;
  readonly message: string;
  readonly path: string | null;
  readonly details: Readonly<Record<string, unknown>> | null;
}

/** Identidad del snapshot de la fuente (para detectar cambio concurrente en apply). */
export interface SourceSnapshotIdentity {
  readonly logicalPath: string;
  readonly contentHash: string;
}

const WROTE_OUTCOMES: readonly TokenMutationOutcome[] = ["applied"] as const;

/** Solo `applied` implica `wrote:true`; el resto `wrote:false`. */
export function wroteInvariantHolds(outcome: TokenMutationOutcome, wrote: boolean): boolean {
  return (WROTE_OUTCOMES as readonly string[]).includes(outcome) ? wrote === true : wrote === false;
}

/** Invariante de recovery según el outcome (write-error antes de mover vs verification-error post-write). */
export function recoveryInvariantHolds(outcome: TokenMutationOutcome, recovery: MutationRecoveryState): boolean {
  switch (outcome) {
    case "verification-error":
      return recovery.sourceAvailable && recovery.backupRelativePath !== null && recovery.recoveryRequired;
    case "write-error":
      return (
        (recovery.sourceAvailable && recovery.backupRelativePath === null && !recovery.recoveryRequired) ||
        (!recovery.sourceAvailable && recovery.backupRelativePath !== null && recovery.recoveryRequired)
      );
    default:
      return true;
  }
}

/** Construye un issue inmutable. */
export function issue(
  code: MutationIssueCode,
  path: string | null,
  message: string,
  options: { readonly severity?: "error" | "warning"; readonly dependents?: readonly string[] } = {},
): MutationIssue {
  const severity = options.severity ?? "error";
  return Object.freeze({ code, path, severity, message, blocksApply: severity === "error", dependents: Object.freeze([...(options.dependents ?? [])]) });
}
