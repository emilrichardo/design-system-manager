// T015 (006) — Comparador canónico único y determinista. Orden: categoría foundation canónica → path
// padres-antes-que-descendientes → comparación por code points (UTF-16) segmento a segmento. NO usa
// `localeCompare`, no depende del locale, del insertion order ni del filesystem. Dominio puro.
import type { FoundationCategoryId } from "../foundations/foundation-category.js";
import { FOUNDATION_CATEGORY_IDS } from "../foundations/foundation-category.js";

/** Rango de categoría: índice canónico 0..8; `null` (no atribuible) va después de las nueve. */
function categoryRank(category: FoundationCategoryId | null): number {
  if (category === null) return FOUNDATION_CATEGORY_IDS.length;
  const idx = FOUNDATION_CATEGORY_IDS.indexOf(category);
  return idx === -1 ? FOUNDATION_CATEGORY_IDS.length : idx;
}

/**
 * Compara dos paths `a.b.c`: segmento a segmento por code point; si uno es prefijo del otro, el más
 * corto (padre) precede al más largo (descendiente). Sin `localeCompare`.
 */
export function compareTokenPath(a: string, b: string): number {
  const as = a.split(".");
  const bs = b.split(".");
  const n = Math.min(as.length, bs.length);
  for (let i = 0; i < n; i += 1) {
    if (as[i] !== bs[i]) return as[i]! < bs[i]! ? -1 : 1; // comparación por code point (UTF-16)
  }
  return as.length - bs.length; // prefijo (padre) primero
}

/** Entrada mínima para ordenar (categoría + path). */
export interface OrderableToken {
  readonly category: FoundationCategoryId | null;
  readonly path: string;
}

/** Comparador total canónico: categoría → path (padres antes que descendientes, code points). */
export function compareCanonical(a: OrderableToken, b: OrderableToken): number {
  const ra = categoryRank(a.category);
  const rb = categoryRank(b.category);
  if (ra !== rb) return ra - rb;
  return compareTokenPath(a.path, b.path);
}

/** Devuelve una copia ordenada canónicamente (no muta el array de entrada). */
export function orderCanonical<T extends OrderableToken>(tokens: readonly T[]): T[] {
  return [...tokens].sort(compareCanonical);
}
