// T033 (010) — Adapter de aplicación: comando aprobado -> `applyTokenMutation` (008) -> resultado
// editorial -> refresh de la sesión del Viewer (009). Nunca escribe directamente; delega TODA la
// transacción (backup/verification/recovery/idempotencia) en 008. El refresh reusa `buildViewerSession`
// como una carga NUEVA e independiente (no la misma sesión que generó el plan) — nunca conserva objetos
// mutables compartidos entre la sesión vieja y la nueva (data-model.md "EditorSessionV1" invariants).
import type { TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import { applyTokenMutation, type ApplyTokenMutationDependencies } from "../token-mutations/apply-token-mutation.js";
import { buildViewerSession } from "../viewer/build-session.js";
import type { ViewerSessionDependencies } from "../viewer/ports.js";
import type { ViewerSessionV1 } from "../viewer/session.js";
import { createEditorApplyResult, type EditorApplyResultV1 } from "./apply-result.js";

export type EditorRefreshOutcomeV1 = "not-needed" | "reloaded" | "failed";

export interface EditorRefreshStateV1 {
  readonly state: EditorRefreshOutcomeV1;
  /** Sesión del Viewer YA recargada (nueva, independiente de la anterior); `null` si no se recargó. */
  readonly viewer: ViewerSessionV1 | null;
}

export interface ApplyEditorCommandDependencies {
  readonly apply: ApplyTokenMutationDependencies;
  readonly viewer: ViewerSessionDependencies;
}

export interface ApplyEditorCommandResultV1 {
  readonly mutation: TokenMutationResultV1;
  readonly apply: EditorApplyResultV1;
  readonly refresh: EditorRefreshStateV1;
}

const REFRESH_OUTCOMES = new Set<TokenMutationResultV1["outcome"]>(["applied", "unchanged"]);

/**
 * Aplica el comando aprobado vía 008 y, solo si el resultado es `applied`/`unchanged`, recarga la sesión
 * del Viewer. Si el apply fue exitoso pero el refresh falla, el resultado de apply exitoso permanece
 * visible (`refresh.state === "failed"` no invalida `apply`) — ver `EditorRefreshStateV1` invariants.
 */
export async function applyEditorCommand(
  input: { readonly executionDir: string },
  command: TokenMutationCommandV1,
  deps: ApplyEditorCommandDependencies,
): Promise<ApplyEditorCommandResultV1> {
  const mutation = await applyTokenMutation(input, command, deps.apply);
  const apply = createEditorApplyResult(mutation);

  if (!REFRESH_OUTCOMES.has(mutation.outcome)) {
    return { mutation, apply, refresh: { state: "not-needed", viewer: null } };
  }

  try {
    const viewer = await buildViewerSession(input, deps.viewer);
    return { mutation, apply, refresh: { state: "reloaded", viewer } };
  } catch {
    return { mutation, apply, refresh: { state: "failed", viewer: null } };
  }
}
