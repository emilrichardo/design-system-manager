// T005 (007) — Orden canónico determinista de assets: por kind (orden de registro), luego por
// logicalPath comparado bytewise por code point (sin `localeCompare`, sin locale). Dominio puro.
import { ASSET_KINDS, type AssetKind } from "./asset-kind.js";

export interface OrderableAsset {
  readonly kind: AssetKind;
  readonly logicalPath: string;
}

const KIND_RANK: Readonly<Record<AssetKind, number>> = {
  font: 0,
  logo: 1,
  svg: 2,
  icon: 3,
  image: 4,
};

// Defensa: el ranking debe cubrir exactamente el orden canónico de ASSET_KINDS.
ASSET_KINDS.forEach((k, i) => {
  if (KIND_RANK[k] !== i) throw new Error(`KIND_RANK desalineado con ASSET_KINDS en ${k}`);
});

/** Comparación bytewise por code point (estable, sin locale). */
function compareCodePoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Comparador canónico total: kind primero, luego logicalPath bytewise. */
export function compareAssets(a: OrderableAsset, b: OrderableAsset): number {
  const byKind = KIND_RANK[a.kind] - KIND_RANK[b.kind];
  if (byKind !== 0) return byKind;
  return compareCodePoints(a.logicalPath, b.logicalPath);
}

/** Ordena una colección de assets de forma estable y determinista (copia; no muta la entrada). */
export function orderAssets<T extends OrderableAsset>(assets: readonly T[]): T[] {
  return [...assets].sort(compareAssets);
}
