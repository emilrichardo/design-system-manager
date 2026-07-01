// T036 (008) — Serializer determinista del envelope JSON de mutaciones: 2 espacios, LF final único,
// UTF-8, sin BOM. No muta el envelope.
import type { TokenMutationJsonEnvelopeV1 } from "../../application/token-mutations/json/dto.js";

export function serializeTokenMutationJsonV1(envelope: TokenMutationJsonEnvelopeV1): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
