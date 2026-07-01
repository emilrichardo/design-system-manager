// T006 (010) — Transiciones explícitas del Editor. La UI puede reflejar intención, planificación,
// aprobación y resultados sin ejecutar escrituras desde esta capa.
import type { EditorWorkflowStateV1 } from "./session.js";

export type EditorTransitionEventV1 =
  | "start-draft"
  | "change-draft"
  | "submit-plan"
  | "plan-ready"
  | "block"
  | "request-approval"
  | "start-apply"
  | "apply-success"
  | "apply-unchanged"
  | "apply-conflict"
  | "verification-error"
  | "require-recovery"
  | "reset";

const TRANSITIONS: Readonly<Record<EditorWorkflowStateV1, Partial<Record<EditorTransitionEventV1, EditorWorkflowStateV1>>>> = {
  idle: { "start-draft": "drafting", reset: "idle" },
  drafting: { "change-draft": "drafting", "submit-plan": "planning", block: "blocked", reset: "idle" },
  planning: { "plan-ready": "plan-ready", block: "blocked", "apply-conflict": "conflict", reset: "idle" },
  "plan-ready": { "request-approval": "approval-required", "change-draft": "drafting", block: "blocked", reset: "idle" },
  blocked: { "change-draft": "drafting", reset: "idle" },
  "approval-required": { "start-apply": "applying", "change-draft": "drafting", reset: "idle" },
  applying: {
    "apply-success": "applied",
    "apply-unchanged": "unchanged",
    "apply-conflict": "conflict",
    "verification-error": "verification-error",
    "require-recovery": "recovery-required",
  },
  applied: { reset: "idle" },
  unchanged: { reset: "idle" },
  conflict: { "change-draft": "drafting", reset: "idle" },
  "verification-error": { "require-recovery": "recovery-required", reset: "idle" },
  "recovery-required": { reset: "idle" },
};

export function transitionEditorState(state: EditorWorkflowStateV1, event: EditorTransitionEventV1): EditorWorkflowStateV1 {
  return TRANSITIONS[state][event] ?? state;
}
