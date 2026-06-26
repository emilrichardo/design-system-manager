// T004 — Confiabilidad (C3): taxonomía canónica única. Marca por sección/valor, no envuelve cada
// primitivo innecesariamente. NUNCA se usa `trusted`; no hay sinónimos. Dominio puro.

/**
 * Nivel de confiabilidad de un dato inspeccionado:
 * - `valid`       — presente y cumple su contrato.
 * - `recovered`   — presente, recuperado parcialmente de un documento inválido.
 * - `untrusted`   — presente pero no confiable (p. ej. `$type` no reconocido).
 * - `unavailable` — ausente o imposible de recuperar.
 */
export type Trust = "valid" | "recovered" | "untrusted" | "unavailable";

/** Valor inspeccionado con su confiabilidad. `value` ausente cuando `trust === "unavailable"`. */
export interface InspectedValue<T> {
  readonly value?: T;
  readonly trust: Trust;
}

export function valid<T>(value: T): InspectedValue<T> {
  return { value, trust: "valid" };
}

export function recovered<T>(value: T): InspectedValue<T> {
  return { value, trust: "recovered" };
}

export function untrusted<T>(value: T): InspectedValue<T> {
  return { value, trust: "untrusted" };
}

/** Dato no disponible: sin `value`. */
export const unavailable: InspectedValue<never> = { trust: "unavailable" };
