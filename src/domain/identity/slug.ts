// T009 — Slug: validación contra la regex contractual (ADR-0003).
import type { Result } from "../errors.js";
import { err, ok } from "../errors.js";

export interface Slug {
  readonly value: string;
}

/** Regex aprobada en ADR-0003. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/**
 * Valida un slug (p. ej. ingresado manualmente). NO lo corrige en silencio:
 * si es inválido devuelve un error de dominio comprensible.
 */
export function createSlug(value: string): Result<Slug> {
  if (!isValidSlug(value)) {
    return err(
      "slug-invalid",
      `Slug inválido: "${value}". Debe usar minúsculas ASCII, dígitos y guiones simples ` +
        `(sin guiones inicial/final ni consecutivos, sin espacios ni caracteres de ruta).`,
      { value },
    );
  }
  return ok({ value });
}
