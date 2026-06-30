// T018 (007) — Puertos y tipos internos del Asset Manager (capa de aplicación). Solo contratos; sin
// Node, sin Commander, sin filesystem ni infraestructura concreta. La infraestructura implementa estos
// puertos (lectura del store, probes, writer); los casos de uso dependen únicamente de las interfaces.
import type { AssetKind } from "../../domain/assets/asset-kind.js";
import type { AssetMimeType } from "../../domain/assets/asset-mime.js";
import type { AssetRecord } from "../../domain/assets/asset-record.js";
import type { AssetIssue, AssetOutcome, SafeAssetError } from "../../domain/assets/asset-outcome.js";

// ── Observación del asset store (provista por infraestructura, sin seguir symlinks) ────────────────

export type PreviousAssetManifestInput =
  | { readonly state: "absent" }
  | { readonly state: "unreadable" }
  | { readonly state: "parsed"; readonly value: unknown };

export type ManagedPathState = "file" | "dir" | "symlink" | "absent" | "other";

export interface ManagedPathStatus {
  readonly relativePath: string;
  readonly state: ManagedPathState;
  readonly contentHash: string | null;
  readonly byteLength: number | null;
}

export type RawNodeKind = "regular-file" | "regular-directory" | "symlink" | "socket" | "fifo" | "block-device" | "char-device" | "other";

export interface RawAssetNode {
  readonly relativePath: string;
  readonly rawKind: RawNodeKind;
  readonly byteLength: number | null;
  readonly depth: number;
}

export interface AssetStoreObservation {
  readonly manifest: PreviousAssetManifestInput;
  readonly managedPaths: readonly string[];
  readonly managedPathStates: readonly ManagedPathStatus[];
  readonly unknownNodes: readonly RawAssetNode[];
}

/** Puerto: observa `design-system/assets/` (lstat, sin seguir symlinks). */
export interface AssetStorePort {
  observe(): Promise<AssetStoreObservation>;
}

// ── Resumen y resultados de lectura ────────────────────────────────────────────────────────────────

export interface AssetsSummary {
  readonly totalAssets: number;
  readonly byKind: Readonly<Record<AssetKind, number>>;
  readonly totalByteLength: number;
}

export type OwnershipState = "empty" | "trusted" | "untrusted-asset-manifest";

export interface AssetOwnership {
  readonly state: OwnershipState;
  readonly conflicts: readonly AssetIssue[];
}

export interface AssetInspection {
  readonly record: AssetRecord;
  /** Estado de ownership del path inspeccionado. */
  readonly pathState: ManagedPathState;
  readonly issues: readonly AssetIssue[];
}

export interface AssetListResult {
  readonly outcome: Extract<AssetOutcome, "listed" | "invalid-asset-store" | "read-error">;
  readonly assets: readonly AssetRecord[];
  readonly summary: AssetsSummary;
  readonly conflicts: readonly AssetIssue[];
  readonly error: SafeAssetError | null;
}

export interface AssetInspectResult {
  readonly outcome: Extract<AssetOutcome, "inspected" | "not-found" | "invalid-asset-store" | "read-error">;
  readonly inspection: AssetInspection | null;
  readonly conflicts: readonly AssetIssue[];
  readonly error: SafeAssetError | null;
}

/** Re-export del tipo MIME por conveniencia de los consumidores de aplicación. */
export type { AssetMimeType };
