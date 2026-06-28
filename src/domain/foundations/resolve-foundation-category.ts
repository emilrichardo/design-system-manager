// T013 (004) — Resolución PURA de categoría foundation por path (ADR-0015; contract
// foundation-category-definition-v1). Regla determinista: el PRIMER segmento del token path debe ser
// EXACTAMENTE un id del registro canónico; si no, `"unresolved"`. Sin plurales/sinónimos/case-folding/
// trim/locale/normalización Unicode; sin inferencia por `$type`/nivel/alias. No muta ni repara el
// input; no normaliza paths (la convención de paths la fija 002 vía `tokenPath`). Dominio puro.
import type { FoundationCategoryRef } from "./category-state.js";
import { isFoundationCategoryId } from "./foundation-category.js";

/**
 * Resuelve la categoría de un token a partir de su path lógico (`a.b.c`).
 * - Toma el primer segmento (texto anterior al primer `.`, o el path completo si no hay `.`).
 * - Devuelve ese segmento como `FoundationCategoryId` solo si coincide EXACTAMENTE con el registro.
 * - En cualquier otro caso (segmento vacío, path malformado, plural, sinónimo, mayúsculas) →
 *   `"unresolved"`. No lanza ante strings inesperados.
 */
export function resolveFoundationCategory(tokenPath: string): FoundationCategoryRef {
  const dot = tokenPath.indexOf(".");
  const firstSegment = dot === -1 ? tokenPath : tokenPath.slice(0, dot);
  return isFoundationCategoryId(firstSegment) ? firstSegment : "unresolved";
}
