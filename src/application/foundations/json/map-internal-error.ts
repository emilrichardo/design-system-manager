// T035 (004) - Envelope de error interno propio de foundations. No recibe ni expone el error
// original; el mensaje publico es fijo y seguro.
import { FOUNDATIONS_JSON_FORMAT_VERSION } from "./format-version.js";
import type { FoundationsJsonCommand, FoundationsJsonEnvelopeV1 } from "./dto.js";

export const FOUNDATIONS_INTERNAL_CLI_ERROR_CODE = "internal-cli-error";
export const FOUNDATIONS_INTERNAL_CLI_ERROR_MESSAGE = "Ocurrió un error interno.";

export function toFoundationsInternalErrorEnvelope(
  command: FoundationsJsonCommand = "foundations",
): FoundationsJsonEnvelopeV1 {
  return {
    formatVersion: FOUNDATIONS_JSON_FORMAT_VERSION,
    command,
    outcome: "internal-error",
    result: null,
    error: {
      code: FOUNDATIONS_INTERNAL_CLI_ERROR_CODE,
      message: FOUNDATIONS_INTERNAL_CLI_ERROR_MESSAGE,
    },
  };
}
