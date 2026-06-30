// T037 (007) — Decisión de idempotencia para `apply`: decide `unchanged` ANTES de stagear. Es unchanged
// cuando no hay eliminaciones, el manifest deseado es idéntico al previo, y cada archivo a escribir ya
// está presente en disco con el mismo hash (manifest + hashes + bytes + paths + presencia). Pura.
import type { ManagedPathStatus } from "./asset-ports.js";

export interface IdempotencyInput {
  readonly priorManifestHash: string | null;
  readonly desiredManifestHash: string;
  readonly writes: readonly { readonly logicalPath: string; readonly contentHash: string }[];
  readonly deletes: readonly string[];
  /** Estados en disco de los paths administrados (hash por path). */
  readonly onDisk: readonly ManagedPathStatus[];
}

export interface IdempotencyDecision {
  readonly unchanged: boolean;
  readonly reason: string | null;
}

export function decideUnchanged(input: IdempotencyInput): IdempotencyDecision {
  if (input.deletes.length > 0) return { unchanged: false, reason: "deletions-pending" };
  if (input.priorManifestHash !== input.desiredManifestHash) return { unchanged: false, reason: "manifest-changed" };
  const hashByPath = new Map(input.onDisk.filter((s) => s.state === "file").map((s) => [s.relativePath, s.contentHash]));
  for (const w of input.writes) {
    if (hashByPath.get(w.logicalPath) !== w.contentHash) return { unchanged: false, reason: "write-not-present" };
  }
  return { unchanged: true, reason: null };
}
