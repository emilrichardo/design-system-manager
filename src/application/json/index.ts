// T003 (003) — Barrel del contrato JSON v1 (headless, reutilizable por la composición CLI y futuras
// integraciones MCP/TUI). Exporta SOLO la API pública: versión, DTO v1 y mappers comunes. No expone
// helpers internos, fixtures ni tipos del dominio bajo nombres duplicados. Sin Node/CLI/streams.
export { JSON_FORMAT_VERSION } from "./format-version.js";
export type { JsonFormatVersion } from "./format-version.js";
export * from "./dto.js";
export { toJsonInspectedValue } from "./map-inspected-value.js";
export { toJsonIssue } from "./map-issue.js";
export { toJsonHost, toJsonLimits, toJsonSummary } from "./map-common.js";
export { toJsonValidation } from "./map-validation.js";
export { toJsonValidateEnvelope } from "./map-validate.js";
export { toJsonInspectEnvelope } from "./map-inspect.js";
export {
  toJsonInternalErrorEnvelope,
  INTERNAL_CLI_ERROR_CODE,
  INTERNAL_CLI_ERROR_MESSAGE,
} from "./map-internal-error.js";
