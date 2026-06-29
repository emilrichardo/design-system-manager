// T003 (006) — Outcomes semánticos, conflictos, recovery y error seguro de build/export. Dominio puro:
// sin exit codes, sin `Error`, sin stack, sin rutas absolutas. `internal-error` NO pertenece al dominio
// (vive en la frontera CLI/adapter). Tampoco existen `partial`/`success`/`blocked`/`validation`.
import type { BuildFormat } from "./build-format.js";

/** Outcomes públicos de `build` (sin `internal-error`, que es de adapter). */
export type BuildOutcome =
  | "built"
  | "unchanged"
  | "invalid-design-system"
  | "unsupported-value"
  | "conflict"
  | "not-found"
  | "read-error"
  | "write-error"
  | "verification-error";

/** Outcomes públicos de `export` (read-only). */
export type ExportOutcome =
  | "exported"
  | "invalid-design-system"
  | "unsupported-value"
  | "not-found"
  | "read-error";

export const BUILD_OUTCOMES: readonly BuildOutcome[] = [
  "built",
  "unchanged",
  "invalid-design-system",
  "unsupported-value",
  "conflict",
  "not-found",
  "read-error",
  "write-error",
  "verification-error",
] as const;

export const EXPORT_OUTCOMES: readonly ExportOutcome[] = [
  "exported",
  "invalid-design-system",
  "unsupported-value",
  "not-found",
  "read-error",
] as const;

/** Códigos estables de conflicto de build (ownership/concurrencia/nodos). */
export type BuildConflictCode =
  | "untrusted-build-manifest"
  | "required-path-owned-by-unknown"
  | "managed-artifact-modified"
  | "managed-artifact-missing"
  | "unsupported-unknown-node"
  | "source-modified";

export interface BuildConflict {
  readonly code: BuildConflictCode;
  /** Path lógico relativo o `null` cuando el conflicto es global. */
  readonly path: string | null;
  readonly format: BuildFormat | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksWrite: boolean;
}

/** Estado de disponibilidad/recuperación del directorio de salida. Rutas relativas únicamente. */
export interface BuildRecoveryState {
  readonly outputAvailable: boolean;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
}

/** Error público seguro: sin `Error`, sin stack, sin rutas absolutas. */
export interface SafeBuildError {
  readonly code: string;
  readonly message: string;
  readonly path: string | null;
  readonly details: Readonly<Record<string, unknown>> | null;
}

/**
 * Invariante de recovery según el outcome (consumido por writer/result en checkpoints posteriores).
 * Solo modela la relación; no decide exit codes.
 */
export function recoveryInvariantHolds(outcome: BuildOutcome, recovery: BuildRecoveryState): boolean {
  switch (outcome) {
    case "verification-error":
      // Posterior al commit point: output disponible, backup retenido, recuperación requerida.
      return recovery.outputAvailable && recovery.backupRelativePath !== null && recovery.recoveryRequired;
    case "write-error":
      // O bien falla antes de mover (output disponible, sin backup, sin recovery) o restore catastrófico
      // (output no disponible, backup retenido, recovery requerido).
      return (
        (recovery.outputAvailable && recovery.backupRelativePath === null && !recovery.recoveryRequired) ||
        (!recovery.outputAvailable && recovery.backupRelativePath !== null && recovery.recoveryRequired)
      );
    default:
      return true;
  }
}

/** `built` exige `wrote:true`; `unchanged`/`conflict`/lecturas exigen `wrote:false`. */
export function wroteInvariantHolds(outcome: BuildOutcome, wrote: boolean): boolean {
  switch (outcome) {
    case "built":
    case "verification-error":
      return wrote === true;
    default:
      return wrote === false;
  }
}
