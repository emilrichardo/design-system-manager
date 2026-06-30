// T001 (007) — Tipo de asset administrado. Dominio puro: sin filesystem ni CLI. Conjunto cerrado v1.
// Los assets son una superficie independiente de los tokens DTCG (separación estricta).

/** Tipos de asset soportados en v1, en orden canónico de registro. */
export type AssetKind = "font" | "logo" | "svg" | "icon" | "image";

/** Orden canónico estable (usado por orden, listados y reporters). */
export const ASSET_KINDS: readonly AssetKind[] = ["font", "logo", "svg", "icon", "image"] as const;

/** Guard de runtime: rechaza cualquier valor fuera de la unión. */
export function isAssetKind(value: unknown): value is AssetKind {
  return value === "font" || value === "logo" || value === "svg" || value === "icon" || value === "image";
}
