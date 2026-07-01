// T037 (008) — Acciones del comando `token` (adapter delgado). Delegan por completo en los casos de uso
// headless (`planTokenMutation`/`applyTokenMutation`); no reconstruyen snapshot, planner, diff,
// validación, aliases ni writer. La lectura/parseo del archivo declarativo (`--file`) y la construcción
// del comando de un-único-operación de los shorthands son responsabilidad de la CLI (capa adapter).
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { createTokenMutationCommand, TOKEN_MUTATION_FORMAT_VERSION, type TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import { isTokenMutationOperationKind, type TokenMutationOperationV1 } from "../../domain/token-mutations/operation.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import { planTokenMutation, type PlanTokenMutationDependencies } from "../../application/token-mutations/plan-token-mutation.js";
import { applyTokenMutation, type ApplyTokenMutationDependencies } from "../../application/token-mutations/apply-token-mutation.js";

/** Error de USO (frontera CLI): archivo de comando ausente, no-JSON o con forma inválida. Nunca llega al
 * dominio/aplicación; el programa lo traduce a exit 3 con un mensaje seguro (sin path absoluto/stack). */
export class TokenCommandFileError extends Error {}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Lee y parsea `--file <command.json>` en un `TokenMutationCommandV1`; valida solo la FORMA (formatVersion,
 * operations[], kind reconocido). La validación semántica (paths, existencia, colisiones…) la hace `validateCommand`. */
export async function readTokenMutationCommandFile(filePath: string, cwd: string): Promise<TokenMutationCommandV1> {
  const abs = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  let text: string;
  try {
    text = await readFile(abs, "utf8");
  } catch {
    throw new TokenCommandFileError("No se pudo leer el archivo de comando.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TokenCommandFileError("El archivo de comando no es JSON válido.");
  }
  if (!isPlainRecord(parsed) || parsed.formatVersion !== TOKEN_MUTATION_FORMAT_VERSION || !Array.isArray(parsed.operations)) {
    throw new TokenCommandFileError("El archivo de comando no tiene la forma esperada de TokenMutationCommandV1.");
  }
  for (const op of parsed.operations) {
    if (!isPlainRecord(op) || !isTokenMutationOperationKind(op.kind)) {
      throw new TokenCommandFileError("Una operación del comando no tiene un `kind` reconocido.");
    }
  }
  return createTokenMutationCommand(parsed.operations as TokenMutationOperationV1[]);
}

/** Interpreta `--value` como JSON cuando es posible (objetos/números/booleanos); si no, lo trata como
 * string literal (p. ej. un hex de color o un alias `{a.b.c}` sin comillas adicionales). */
export function parseValueFlag(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function singleOperationCommand(op: TokenMutationOperationV1): TokenMutationCommandV1 {
  return createTokenMutationCommand([op]);
}

export function runTokenPlan(executionDir: string, command: TokenMutationCommandV1, deps: PlanTokenMutationDependencies): Promise<TokenMutationResultV1> {
  return planTokenMutation({ executionDir }, command, deps);
}

export function runTokenApply(executionDir: string, command: TokenMutationCommandV1, deps: ApplyTokenMutationDependencies): Promise<TokenMutationResultV1> {
  return applyTokenMutation({ executionDir }, command, deps);
}
