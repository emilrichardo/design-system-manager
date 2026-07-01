// T005 (010) — Estados públicos de apply/recovery para que la UI represente resultados futuros sin
// conocer detalles internos de 008 ni rutas de runtime.
import type { MutationRecoveryState, TokenMutationOutcome } from "../../domain/token-mutations/outcome.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import type { EditorIssueV1 } from "./review.js";
import { mapEditorIssue } from "./review.js";

export type EditorApplyStateV1 =
  | "not-started"
  | "approval-required"
  | "applying"
  | "applied"
  | "unchanged"
  | "conflict"
  | "source-changed-concurrently"
  | "source-unavailable"
  | "write-error"
  | "verification-error"
  | "recovery-required";

export interface EditorRecoveryStateV1 {
  readonly sourceAvailable: boolean;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
}

export interface EditorApplyResultV1 {
  readonly state: EditorApplyStateV1;
  readonly wrote: boolean;
  readonly issues: readonly EditorIssueV1[];
  readonly recovery: EditorRecoveryStateV1 | null;
}

export function createEditorRecoveryState(recovery: MutationRecoveryState): EditorRecoveryStateV1 {
  return Object.freeze({
    sourceAvailable: recovery.sourceAvailable,
    backupRelativePath: recovery.backupRelativePath,
    recoveryRequired: recovery.recoveryRequired,
  });
}

/**
 * T036 — Distingue `source-changed-concurrently` (código `concurrent-source-change` de 008) del resto de
 * `conflict` genéricos; `not-found`/`read-error` en tiempo de apply se presentan como `source-unavailable`
 * (la fuente ya no está disponible como cuando se generó el plan) en vez de un `conflict` genérico.
 */
export function mapOutcomeToEditorApplyState(outcome: TokenMutationOutcome, conflictCodes: readonly string[] = []): EditorApplyStateV1 {
  switch (outcome) {
    case "applied":
      return "applied";
    case "unchanged":
      return "unchanged";
    case "conflict":
      return conflictCodes.includes("concurrent-source-change") ? "source-changed-concurrently" : "conflict";
    case "invalid-command":
    case "invalid-design-system":
      return "conflict";
    case "not-found":
    case "read-error":
      return "source-unavailable";
    case "write-error":
      return "write-error";
    case "verification-error":
      return "verification-error";
    case "planned":
      return "approval-required";
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

export function createEditorApplyResult(result: TokenMutationResultV1): EditorApplyResultV1 {
  const recovery = result.recovery === null ? null : createEditorRecoveryState(result.recovery);
  const state = recovery?.recoveryRequired === true
    ? "recovery-required"
    : mapOutcomeToEditorApplyState(result.outcome, result.conflicts.map((c) => c.code));
  return Object.freeze({
    state,
    wrote: result.wrote,
    issues: Object.freeze(result.conflicts.map(mapEditorIssue)),
    recovery,
  });
}
