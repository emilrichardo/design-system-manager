// T006 (007) — Superficie pública del dominio de assets. Solo tipos y funciones puras; sin filesystem,
// sin CLI, sin probes/writer (checkpoints posteriores). Los assets son independientes de los tokens DTCG.
export type { AssetKind } from "./asset-kind.js";
export { ASSET_KINDS, isAssetKind } from "./asset-kind.js";

export type { AssetMimeType } from "./asset-mime.js";
export {
  ASSET_MIME_TYPES,
  FONT_MIME_TYPES,
  RASTER_MIME_TYPES,
  VECTOR_MIME_TYPE,
  isAssetMimeType,
  isMimeCompatibleWithKind,
} from "./asset-mime.js";

export type { AssetDimensions, AssetProvenance, AssetLicense, AssetRecord } from "./asset-record.js";
export { UNSPECIFIED_LICENSE, declaredLicense, licenseInvariantHolds } from "./asset-record.js";

export type { AssetManifestV1, AssetManifestValidation } from "./asset-manifest.js";
export {
  ASSET_MANIFEST_FORMAT_VERSION,
  ASSET_MANIFEST_FILENAME,
  ASSET_STORE_ROOT,
  EMPTY_ASSET_MANIFEST,
  isSha256Hex,
  isSafeAssetPath,
  validateAssetManifestV1,
  serializeAssetManifestV1,
} from "./asset-manifest.js";

export type { AssetOutcome, AssetIssueCode, AssetIssue, AssetRecoveryState, SafeAssetError } from "./asset-outcome.js";
export { ASSET_OUTCOMES, wroteInvariantHolds, recoveryInvariantHolds } from "./asset-outcome.js";

export type { OrderableAsset } from "./asset-order.js";
export { compareAssets, orderAssets } from "./asset-order.js";

export type { AssetLimits } from "./asset-limits.js";
export { ASSET_LIMITS } from "./asset-limits.js";
