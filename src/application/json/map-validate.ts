// T009 (003) — Mapper puro `ValidateDesignSystemResult` → `JsonValidateEnvelopeV1`. Recibe el
// resultado público YA clasificado por `validateDesignSystem`; NO analiza, NO resuelve host, NO lee
// fs, NO recalcula validez/estadísticas, NO reclasifica outcomes, NO escribe streams. Construye el
// envelope JSON-safe en orden canónico (formatVersion, command, outcome, result[, error]) reutilizando
// los mappers comunes. `not-found` → `result: null`, `error: null` (hostError no se puebla en v1,
// contrato remediado). Switch exhaustivo con guarda `never` (ADR-0011/0013).
import type { ValidateDesignSystemResult } from "../analysis-ports.js";
import { JSON_FORMAT_VERSION } from "./format-version.js";
import type { JsonValidateEnvelopeV1, JsonValidateResultV1 } from "./dto.js";
import { toJsonHost } from "./map-common.js";
import { toJsonValidation } from "./map-validation.js";

/** Proyecta el resultado público de validate al envelope JSON v1. */
export function toJsonValidateEnvelope(
  result: ValidateDesignSystemResult,
): JsonValidateEnvelopeV1 {
  switch (result.outcome) {
    case "valid":
    case "complete-invalid":
    case "partial":
    case "read-error": {
      const validation = toJsonValidation(result.report);
      const resultDto: JsonValidateResultV1 = {
        host: toJsonHost(result.host),
        structuralState: validation.structuralState,
        valid: validation.valid,
        checkedDocuments: validation.checkedDocuments,
        uncheckedDocuments: validation.uncheckedDocuments,
        summary: validation.summary,
        errors: validation.errors,
        warnings: validation.warnings,
        limits: validation.limits,
      };
      return {
        formatVersion: JSON_FORMAT_VERSION,
        command: "validate",
        outcome: result.outcome,
        result: resultDto,
      };
    }
    case "not-found":
      return {
        formatVersion: JSON_FORMAT_VERSION,
        command: "validate",
        outcome: "not-found",
        result: null,
        error: null, // `hostError` reservado, no poblado en v1
      };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
