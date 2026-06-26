// T011 — Estadísticas de inspección y reglas de conteo (ADR-0010). `byType` usa el tipo EFECTIVO; los
// tipos no reconocidos conservan su literal; los nodos sin tipo determinable caen en `(untyped)`.
// `computeStatistics` es una función pura sobre los resúmenes de nodos (el recorrido llega en Fase 5).
import type { TokenNodeSummary } from "./token-node-summary.js";
import { UNTYPED_CATEGORY } from "../dtcg/recognized-types.js";

/** Conteos del documento de tokens. */
export interface InspectionStatistics {
  /** Total de tokens (incluye aliases). */
  readonly total: number;
  /** Grupos (la raíz NO cuenta como grupo; los grupos vacíos sí). */
  readonly groups: number;
  /** Tokens cuyo `$value` es un valor concreto (no alias). */
  readonly concreteValues: number;
  /** Tokens cuyo `$value` es una referencia. */
  readonly aliases: number;
  /** Conteo por tipo efectivo; sin tipo ⇒ `(untyped)`; no reconocido ⇒ su literal. */
  readonly byType: Readonly<Record<string, number>>;
  /** Profundidad máxima alcanzada (raíz = 0). */
  readonly maxDepth: number;
  /** Nº de aliases con estado problemático (missing/to-group/cyclic/malformed). */
  readonly aliasIssues: number;
}

/** Estadísticas vacías (documento sin tokens). */
export const emptyStatistics: InspectionStatistics = {
  total: 0,
  groups: 0,
  concreteValues: 0,
  aliases: 0,
  byType: {},
  maxDepth: 0,
  aliasIssues: 0,
};

/**
 * Calcula las estadísticas a partir de los resúmenes de nodos (tokens) y el número de grupos
 * contado por el recorrido. Reglas: `token = nodo con $value`; `alias = $value referencia`;
 * `concreteValues = total − aliases`; `byType` por tipo efectivo (`(untyped)` si `null`); `maxDepth`
 * = máxima profundidad de token (0 si no hay tokens). Función pura: no muta entradas; determinista.
 */
export function computeStatistics(
  nodes: readonly TokenNodeSummary[],
  groups: number,
): InspectionStatistics {
  let aliases = 0;
  let aliasIssues = 0;
  let maxDepth = 0;
  const byType: Record<string, number> = {};

  for (const node of nodes) {
    if (node.kind === "alias") {
      aliases += 1;
      if (node.aliasState !== "valid" && node.aliasState !== "n/a") aliasIssues += 1;
    }
    if (node.depth > maxDepth) maxDepth = node.depth;
    const key = node.effectiveType ?? UNTYPED_CATEGORY;
    byType[key] = (byType[key] ?? 0) + 1;
  }

  const total = nodes.length;
  return {
    total,
    groups,
    concreteValues: total - aliases,
    aliases,
    byType,
    maxDepth,
    aliasIssues,
  };
}
