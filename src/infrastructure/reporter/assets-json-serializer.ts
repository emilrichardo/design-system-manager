// T023 (007) — Serializer determinista de `AssetJsonEnvelopeV1`: 2 espacios, UTF-8, sin BOM, LF final
// único. No muta el envelope. Independiente del serializer de `003`.
import type { AssetJsonEnvelopeV1 } from "../../application/assets/json/map-assets.js";

export function serializeAssetJsonV1(envelope: AssetJsonEnvelopeV1): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
