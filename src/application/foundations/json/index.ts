// Barrel del contrato JSON foundations v1. Aislado del contrato JSON 003.
export { FOUNDATIONS_JSON_FORMAT_VERSION } from "./format-version.js";
export type { FoundationsJsonFormatVersion } from "./format-version.js";
export * from "./dto.js";
export { toFoundationsJsonEnvelope } from "./map-foundations.js";
export {
  FOUNDATIONS_INTERNAL_CLI_ERROR_CODE,
  FOUNDATIONS_INTERNAL_CLI_ERROR_MESSAGE,
  toFoundationsInternalErrorEnvelope,
} from "./map-internal-error.js";
