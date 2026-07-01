// T004 (009) — Tipos de `ViewerTypographyV1`/`ViewerLicenseState` (data-model.md,
// contracts/viewer-typography-v1.contract.md). Solo tipos en Checkpoint A; `projectTypography` llega en
// Checkpoint D (junto con el enlace a assets de fuente de `007`).
import type { ViewerTokenV1, SafeJsonValue } from "./token.js";
import type { ViewerAssetV1 } from "./asset.js";

/**
 * Estado de licencia mostrado en la vista Typography (data-model.md, enumeración `ViewerLicenseState`).
 * `no-matching-asset` es específico del Viewer (nunca persistido ni escrito a `007`).
 */
export type ViewerLicenseState = "declared" | "unspecified" | "no-matching-asset";

/**
 * Proyección de un token typography (`category === "typography"`). Todo subcampo es `null` cuando el
 * valor DTCG resuelto no lo declara — nunca un default/adivinado (FR-011).
 */
export interface ViewerTypographyV1 {
  readonly token: ViewerTokenV1;
  readonly family: string | null;
  readonly weight: string | number | null;
  readonly style: string | null;
  readonly size: SafeJsonValue | null;
  readonly lineHeight: SafeJsonValue | null;
  readonly letterSpacing: SafeJsonValue | null;
  readonly linkedFontAsset: ViewerAssetV1 | null;
  readonly licenseState: ViewerLicenseState;
}
