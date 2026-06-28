// T036 (004) - Serializer JSON foundations v1. Misma forma canonica de bytes que 003, sin compartir
// firma ni tipos: JSON.stringify(envelope, null, 2) + "\n".
import type { FoundationsJsonEnvelopeV1 } from "../../application/foundations/json/dto.js";

export function serializeFoundationsJsonV1(envelope: FoundationsJsonEnvelopeV1): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
