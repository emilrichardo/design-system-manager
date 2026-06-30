// T002 (007) — Entrada de asset administrado y sus submodelos. Dominio puro e inmutable: sin bytes
// completos, sin `Error`, sin rutas absolutas. La licencia NUNCA se asume (status `declared` solo con
// valor explícito). Los paths son lógicos y relativos bajo `design-system/assets/`.
import type { AssetKind } from "./asset-kind.js";
import type { AssetMimeType } from "./asset-mime.js";

/** Dimensiones de un asset; `null` cuando el formato no las declara (nunca se adivinan). */
export interface AssetDimensions {
  readonly width: number | null;
  readonly height: number | null;
  /** `px` raster, `user` para unidades de usuario SVG, `null` cuando se desconoce. */
  readonly unit: "px" | "user" | null;
}

/** Procedencia del asset. En v1 solo `local-import` con una referencia relativa segura. */
export interface AssetProvenance {
  readonly kind: "local-import";
  readonly sourceRef: string;
}

/** Licencia explícita; `unspecified` implica identificador y notice nulos (nunca asumida). */
export interface AssetLicense {
  readonly status: "declared" | "unspecified";
  readonly identifier: string | null;
  readonly notice: string | null;
}

/** Entrada del manifest de un asset administrado. */
export interface AssetRecord {
  /** Path lógico relativo bajo `design-system/assets/…`, seguro (sin traversal/absolute). */
  readonly logicalPath: string;
  readonly kind: AssetKind;
  readonly mimeType: AssetMimeType;
  /** Tamaño exacto en bytes (≥ 0). */
  readonly byteLength: number;
  /** SHA-256 hex en minúsculas (64 chars) del contenido exacto. */
  readonly contentHash: string;
  /** Dimensiones cuando aplica (raster/svg); `null` para fuentes o cuando se desconocen. */
  readonly dimensions: AssetDimensions | null;
  readonly provenance: AssetProvenance;
  readonly license: AssetLicense;
}

/** Licencia no especificada canónica (única forma válida sin valor explícito). */
export const UNSPECIFIED_LICENSE: AssetLicense = Object.freeze({ status: "unspecified", identifier: null, notice: null });

/** Construye una licencia declarada a partir de metadata EXPLÍCITA (identifier y/o notice). */
export function declaredLicense(input: { readonly identifier?: string | null; readonly notice?: string | null }): AssetLicense {
  const identifier = input.identifier ?? null;
  const notice = input.notice ?? null;
  if (identifier === null && notice === null) {
    // Sin valor explícito no puede ser `declared`: degrada a `unspecified` (nunca se asume licencia).
    return UNSPECIFIED_LICENSE;
  }
  return Object.freeze({ status: "declared", identifier, notice });
}

/** Invariante de licencia: `unspecified` ⇒ identifier y notice nulos. */
export function licenseInvariantHolds(license: AssetLicense): boolean {
  if (license.status === "unspecified") return license.identifier === null && license.notice === null;
  return license.identifier !== null || license.notice !== null;
}
