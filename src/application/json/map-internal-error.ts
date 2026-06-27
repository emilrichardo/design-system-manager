// T013 (003) — Envelope de error interno (EXCLUSIVO de la frontera CLI; NO es un outcome de dominio
// ni se añade a `ValidateDesignSystemResult`/`InspectDesignSystemResult`/`exitCodeForOutcome`). No
// recibe el error original: el mensaje es una constante segura y fija; jamás se exponen
// stack/cause/paths/mensaje crudo/variables de entorno (ADR-0013, contract json-internal-error-v1).
// La escritura a stderr y el exit 70 se conectan en Checkpoint D.
import { JSON_FORMAT_VERSION } from "./format-version.js";
import type { JsonCommand, JsonInternalErrorEnvelopeV1 } from "./dto.js";

/** Código público estable del error interno de la CLI. */
export const INTERNAL_CLI_ERROR_CODE = "internal-cli-error";
/** Mensaje seguro y fijo (no revela detalles internos). */
export const INTERNAL_CLI_ERROR_MESSAGE = "Ocurrió un error interno.";

/** Construye el envelope de error interno para el comando dado. No expone el error original. */
export function toJsonInternalErrorEnvelope(command: JsonCommand): JsonInternalErrorEnvelopeV1 {
  return {
    formatVersion: JSON_FORMAT_VERSION,
    command,
    outcome: "internal-error",
    result: null,
    error: { code: INTERNAL_CLI_ERROR_CODE, message: INTERNAL_CLI_ERROR_MESSAGE },
  };
}
