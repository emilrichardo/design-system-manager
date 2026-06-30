// T044/T034 — Traducción pura y exhaustiva de resultados → código de salida del proceso. Tabla común
// del binario (ADR-0006). Sin escritura, sin process.exit. Solo la capa CLI conoce estos números.
// Los casos de uso devuelven outcomes SEMÁNTICOS; aquí (y solo aquí) se mapean a códigos.
import type { InitializationResult } from "../domain/result/initialization-result.js";
import type { AnalysisOutcome } from "../application/analysis-ports.js";
import type { PresetsJsonOutcomeV1 } from "../application/presets/json/dto.js";
import type { BuildOutcome } from "../domain/build-export/build-outcome.js";
import type { AssetOutcome } from "../domain/assets/asset-outcome.js";

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

// ── T103 (006) — Mapeo de exit codes de build/export (tabla común; sin cambiar 001–005) ─────────
// `internal-error` y `exported` solo existen en la frontera CLI/adapter, no en el dominio.
export type BuildExportExitOutcome = BuildOutcome | "exported" | "internal-error";

export function exitCodeForBuildExportOutcome(outcome: BuildExportExitOutcome): number {
  switch (outcome) {
    case "built":
    case "exported":
      return 0;
    case "unchanged":
      return 2;
    case "invalid-design-system":
      return 3;
    case "unsupported-value":
    case "conflict":
      return 4;
    case "not-found":
      return 5;
    case "read-error":
    case "write-error":
      return 6;
    case "verification-error":
      return 7;
    case "internal-error":
      return INTERNAL_ERROR_EXIT;
    default: {
      const _exhaustive: never = outcome;
      return INTERNAL_ERROR_EXIT;
    }
  }
}

// ── T045 (007) — Mapeo de exit codes del Asset Manager (tabla común; sin cambiar 001–006) ─────────
// `internal-error` solo existe en la frontera CLI/adapter, no en el dominio.
export type AssetExitOutcome = AssetOutcome | "internal-error";

export function exitCodeForAssetOutcome(outcome: AssetExitOutcome): number {
  switch (outcome) {
    case "listed":
    case "inspected":
    case "planned":
    case "applied":
    case "removed":
      return 0;
    case "unchanged":
      return 2;
    case "invalid-asset-store":
      return 3;
    case "unsupported-asset":
    case "conflict":
      return 4;
    case "not-found":
      return 5;
    case "read-error":
    case "write-error":
      return 6;
    case "verification-error":
      return 7;
    case "internal-error":
      return INTERNAL_ERROR_EXIT;
    default: {
      const _exhaustive: never = outcome;
      return INTERNAL_ERROR_EXIT;
    }
  }
}

export type PresetExitOutcome = Exclude<PresetsJsonOutcomeV1, "success"> | "success";

export function exitCodeForPresetOutcome(outcome: PresetExitOutcome): number {
  switch (outcome) {
    case "success":
    case "applied":
      return 0;
    case "unchanged":
      return 2;
    case "invalid-preset":
      return 3;
    case "conflict":
      return 4;
    case "not-found":
      return 5;
    case "read-error":
    case "write-error":
      return 6;
    case "verification-error":
      return 7;
    case "internal-error":
      return INTERNAL_ERROR_EXIT;
    default: {
      const _exhaustive: never = outcome;
      return INTERNAL_ERROR_EXIT;
    }
  }
}
