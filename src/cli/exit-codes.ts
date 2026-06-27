// T044/T034 — Traducción pura y exhaustiva de resultados → código de salida del proceso. Tabla común
// del binario (ADR-0006). Sin escritura, sin process.exit. Solo la capa CLI conoce estos números.
// Los casos de uso devuelven outcomes SEMÁNTICOS; aquí (y solo aquí) se mapean a códigos.
import type { InitializationResult } from "../domain/result/initialization-result.js";
import type { AnalysisOutcome } from "../application/analysis-ports.js";

export const USAGE_ERROR_EXIT = 3; // errores de uso del parser (entrada inválida)
export const INTERNAL_ERROR_EXIT = 70; // excepción inesperada no contractual (sysexits EX_SOFTWARE)

/**
 * Mapeo común de outcomes de `validate`/`inspect` (ADR-0006): valid→0, complete-invalid→3,
 * partial→4, not-found→5, read-error→6. NO reasigna `2` (unchanged de init). Switch exhaustivo.
 */
export function exitCodeForOutcome(outcome: AnalysisOutcome): number {
  switch (outcome) {
    case "valid":
      return 0;
    case "complete-invalid":
      return 3;
    case "partial":
      return 4;
    case "not-found":
      return 5;
    case "read-error":
      return 6;
    default: {
      const _exhaustive: never = outcome;
      return INTERNAL_ERROR_EXIT;
    }
  }
}

export function exitCodeForResult(result: InitializationResult): number {
  switch (result.status) {
    case "created":
      return 0;
    case "cancelled":
      return 1;
    case "unchanged":
      return 2;
    case "conflict":
      return 4;
    case "failed":
      switch (result.category) {
        case "validation":
          return 3;
        case "host":
          return 5;
        case "filesystem":
          return 6;
        case "post-verify":
          return 7;
      }
  }
}
