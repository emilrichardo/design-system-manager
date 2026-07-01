// T023 (009) / T043 (010) — Acciones del comando `view` (adapter delgado). `--json` delega en el caso de
// uso headless `buildViewerSession` y no abre servidor ni navegador (T027); sin `--json`, arranca el
// servidor local `node:http` (T021) y devuelve el control apenas queda escuchando (el proceso sigue vivo
// por el socket abierto, como cualquier dev server local) — nunca abre un navegador automáticamente. El
// modo Editor (`editorDeps`) es opcional: sin él, el servidor sigue siendo estrictamente de solo lectura
// (405/500 en `/api/editor/plan|apply`) exactamente como antes de `010`.
import type { ApplyEditorCommandDependencies } from "../../application/editor/apply-editor-command.js";
import type { ViewerSessionV1 } from "../../application/viewer/session.js";
import { buildViewerSession } from "../../application/viewer/build-session.js";
import type { ViewerSessionDependencies } from "../../application/viewer/ports.js";
import type { PlanTokenMutationDependencies } from "../../application/token-mutations/plan-token-mutation.js";
import type { ApplyBrandMutationDependencies } from "../../application/brand/apply-brand-mutation.js";
import { startViewerHttpServer, type ViewerHttpServerHandle } from "../../infrastructure/viewer/http-server.js";

export function runViewSession(executionDir: string, deps: ViewerSessionDependencies): Promise<ViewerSessionV1> {
  return buildViewerSession({ executionDir }, deps);
}

export interface EditorServerDependencies {
  readonly plan: PlanTokenMutationDependencies;
  readonly apply: ApplyEditorCommandDependencies;
  /** T025 (011) — Brand Editor deps (plan/apply sobre `design-system/brand/**`). Opcional. */
  readonly brandApply?: ApplyBrandMutationDependencies;
}

export function runViewServer(
  executionDir: string,
  deps: ViewerSessionDependencies,
  port?: number,
  editorDeps?: EditorServerDependencies,
): Promise<ViewerHttpServerHandle> {
  return startViewerHttpServer({
    deps,
    executionDir,
    ...(port === undefined ? {} : { port }),
    ...(editorDeps === undefined
      ? {}
      : {
          editorPlanDeps: editorDeps.plan,
          editorApplyDeps: editorDeps.apply,
          ...(editorDeps.brandApply === undefined ? {} : { editorBrandApplyDeps: editorDeps.brandApply }),
        }),
  });
}
