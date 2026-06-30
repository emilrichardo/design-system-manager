// T111/T112 (006) — Clasificación pura de nodos desconocidos bajo `design-system/build/`. Permite solo
// archivos y directorios regulares; rechaza symlink/socket/FIFO/block/char/special/path-escape con
// `conflict`/`unsupported-unknown-node`. Aplica los límites canónicos reusando `ANALYSIS_LIMITS`
// (cantidad ≤ maxNodes, profundidad ≤ maxDepth, bytes totales y por-archivo ≤ maxTotalBytes). No toca
// filesystem: recibe `RawOutputNode[]` (puede provenir de un seam/fake en tests).
import { ANALYSIS_LIMITS } from "../../domain/traversal/limits.js";
import type { BuildConflict } from "../../domain/build-export/build-outcome.js";
import { isSafeRelativePath } from "../../domain/build-export/build-manifest.js";
import type { RawOutputNode, UnknownOutputNode } from "../../domain/build-export/build-snapshot.js";

export type UnknownNodesResult =
  | { readonly ok: true; readonly nodes: readonly UnknownOutputNode[] }
  | { readonly ok: false; readonly conflicts: readonly BuildConflict[] };

function conflict(path: string | null, message: string): BuildConflict {
  return Object.freeze({ code: "unsupported-unknown-node", path, format: null, severity: "error", message, blocksWrite: true });
}

const ALLOWED = new Set<RawOutputNode["rawKind"]>(["regular-file", "regular-directory"]);

/** Clasifica los nodos desconocidos; cualquier nodo no permitido o límite excedido bloquea. */
export function classifyUnknownNodes(raw: readonly RawOutputNode[]): UnknownNodesResult {
  const conflicts: BuildConflict[] = [];

  if (raw.length > ANALYSIS_LIMITS.maxNodes) {
    conflicts.push(conflict(null, `Demasiados nodos desconocidos (> ${ANALYSIS_LIMITS.maxNodes}).`));
  }

  let totalBytes = 0;
  const nodes: UnknownOutputNode[] = [];
  for (const node of raw) {
    if (!isSafeRelativePath(node.relativePath)) {
      conflicts.push(conflict(null, "Nodo desconocido con path inseguro o fuera del output."));
      continue;
    }
    if (node.depth > ANALYSIS_LIMITS.maxDepth) {
      conflicts.push(conflict(node.relativePath, `Profundidad excedida (> ${ANALYSIS_LIMITS.maxDepth}).`));
      continue;
    }
    if (!ALLOWED.has(node.rawKind)) {
      conflicts.push(conflict(node.relativePath, `Nodo desconocido no soportado: ${node.rawKind}.`));
      continue;
    }
    if (node.rawKind === "regular-file") {
      const size = node.byteLength ?? 0;
      if (size > ANALYSIS_LIMITS.maxTotalBytes) {
        conflicts.push(conflict(node.relativePath, `Archivo desconocido demasiado grande (> ${ANALYSIS_LIMITS.maxTotalBytes} bytes).`));
        continue;
      }
      totalBytes += size;
    }
    nodes.push(
      Object.freeze({
        relativePath: node.relativePath,
        kind: node.rawKind === "regular-file" ? "regular-file" : "regular-directory",
        byteLength: node.rawKind === "regular-file" ? node.byteLength ?? 0 : null,
        depth: node.depth,
        copyAction: "copy",
      }),
    );
  }

  if (totalBytes > ANALYSIS_LIMITS.maxTotalBytes) {
    conflicts.push(conflict(null, `Bytes totales de nodos desconocidos excedidos (> ${ANALYSIS_LIMITS.maxTotalBytes}).`));
  }

  if (conflicts.length > 0) {
    const ordered = [...conflicts].sort((a, b) => (a.path ?? "") < (b.path ?? "") ? -1 : (a.path ?? "") > (b.path ?? "") ? 1 : 0);
    return { ok: false, conflicts: Object.freeze(ordered) };
  }
  return { ok: true, nodes: Object.freeze(nodes) };
}
