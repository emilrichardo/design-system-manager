// T004 (007) — Outcomes semánticos, issues, recovery y error seguro del Asset Manager. Dominio puro:
// sin exit codes, sin `Error`, sin stack, sin rutas absolutas. `internal-error` NO pertenece al dominio
// (vive en la frontera CLI/adapter). Tampoco existen `partial`/`success`/`blocked` como outcomes
// (`blocked` es solo un verdict de candidato de import).

/** Outcomes públicos de las operaciones de assets. */
export type AssetOutcome =
  | "listed"
  | "inspected"
  | "planned"
  | "applied"
  | "unchanged"
  | "removed"
  | "invalid-asset-store"
  | "unsupported-asset"
  | "conflict"
  | "not-found"
  | "read-error"
  | "write-error"
  | "verification-error";

export const ASSET_OUTCOMES: readonly AssetOutcome[] = [
  "listed",
  "inspected",
  "planned",
  "applied",
  "unchanged",
  "removed",
  "invalid-asset-store",
  "unsupported-asset",
  "conflict",
  "not-found",
  "read-error",
  "write-error",
  "verification-error",
] as const;

/** Outcomes que implican `wrote:true`. */
const WROTE_OUTCOMES: readonly AssetOutcome[] = ["applied", "removed", "verification-error"] as const;

/** Códigos estables de issue/conflicto (ownership, validación, concurrencia, candidatos). */
export type AssetIssueCode =
  | "unsupported-mime"
  | "font-invalid"
  | "svg-unsafe"
  | "path-unsafe"
  | "too-large"
  | "license-required"
  | "owned-by-unknown"
  | "untrusted-asset-manifest"
  | "source-modified"
  | "asset-missing";

export interface AssetIssue {
  readonly code: AssetIssueCode;
  /** Path lógico relativo o `null` cuando el issue es global. */
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksWrite: boolean;
}

/** Estado de disponibilidad/recuperación del asset store. Rutas relativas únicamente. */
export interface AssetRecoveryState {
  readonly storeAvailable: boolean;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
}

/** Error público seguro: sin `Error`, sin stack, sin rutas absolutas. */
export interface SafeAssetError {
  readonly code: string;
  readonly message: string;
  readonly path: string | null;
  readonly details: Readonly<Record<string, unknown>> | null;
}

/** `applied`/`removed`/`verification-error` exigen `wrote:true`; el resto `wrote:false`. */
export function wroteInvariantHolds(outcome: AssetOutcome, wrote: boolean): boolean {
  return (WROTE_OUTCOMES as readonly string[]).includes(outcome) ? wrote === true : wrote === false;
}

/** Invariante de recovery según el outcome (consumido por writer/result en checkpoints posteriores). */
export function recoveryInvariantHolds(outcome: AssetOutcome, recovery: AssetRecoveryState): boolean {
  switch (outcome) {
    case "verification-error":
      return recovery.storeAvailable && recovery.backupRelativePath !== null && recovery.recoveryRequired;
    case "write-error":
      return (
        (recovery.storeAvailable && recovery.backupRelativePath === null && !recovery.recoveryRequired) ||
        (!recovery.storeAvailable && recovery.backupRelativePath !== null && recovery.recoveryRequired)
      );
    default:
      return true;
  }
}
