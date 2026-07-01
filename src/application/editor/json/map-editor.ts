import type { ApplyEditorCommandResultV1 } from "../apply-editor-command.js";
import { composeEditorSessionFromViewer } from "../editor-session.js";
import type { EditorReviewV1 } from "../review.js";
import type { EditorSessionV1 } from "../session.js";
import { EDITOR_JSON_FORMAT_VERSION, type EditorApplyJsonEnvelopeV1, type EditorJsonEnvelopeV1 } from "./dto.js";

export function toEditorSessionJsonEnvelope(session: EditorSessionV1): EditorJsonEnvelopeV1<EditorSessionV1> {
  return Object.freeze({
    formatVersion: EDITOR_JSON_FORMAT_VERSION,
    action: "editor-session",
    state: session.state,
    data: session,
    error: null,
  });
}

export function toEditorRefreshJsonEnvelope(session: EditorSessionV1): EditorJsonEnvelopeV1<EditorSessionV1> {
  return Object.freeze({
    formatVersion: EDITOR_JSON_FORMAT_VERSION,
    action: "editor-refresh",
    state: session.state,
    data: session,
    error: null,
  });
}

export function toEditorReviewJsonEnvelope(review: EditorReviewV1): EditorJsonEnvelopeV1<EditorReviewV1> {
  const state = review.expiredPlan ? "blocked" : review.canApprove ? "approval-required" : "blocked";
  return Object.freeze({
    formatVersion: EDITOR_JSON_FORMAT_VERSION,
    action: "editor-plan",
    state,
    data: review,
    error: null,
  });
}

/**
 * T034 (010) — Mapea el resultado de `applyEditorCommand` a un envelope público. Cuando hubo refresh,
 * compone una sesión editorial NUEVA a partir del Viewer ya recargado (nunca reutiliza la sesión previa
 * a la aprobación) — ver invariantes de `EditorRefreshStateV1` en `apply-editor-command.ts`.
 */
export function toEditorApplyJsonEnvelope(result: ApplyEditorCommandResultV1): EditorApplyJsonEnvelopeV1 {
  const session = result.refresh.viewer === null ? null : composeEditorSessionFromViewer(result.refresh.viewer);
  return Object.freeze({
    formatVersion: EDITOR_JSON_FORMAT_VERSION,
    action: "editor-apply",
    state: result.apply.state,
    data: Object.freeze({
      apply: result.apply,
      refresh: Object.freeze({ state: result.refresh.state, session }),
    }),
    error: null,
  });
}

export function toEditorInvalidRequestJsonEnvelope(message = "Invalid editor request."): EditorJsonEnvelopeV1<null> {
  return Object.freeze({
    formatVersion: EDITOR_JSON_FORMAT_VERSION,
    action: "editor-error",
    state: "invalid-request",
    data: null,
    error: Object.freeze({ code: "invalid-request", message }),
  });
}

export function toEditorInternalErrorJsonEnvelope(): EditorJsonEnvelopeV1<null> {
  return Object.freeze({
    formatVersion: EDITOR_JSON_FORMAT_VERSION,
    action: "editor-error",
    state: "internal-error",
    data: null,
    error: Object.freeze({ code: "internal-error", message: "The editor request could not be completed." }),
  });
}
