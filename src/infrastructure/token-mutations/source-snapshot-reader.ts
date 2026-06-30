// T012 (008) — Lector de snapshot de la fuente de tokens. Reutiliza el snapshot reader de `006`
// (UNA lectura raw → decodificación UTF-8 → un `JSON.parse` → un análisis `002`/`004`) para obtener el
// documento parseado y el `sourceHash`, y proyecta una `AnalyzedTokenSource` para el planner/validación.
// No introduce un segundo parser/analyzer. Captura la identidad del snapshot (path lógico + hash).
import { createBuildSnapshotReader } from "../build-export/snapshot-reader.js";
import { analyzedTokenSource } from "../../application/token-mutations/analyze-source.js";
import type { SourceSnapshotPort, SourceSnapshotResult } from "../../application/token-mutations/ports.js";

/** Crea el `SourceSnapshotPort` reutilizando la tubería de lectura/análisis de `006`. */
export function createTokenSourceSnapshotReader(): SourceSnapshotPort {
  const reader = createBuildSnapshotReader();
  return {
    async read(input): Promise<SourceSnapshotResult> {
      const result = await reader.read(input);
      if (result.outcome !== "ready") {
        return { outcome: result.outcome, source: null, reason: result.reason };
      }
      const snapshot = result.snapshot;
      const identity = { logicalPath: snapshot.logicalSourcePath, contentHash: snapshot.sourceHash };
      return { outcome: "ready", source: analyzedTokenSource(snapshot.parsedDocument, identity) };
    },
  };
}
