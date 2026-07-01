// T023 (009) — Acciones del comando `view` (adapter delgado). `--json` delega en el caso de uso headless
// `buildViewerSession` y no abre servidor ni navegador (T027); sin `--json`, arranca el servidor local
// `node:http` (T021) y devuelve el control apenas queda escuchando (el proceso sigue vivo por el socket
// abierto, como cualquier dev server local) — nunca abre un navegador automáticamente.
import type { ViewerSessionV1 } from "../../application/viewer/session.js";
import { buildViewerSession } from "../../application/viewer/build-session.js";
import type { ViewerSessionDependencies } from "../../application/viewer/ports.js";
import { startViewerHttpServer, type ViewerHttpServerHandle } from "../../infrastructure/viewer/http-server.js";

export function runViewSession(executionDir: string, deps: ViewerSessionDependencies): Promise<ViewerSessionV1> {
  return buildViewerSession({ executionDir }, deps);
}

export function runViewServer(executionDir: string, deps: ViewerSessionDependencies, port?: number): Promise<ViewerHttpServerHandle> {
  return startViewerHttpServer(port === undefined ? { deps, executionDir } : { deps, executionDir, port });
}
