// T037/T043 (009) — Búsqueda y filtro sobre datos YA cargados en la sesión: funciones puras y
// sincrónicas, cero invocaciones adicionales de casos de uso reusados (FR-016/SC-006). El alcance inicial
// (Checkpoint D) cubre tokens; Checkpoint E extiende a assets y foundations (categoría/nivel ya cubierto
// aquí también sirve para foundations, ver `filterFoundationTokens`).
import type { FoundationCategoryRef } from "../../domain/foundations/category-state.js";
import type { FoundationLevel } from "../../domain/foundations/foundation-level.js";
import type { AssetKind } from "../../domain/assets/asset-kind.js";
import type { AssetMimeType } from "../../domain/assets/asset-mime.js";
import type { ViewerTokenV1 } from "./token.js";
import type { ViewerAssetV1 } from "./asset.js";

export interface TokenSearchFilters {
  /** Substring, sin distinguir mayúsculas/minúsculas, sobre el path lógico. */
  readonly query?: string;
  readonly category?: FoundationCategoryRef;
  readonly level?: FoundationLevel;
  /** Coincidencia exacta contra `effectiveType`. */
  readonly type?: string;
}

/** Filtra tokens ya proyectados por path/categoría/nivel/tipo. Pura: no dispara ninguna carga adicional. */
export function searchTokens(tokens: readonly ViewerTokenV1[], filters: TokenSearchFilters = {}): readonly ViewerTokenV1[] {
  const query = filters.query?.toLowerCase();
  return tokens.filter((token) => {
    if (query !== undefined && query.length > 0 && !token.path.toLowerCase().includes(query)) return false;
    if (filters.category !== undefined && token.category !== filters.category) return false;
    if (filters.level !== undefined && token.level !== filters.level) return false;
    if (filters.type !== undefined && token.effectiveType !== filters.type) return false;
    return true;
  });
}

export interface AssetSearchFilters {
  readonly query?: string;
  readonly kind?: AssetKind;
  readonly mimeType?: AssetMimeType;
  /** `true` exige `license.status === "declared"`; `false` exige `"unspecified"`. */
  readonly licenseDeclared?: boolean;
}

/** Filtra assets ya proyectados por path/kind/MIME/licencia. Pura: sin invocar `listAssets` de nuevo. */
export function searchAssets(assets: readonly ViewerAssetV1[], filters: AssetSearchFilters = {}): readonly ViewerAssetV1[] {
  const query = filters.query?.toLowerCase();
  return assets.filter((asset) => {
    if (query !== undefined && query.length > 0 && !asset.logicalPath.toLowerCase().includes(query)) return false;
    if (filters.kind !== undefined && asset.kind !== filters.kind) return false;
    if (filters.mimeType !== undefined && asset.mimeType !== filters.mimeType) return false;
    if (filters.licenseDeclared !== undefined) {
      const declared = asset.license.status === "declared";
      if (declared !== filters.licenseDeclared) return false;
    }
    return true;
  });
}
