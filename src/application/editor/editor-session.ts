// T009 (010) — Composición entre Viewer y Editor. El Viewer sigue siendo la proyección read-only;
// el Editor agrega estado de draft/review sin recomputar navegación ni overview.
import type { ViewerSessionV1 } from "../viewer/session.js";
import type { EditorCommandDraftV1 } from "./command-draft.js";
import type { EditorPlanViewV1 } from "./review.js";
import { createEditorSession, type EditorSessionV1, type EditorWorkflowStateV1 } from "./session.js";

export interface ComposeEditorSessionOptions {
  readonly state?: EditorWorkflowStateV1;
  readonly draft?: EditorCommandDraftV1 | null;
  readonly plan?: EditorPlanViewV1 | null;
}

export function composeEditorSessionFromViewer(viewer: ViewerSessionV1, options: ComposeEditorSessionOptions = {}): EditorSessionV1 {
  return createEditorSession(viewer, {
    state: options.state ?? "idle",
    draft: options.draft ?? null,
    plan: options.plan ?? null,
  });
}
