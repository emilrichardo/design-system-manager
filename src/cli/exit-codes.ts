// T044 — Traducción pura y exhaustiva de InitializationResult → código de salida del proceso
// (contracts/exit-codes.md). Sin escritura, sin process.exitCode. Solo la capa CLI conoce esto.
import type { InitializationResult } from "../domain/result/initialization-result.js";

export const USAGE_ERROR_EXIT = 3; // errores de uso del parser (entrada inválida)
export const INTERNAL_ERROR_EXIT = 70; // excepción inesperada no contractual (sysexits EX_SOFTWARE)

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
