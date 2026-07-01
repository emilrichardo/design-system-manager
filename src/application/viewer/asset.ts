// T005/T039 (009) — Tipos de `ViewerAssetV1` (data-model.md, contracts/viewer-asset-v1.contract.md) y su
// proyección real. Mapeo 1:1 desde `007` `AssetRecord`/`AssetListResult`; sin bytes crudos (FR-006/FR-014).
// Límite conocido: `007` no recalcula ni persiste el estado de sanitización SVG para assets YA
// almacenados (`plan-asset-import.ts` solo lo hace durante el IMPORT, antes de escribir) — `sanitization`
// queda `null` para toda proyección de lectura (nunca se fabrica un resultado de sanitización).
import type { AssetKind } from "../../domain/assets/asset-kind.js";
import type { AssetMimeType } from "../../domain/assets/asset-mime.js";
import type {
  AssetDimensions,
  AssetLicense,
  AssetProvenance,
  AssetRecord,
} from "../../domain/assets/asset-record.js";
import type { AssetListResult, OwnershipState, SvgSanitizationPreview } from "../assets/asset-ports.js";
import { mapAssetIssueToViewerIssue, type ViewerIssueV1 } from "./issue.js";

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

function projectSingleAsset(record: AssetRecord, ownershipState: OwnershipState, issues: readonly ViewerIssueV1[]): ViewerAssetV1 {
  return {
    logicalPath: record.logicalPath,
    kind: record.kind,
    mimeType: record.mimeType,
    byteLength: record.byteLength,
    contentHash: record.contentHash,
    dimensions: record.dimensions,
    provenance: record.provenance,
    license: record.license,
    // `007` no recalcula la sanitización SVG para assets ya almacenados (solo en el import plan); nunca
    // se fabrica un resultado — ver nota de límite conocido al inicio del archivo.
    sanitization: null,
    ownership: { state: ownershipState },
    issues,
  };
}

/**
 * Proyecta todos los assets de un `AssetListResult` (`007`) ya cargado en la sesión (sin una segunda
 * `listAssets`/`store.observe()`). `ownership.state` se deriva del propio resultado: `untrusted-asset-
 * manifest` si hay un conflicto de esa clase, `empty` si no hay assets, `trusted` en otro caso — mismo
 * criterio que `classifyAssetOwnership` (007), sin repetir la observación del store.
 */
export function projectAssetsFromList(result: AssetListResult): readonly ViewerAssetV1[] {
  const ownershipState: OwnershipState = result.conflicts.some((c) => c.code === "untrusted-asset-manifest")
    ? "untrusted-asset-manifest"
    : result.assets.length === 0
      ? "empty"
      : "trusted";
  return result.assets.map((record) =>
    projectSingleAsset(
      record,
      ownershipState,
      result.conflicts.filter((c) => c.path === record.logicalPath).map(mapAssetIssueToViewerIssue),
    ),
  );
}
