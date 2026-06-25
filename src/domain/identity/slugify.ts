// T010 — Derivación de slug desde el nombre (ADR-0003).
// Estrategia determinista:
//   1. Normalización Unicode NFD + eliminación de marcas combinantes (U+0300–U+036F).
//      Esto translitera diacríticos de forma predecible: "é"→"e", "ñ"→"n" (Ñ se
//      descompone en N + tilde combinante, que se elimina), "ü"→"u", etc.
//   2. minúsculas.
//   3. cualquier secuencia de caracteres no [a-z0-9] (espacios, separadores,
//      guiones bajos, símbolos, guiones repetidos) → un único guion.
//   4. recorte de guiones inicial/final.
//   5. si el resultado queda vacío → error (requiere edición manual).
import type { Result } from "../errors.js";
import { err } from "../errors.js";
import type { Slug } from "./slug.js";
import { createSlug } from "./slug.js";

export function deriveSlug(name: string): Result<Slug> {
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length === 0) {
    return err(
      "slug-empty-derivation",
      `No se pudo derivar un slug válido desde "${name}". Ingrese un slug manualmente.`,
      { name },
    );
  }
  // Defensa en profundidad: el resultado debe cumplir la regex contractual.
  return createSlug(normalized);
}
