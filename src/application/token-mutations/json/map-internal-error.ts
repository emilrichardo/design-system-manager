// T035 (008) — Envelope de error interno PROPIO de mutaciones de tokens (separado de `003`/`004`/`006`/
// `007`; sin cast a sus uniones). Mensaje fijo y seguro: sin stack, sin cause, sin path absoluto.
import { TOKEN_MUTATION_JSON_FORMAT_VERSION } from "./format-version.js";
import type { TokenMutationJsonCommandV1, TokenMutationJsonEnvelopeV1 } from "./dto.js";

export const TOKEN_MUTATION_INTERNAL_ERROR_CODE = "internal-cli-error";
export const TOKEN_MUTATION_INTERNAL_ERROR_MESSAGE = "Ocurrió un error interno.";

export function toTokenMutationInternalErrorEnvelope(command: TokenMutationJsonCommandV1): TokenMutationJsonEnvelopeV1 {
  return {
    formatVersion: TOKEN_MUTATION_JSON_FORMAT_VERSION,
    command,
    outcome: "internal-error",
    result: null,
    error: { code: TOKEN_MUTATION_INTERNAL_ERROR_CODE, message: TOKEN_MUTATION_INTERNAL_ERROR_MESSAGE, path: null },
  };
}
