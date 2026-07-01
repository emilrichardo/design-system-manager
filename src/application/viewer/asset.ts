// T005 (009) — Tipos de `ViewerAssetV1` (data-model.md, contracts/viewer-asset-v1.contract.md). Solo
// tipos en Checkpoint A; `projectAsset` llega en Checkpoint E. Mapeo 1:1 desde `007` `AssetRecord`/
// `AssetInspection`; sin bytes crudos (FR-006/FR-014).
import type { AssetKind } from "../../domain/assets/asset-kind.js";
import type { AssetMimeType } from "../../domain/assets/asset-mime.js";
import type {
  AssetDimensions,
  AssetLicense,
  AssetProvenance,
} from "../../domain/assets/asset-record.js";
import type { OwnershipState, SvgSanitizationPreview } from "../assets/asset-ports.js";
import type { ViewerIssueV1 } from "./issue.js";

/**
 * Proyección 1:1 de un asset administrado (FR-014): ninguna dimensión/hash/MIME se recalcula — todo
 * proviene de la única observación del asset store que `007` ya hizo para la sesión.
 */
export interface ViewerAssetV1 {
  readonly logicalPath: string;
  readonly kind: AssetKind;
  readonly mimeType: AssetMimeType;
  readonly byteLength: number;
  readonly contentHash: string;
  readonly dimensions: AssetDimensions | null;
  readonly provenance: AssetProvenance;
  readonly license: AssetLicense;
  /** Solo SVG; `null` para todo otro `kind` (mirrors `007`, sanitización es un concepto SVG-only). */
  readonly sanitization: SvgSanitizationPreview | null;
  readonly ownership: { readonly state: OwnershipState };
  readonly issues: readonly ViewerIssueV1[];
}
