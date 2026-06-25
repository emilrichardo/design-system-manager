// T016 — ValidationResult: distingue errores críticos (bloquean) de advertencias (no bloquean).
import type { Issue } from "../issue.js";

export interface ValidationResult {
  /** true si no hay errores críticos. */
  readonly ok: boolean;
  readonly errors: readonly Issue[];
  readonly warnings: readonly Issue[];
}

/** Construye un ValidationResult; `ok` se deriva de la ausencia de errores. */
export function validationResult(
  errors: readonly Issue[] = [],
  warnings: readonly Issue[] = [],
): ValidationResult {
  return { ok: errors.length === 0, errors, warnings };
}

export const validResult: ValidationResult = { ok: true, errors: [], warnings: [] };
