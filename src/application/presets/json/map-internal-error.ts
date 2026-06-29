import { PRESETS_JSON_FORMAT_VERSION } from "./format-version.js";
import type { PresetsJsonCommandV1, PresetsJsonEnvelopeV1 } from "./dto.js";

export const PRESETS_INTERNAL_CLI_ERROR_CODE = "internal-cli-error";
export const PRESETS_INTERNAL_CLI_ERROR_MESSAGE = "Ocurrió un error interno.";

export function toPresetsInternalErrorEnvelope(
  command: PresetsJsonCommandV1,
): PresetsJsonEnvelopeV1<null> {
  return {
    formatVersion: PRESETS_JSON_FORMAT_VERSION,
    command,
    outcome: "internal-error",
    result: null,
    error: {
      code: PRESETS_INTERNAL_CLI_ERROR_CODE,
      message: PRESETS_INTERNAL_CLI_ERROR_MESSAGE,
    },
  };
}
