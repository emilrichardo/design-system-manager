// T008 — Nombre del Design System: obligatorio, no vacío tras recortar espacios externos.
import type { Result } from "../errors.js";
import { err, ok } from "../errors.js";

export interface Name {
  readonly value: string;
}

/** Crea un Name válido. Recorta espacios externos; rechaza vacío o solo-espacios. */
export function createName(input: string): Result<Name> {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return err("name-empty", "El nombre del Design System es obligatorio.");
  }
  return ok({ value: trimmed });
}
