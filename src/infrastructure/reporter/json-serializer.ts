// T014 (003) — Serializer JSON v1. Responsabilidad ÚNICA: convertir un envelope (ya JSON-safe,
// construido por los mappers de aplicación) en su representación textual canónica
// `JSON.stringify(envelope, null, 2) + "\n"`. Función pura: no muta, no clona, no mapea, no conoce
// validate/inspect, no selecciona streams, no calcula exit codes, no ordena arrays, no filtra campos,
// no aplica la cota de 200. Si `JSON.stringify` lanza (contrato violado), la excepción se PROPAGA
// (el manejo CLI es del Checkpoint D). Capa de presentación: NO conoce la abstracción de IO.
import type { JsonEnvelopeV1 } from "../../application/json/dto.js";

/** Serializa un envelope JSON v1 a texto: 2 espacios de indentación + un newline final. */
export function serializeJsonV1(envelope: JsonEnvelopeV1): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
