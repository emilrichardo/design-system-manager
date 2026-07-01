// T001 (010) — Contratos de sesión del Visual Token Editor. Capa de aplicación pura: el Viewer
// conserva la lectura/proyección y el Editor agrega intención de cambio, plan y estados de revisión.
import type { ViewerSessionV1 } from "../viewer/session.js";
import type { EditorApplyStateV1, EditorRecoveryStateV1 } from "./apply-result.js";
import type { EditorCommandDraftV1 } from "./command-draft.js";
import type { EditorPlanViewV1 } from "./review.js";

export type EditorWorkflowStateV1 =
  | "idle"
  | "drafting"
  | "planning"
  | "plan-ready"
  | "blocked"
  | "approval-required"
  | "applying"
  | "applied"
  | "unchanged"
  | "conflict"
  | "verification-error"
  | "recovery-required";

export const EDITOR_WORKFLOW_STATES: readonly EditorWorkflowStateV1[] = [
  "idle",
  "drafting",
  "planning",
  "plan-ready",
  "blocked",
  "approval-required",
  "applying",
  "applied",
  "unchanged",
  "conflict",
  "verification-error",
  "recovery-required",
] as const;

export type EditorModeV1 = "view" | "edit" | "review" | "applying" | "done" | "blocked" | "recovery";

export interface EditorSessionV1 {
  readonly formatVersion: "1.0.0";
  readonly viewer: ViewerSessionV1;
  readonly mode: EditorModeV1;
  readonly state: EditorWorkflowStateV1;
  readonly draft: EditorCommandDraftV1 | null;
  readonly plan: EditorPlanViewV1 | null;
  readonly apply: EditorApplyStateV1 | null;
  readonly recovery: EditorRecoveryStateV1 | null;
}

export interface CreateEditorSessionOptions {
  readonly state?: EditorWorkflowStateV1;
  readonly draft?: EditorCommandDraftV1 | null;
  readonly plan?: EditorPlanViewV1 | null;
  readonly apply?: EditorApplyStateV1 | null;
  readonly recovery?: EditorRecoveryStateV1 | null;
}

export function modeForEditorState(state: EditorWorkflowStateV1): EditorModeV1 {
  switch (state) {
    case "idle":
      return "view";
    case "drafting":
    case "planning":
      return "edit";
    case "plan-ready":
    case "approval-required":
      return "review";
    case "applying":
      return "applying";
    case "applied":
    case "unchanged":
      return "done";
    case "blocked":
    case "conflict":
    case "verification-error":
      return "blocked";
    case "recovery-required":
      return "recovery";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function canStartEditorDraft(viewer: ViewerSessionV1): boolean {
  return viewer.state === "ready" || viewer.state === "partial";
}

export function createEditorSession(viewer: ViewerSessionV1, options: CreateEditorSessionOptions = {}): EditorSessionV1 {
  const state = options.state ?? "idle";
  return Object.freeze({
    formatVersion: "1.0.0",
    viewer,
    mode: modeForEditorState(state),
    state,
    draft: options.draft ?? null,
    plan: options.plan ?? null,
    apply: options.apply ?? null,
    recovery: options.recovery ?? null,
  });
}
