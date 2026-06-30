// T099 (006) — Serializer determinista del envelope público de build. Independiente de los serializers
// de 003/004/005 (sin cast). 2 espacios + LF final, UTF-8 sin BOM. El orden de claves lo fija el mapper
// (objeto ya ordenado); `JSON.stringify` preserva ese orden de inserción. No muta el envelope.
import type { BuildJsonEnvelopeV1 } from "../../application/build-export/build-json/map-build.js";

export function serializeBuildJsonV1(envelope: BuildJsonEnvelopeV1): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
