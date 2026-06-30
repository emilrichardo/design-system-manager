// T109/T119 (006) — Modelos de snapshot del output y estados de publicación. Dominio puro: sin
// filesystem, sin rutas absolutas, sin link targets. El snapshot describe el estado observado de
// `design-system/build/` antes de publicar; los symlinks/nodos especiales nunca se siguen.
import type { BuildFormat } from "./build-format.js";

/** Estado en disco de un required path (sin seguir symlinks). */
export type RequiredPathState = "file" | "dir" | "symlink" | "absent" | "other";

export interface RequiredPathStatus {
  readonly relativePath: string;
  readonly state: RequiredPathState;
  /** Hash de contenido cuando es `file` (para concurrencia por bytes/hash, no mtime). */
  readonly contentHash: string | null;
  readonly byteLength: number | null;
}

/** Nodo desconocido (no declarado por un build manifest confiable) bajo `design-system/build/`. */
export interface UnknownOutputNode {
  readonly relativePath: string;
  readonly kind: "regular-file" | "regular-directory" | "unsupported";
  readonly byteLength: number | null;
  readonly depth: number;
  readonly copyAction: "copy" | "block";
}

/** Tipo crudo observado por el inspector de filesystem (antes de clasificar). */
export type RawNodeKind =
  | "regular-file"
  | "regular-directory"
  | "symlink"
  | "socket"
  | "fifo"
  | "block-device"
  | "char-device"
  | "other";

export interface RawOutputNode {
  readonly relativePath: string;
  readonly rawKind: RawNodeKind;
  readonly byteLength: number | null;
  readonly depth: number;
}

/** Snapshot interno del output (nunca serializado; los resultados públicos resumen conflictos). */
export interface BuildSnapshot {
  readonly source: { readonly hash: string; readonly rereadHash: string | null };
  readonly buildManifestHash: string | null;
  readonly requiredPathStates: readonly RequiredPathStatus[];
  readonly unknownNodes: readonly UnknownOutputNode[];
  readonly parents: readonly RequiredPathStatus[];
}

/** Estados de la máquina de publicación; el commit point es `candidate-published`. */
export type PublicationState =
  | "not-started"
  | "staging-created"
  | "staging-verified"
  | "backup-created"
  | "prior-moved-to-backup"
  | "candidate-published"
  | "post-verified"
  | "recovery-required";

/** Orden canónico de los estados de publicación (para tests y trazas deterministas). */
export const PUBLICATION_STATES: readonly PublicationState[] = [
  "not-started",
  "staging-created",
  "staging-verified",
  "backup-created",
  "prior-moved-to-backup",
  "candidate-published",
  "post-verified",
  "recovery-required",
] as const;

/** El commit point: a partir de aquí `wrote:true` y no hay rollback automático. */
export const COMMIT_POINT: PublicationState = "candidate-published";

export type ArtifactFormatFor = BuildFormat;
