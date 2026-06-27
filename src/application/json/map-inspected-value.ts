// T005 (003) — Mapper puro `InspectedValue<T>` → `JsonInspectedValueV1<T>`. El dominio deja `value`
// OPCIONAL (ausente cuando `trust === "unavailable"`); el JSON NO depende de esa omisión: normaliza
// a `value: null`. `value` y `trust` SIEMPRE presentes; nunca `undefined`. No muta; no inventa
// defaults; preserva los cuatro niveles de confianza (ADR-0011, contract json-inspected-value-v1).
import type { InspectedValue } from "../../domain/analysis/inspected-value.js";
import type { JsonInspectedValueV1 } from "./dto.js";

/** Normaliza un `InspectedValue<T>` (o ausencia) al DTO estable `{ value, trust }`. */
export function toJsonInspectedValue<T>(
  iv: InspectedValue<T> | undefined,
): JsonInspectedValueV1<T> {
  if (iv === undefined) return { value: null, trust: "unavailable" };
  return { value: iv.value ?? null, trust: iv.trust };
}
