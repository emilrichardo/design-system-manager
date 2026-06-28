// T003 (004) — Estado por categoría y referencia de categoría de un token (dominio puro). Aquí solo
// se definen los tipos y la precedencia canónica; el cálculo del estado llega en el Checkpoint D.
import type { FoundationCategoryId } from "./foundation-category.js";

/** Estado derivado de una categoría (descriptivo; NO es un outcome global). */
export type FoundationCategoryState = "absent" | "partial" | "complete" | "invalid";

/** Categoría atribuida a un token: una de las nueve, o `"unresolved"` si no es atribuible. */
export type FoundationCategoryRef = FoundationCategoryId | "unresolved";

/**
 * Precedencia canónica cuando varias condiciones aplican: `invalid > partial > complete > absent`.
 * Explícita e inmutable (no depende del orden alfabético ni del orden del union). Índice mayor = mayor
 * precedencia (se elige el estado con mayor rango).
 */
export const FOUNDATION_CATEGORY_STATE_PRECEDENCE: readonly FoundationCategoryState[] = Object.freeze([
  "absent",
  "complete",
  "partial",
  "invalid",
]);

/** Señales mínimas para derivar el estado de una categoría sin acoplarla a la capa de aplicación. */
export interface ComputeCategoryStateInput {
  readonly tokenCount: number;
  readonly invalid: boolean;
  readonly partial: boolean;
}

/**
 * Deriva el estado descriptivo de una categoría usando la precedencia canónica:
 * `invalid > partial > complete > absent`.
 */
export function computeCategoryState(input: ComputeCategoryStateInput): FoundationCategoryState {
  if (input.invalid) return "invalid";
  if (input.partial) return "partial";
  return input.tokenCount > 0 ? "complete" : "absent";
}
