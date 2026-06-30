// T001 (008) — Comando de mutación: conjunto ordenado de operaciones aplicado como un todo (all-or-nothing).
// Dominio puro. Es la ÚNICA entrada aceptada para mutar `design-system/tokens/base.tokens.json`.
import type { TokenMutationOperationV1 } from "./operation.js";

export const TOKEN_MUTATION_FORMAT_VERSION = "1.0.0";

export interface TokenMutationCommandV1 {
  readonly formatVersion: typeof TOKEN_MUTATION_FORMAT_VERSION;
  /** Operaciones en orden; se aplican secuencialmente a un modelo de trabajo (todo o nada). */
  readonly operations: readonly TokenMutationOperationV1[];
}

/** Construye un comando inmutable (copia defensiva de la lista). */
export function createTokenMutationCommand(operations: readonly TokenMutationOperationV1[]): TokenMutationCommandV1 {
  return Object.freeze({ formatVersion: TOKEN_MUTATION_FORMAT_VERSION, operations: Object.freeze([...operations]) });
}
