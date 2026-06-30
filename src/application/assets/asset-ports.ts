// T018 (007) — Puertos y tipos internos del Asset Manager (capa de aplicación). Solo contratos; sin
// Node, sin Commander, sin filesystem ni infraestructura concreta. La infraestructura implementa estos
// puertos (lectura del store, probes, writer); los casos de uso dependen únicamente de las interfaces.
import type { AssetKind } from "../../domain/assets/asset-kind.js";
import type { AssetMimeType } from "../../domain/assets/asset-mime.js";
import type { AssetDimensions, AssetLicense, AssetRecord } from "../../domain/assets/asset-record.js";
import type { AssetIssue, AssetOutcome, AssetRecoveryState, SafeAssetError } from "../../domain/assets/asset-outcome.js";

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
  /** SHA-256 de los bytes de `assets.json`, o `null` si ausente. Para recheck de concurrencia. */
  readonly manifestHash?: string | null;
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

// ── Probes (provistos por infraestructura; puros) ──────────────────────────────────────────────────

export interface SvgSanitizationPreview {
  readonly safe: boolean;
  readonly removed: readonly string[];
  readonly reason: string | null;
}

export interface SvgSanitizationOutput {
  readonly safe: boolean;
  readonly bytes: Uint8Array | null;
  readonly report: SvgSanitizationPreview;
}

export interface FontValidation {
  readonly ok: boolean;
  readonly code: string | null;
  readonly message: string | null;
}

/** Puerto de probes: detección de MIME, dimensiones, validación de fuente, sanitización SVG y hash. */
export interface AssetProbesPort {
  detectMime(bytes: Uint8Array): AssetMimeType | null;
  readDimensions(bytes: Uint8Array, mime: AssetMimeType): AssetDimensions | null;
  validateFont(bytes: Uint8Array, mime?: AssetMimeType): FontValidation;
  sanitizeSvg(bytes: Uint8Array): SvgSanitizationOutput;
  hash(bytes: Uint8Array): string;
}

// ── Import plan (read-only) ──────────────────────────────────────────────────────────────────────

export type ImportVerdict = "add" | "duplicate" | "blocked";

/** Metadata de licencia EXPLÍCITA suministrada para una fuente (nunca se asume). */
export interface ImportLicenseInput {
  readonly identifier?: string | null;
  readonly notice?: string | null;
}

/** Fuente local a importar (bytes ya leídos por el adapter; el plan no toca filesystem). */
export interface ImportSource {
  readonly sourceRef: string;
  readonly bytes: Uint8Array;
  /** Kind solicitado por el usuario; debe ser compatible con el MIME detectado. */
  readonly kind: AssetKind;
  /** Path lógico de destino propuesto (relativo, seguro). */
  readonly destinationPath: string;
  readonly license?: ImportLicenseInput;
}

export interface ImportCandidate {
  readonly sourceRef: string;
  readonly kind: AssetKind | null;
  readonly destinationPath: string | null;
  readonly mimeType: AssetMimeType | null;
  readonly byteLength: number;
  readonly contentHash: string;
  readonly dimensions: AssetDimensions | null;
  readonly verdict: ImportVerdict;
  readonly duplicateOf: string | null;
  readonly license: AssetLicense;
  readonly validation: { readonly ok: boolean; readonly code: string | null; readonly message: string | null };
  readonly sanitization: SvgSanitizationPreview | null;
  readonly issues: readonly AssetIssue[];
}

export interface ImportPlan {
  readonly candidates: readonly ImportCandidate[];
  readonly summary: { readonly add: number; readonly duplicate: number; readonly blocked: number };
}

export interface AssetPlanResult {
  readonly outcome: Extract<AssetOutcome, "planned" | "invalid-asset-store" | "read-error">;
  readonly plan: ImportPlan | null;
  readonly conflicts: readonly AssetIssue[];
  readonly error: SafeAssetError | null;
}

// ── Writer transaccional de conjunto (provisto por infraestructura) ────────────────────────────────

export interface AssetWriteFile {
  readonly logicalPath: string;
  readonly bytes: Uint8Array;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface AssetSetWriteRequest {
  readonly storeRoot: string; // path lógico "design-system/assets"
  readonly operation: "apply" | "remove";
  readonly strategy: "candidate-directory-set-v1";
  /** Archivos a escribir/reemplazar (solo candidatos `add`, ya saneados para SVG). */
  readonly writes: readonly AssetWriteFile[];
  /** Paths lógicos a eliminar. */
  readonly deletes: readonly string[];
  /** Bytes del nuevo `assets.json`. */
  readonly manifest: { readonly bytes: Uint8Array; readonly contentHash: string; readonly byteLength: number };
  /** Estado previo para recheck de concurrencia por bytes/hash (no mtime). */
  readonly prior: { readonly manifestHash: string | null; readonly assetHashes: Readonly<Record<string, string>> };
}

export interface AssetSetWriteResult {
  readonly outcome: "applied" | "removed" | "unchanged" | "conflict" | "unsafe-target" | "write-error" | "verification-error";
  readonly wrote: boolean;
  readonly storeAvailable: boolean;
  readonly backupRelativePath: string | null;
  readonly recoveryRequired: boolean;
  readonly conflicts: readonly AssetIssue[];
  readonly error: { readonly code: string; readonly message: string } | null;
}

/** Puerto del writer transaccional (implementación real en infraestructura). */
export interface AssetSetWriterPort {
  write(request: AssetSetWriteRequest): Promise<AssetSetWriteResult>;
}

/** Resultado público de una operación de escritura (`apply`/`remove`). */
export interface AssetWriteOperationResult {
  readonly outcome: Extract<
    AssetOutcome,
    "applied" | "removed" | "unchanged" | "conflict" | "invalid-asset-store" | "not-found" | "read-error" | "write-error" | "verification-error"
  >;
  readonly wrote: boolean;
  readonly recovery: AssetRecoveryState | null;
  readonly manifestSummary: { readonly relativePath: string; readonly contentHash: string; readonly byteLength: number } | null;
  readonly conflicts: readonly AssetIssue[];
  readonly error: SafeAssetError | null;
}

/** Re-export del tipo MIME por conveniencia de los consumidores de aplicación. */
export type { AssetMimeType };
