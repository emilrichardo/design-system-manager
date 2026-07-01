import type { EditorApplyResultV1, EditorApplyStateV1 } from "../apply-result.js";
import type { EditorReviewV1 } from "../review.js";
import type { EditorSessionV1, EditorWorkflowStateV1 } from "../session.js";

export const EDITOR_JSON_FORMAT_VERSION = "1.0.0";

export type EditorJsonActionV1 = "editor-session" | "editor-refresh" | "editor-plan" | "editor-apply" | "editor-error";

export interface EditorJsonEnvelopeV1<TData> {
  readonly formatVersion: typeof EDITOR_JSON_FORMAT_VERSION;
  readonly action: EditorJsonActionV1;
  readonly state: EditorWorkflowStateV1 | EditorApplyStateV1 | "internal-error" | "invalid-request";
  readonly data: TData;
  readonly error: { readonly code: string; readonly message: string } | null;
}

export type EditorSessionJsonEnvelopeV1 = EditorJsonEnvelopeV1<EditorSessionV1>;
export type EditorReviewJsonEnvelopeV1 = EditorJsonEnvelopeV1<EditorReviewV1>;

/** T034 (010) — Datos del resultado de apply: nunca comparte el objeto de sesión anterior; `session` es
 * `null` cuando el refresh no ocurrió (`not-needed`/`failed`) o cuando el apply no escribió nada. */
export interface EditorApplyJsonDataV1 {
  readonly apply: EditorApplyResultV1;
  readonly refresh: { readonly state: "not-needed" | "reloaded" | "failed"; readonly session: EditorSessionV1 | null };
}

export type EditorApplyJsonEnvelopeV1 = EditorJsonEnvelopeV1<EditorApplyJsonDataV1>;
