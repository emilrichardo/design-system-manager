// T015 (004) — Compatibilidad PURA categoría/tipo (contract foundation-category-definition-v1). Opera
// EXCLUSIVAMENTE sobre el `effectiveType` ya calculado por 002: no lee `$type` del AST, no resuelve
// alias, no busca targets, no recalcula tipos, no infiere desde `$value`. Solo consulta el registro
// canónico (única fuente de verdad). "compatible" NO afirma validación profunda: solo que el tipo
// reconocido pertenece a `supportedTypes` (profundidad real: `color` deep, resto surface, desde el
// registro). Dominio puro.
import type { FoundationCategoryId } from "./foundation-category.js";
import { foundationCategoryDefinition } from "./foundation-category.js";
import { isRecognizedType } from "../dtcg/recognized-types.js";

/**
 * Resultado de compatibilidad (forma canónica de 3 estados, tasks.md T015):
 * - `compatible`: el tipo efectivo reconocido pertenece a `supportedTypes` de la categoría.
 * - `mismatch`:   el tipo efectivo reconocido NO pertenece a `supportedTypes`.
 * - `unknown`:    tipo ausente (`null`) o no reconocido por DTCG (no se reinterpreta como tipo válido).
 */
export type FoundationTypeCompatibility = "compatible" | "mismatch" | "unknown";

/**
 * Clasifica la relación entre una categoría foundation y el tipo efectivo de un token. No emite issues
 * (la emisión de `foundation-type-mismatch` se decide en checkpoints posteriores); no mezcla trust,
 * validez de alias, nivel ni estado de categoría.
 */
export function foundationTypeCompatibility(
  category: FoundationCategoryId,
  effectiveType: string | null,
): FoundationTypeCompatibility {
  if (effectiveType === null || !isRecognizedType(effectiveType)) {
    return "unknown";
  }
  const supported: readonly string[] = foundationCategoryDefinition(category).supportedTypes;
  return supported.includes(effectiveType) ? "compatible" : "mismatch";
}
