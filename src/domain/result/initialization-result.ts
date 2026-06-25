// T015 — Resultado estructurado de la inicialización (contracts/initialization-result.contract.md).
// Datos semánticos para múltiples presentaciones (CLI/TUI/viewer/Studio/MCP).
// El dominio NO traduce a exit codes (eso pertenece a la capa CLI).
import type { Issue } from "../issue.js";

/** Categoría de fallo; su `Issue.code` primario coincide con esta categoría. */
export type FailureCategory = "host" | "validation" | "filesystem" | "post-verify";

export type InitializationResult =
  | { readonly status: "created"; readonly files: readonly string[] }
  | { readonly status: "unchanged"; readonly reason: string }
  | { readonly status: "cancelled" }
  | { readonly status: "conflict"; readonly conflicts: readonly string[] }
  | {
      readonly status: "failed";
      readonly category: FailureCategory;
      readonly errors: readonly Issue[];
    };

export function created(files: readonly string[]): InitializationResult {
  return { status: "created", files };
}
export function unchanged(reason: string): InitializationResult {
  return { status: "unchanged", reason };
}
export function cancelled(): InitializationResult {
  return { status: "cancelled" };
}
export function conflict(conflicts: readonly string[]): InitializationResult {
  return { status: "conflict", conflicts };
}
export function failed(
  category: FailureCategory,
  errors: readonly Issue[],
): InitializationResult {
  return { status: "failed", category, errors };
}
