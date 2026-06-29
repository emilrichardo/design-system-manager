import type { PresetsJsonEnvelopeV1 } from "../../application/presets/json/dto.js";

export function serializePresetsJsonV1(envelope: PresetsJsonEnvelopeV1<unknown>): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}
