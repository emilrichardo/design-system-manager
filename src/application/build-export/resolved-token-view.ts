// T009/T010 (006) — Construcción pura de `ResolvedTokenView` a partir del análisis único. Reutiliza el
// grafo de aliases y los tipos efectivos ya calculados por `002` (NO construye un segundo resolver). Los
// errores de alias (missing/cyclic/to-group) conservan su estado tipado y NO se convierten en valores
// fallback. Capa de aplicación: pura, sin filesystem ni infraestructura.
import type { DesignSystemAnalysis } from "../../domain/analysis/design-system-analysis.js";
import type { TokenNodeSummary } from "../../domain/analysis/token-node-summary.js";
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import type { ResolvedTokenRecord, ResolvedTokenView, TokenResolutionMap } from "./build-ports.js";

/** Lee el `$value` declarado del token ubicado en `path` dentro del documento parseado. */
function declaredValueAt(parsed: unknown, path: string): unknown {
  let node: unknown = parsed;
  for (const segment of path.split(".")) {
    if (node === null || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[segment];
  }
  if (node !== null && typeof node === "object" && "$value" in (node as Record<string, unknown>)) {
    return (node as Record<string, unknown>).$value;
  }
  return null;
}

/**
 * Resuelve el valor final siguiendo el alias inmediato→final mientras cada eslabón sea un alias válido.
 * Devuelve `{ resolvedValue, aliasChain }`. Ante un eslabón roto/no válido, detiene la cadena sin
 * fabricar un valor (conserva el valor declarado del token de origen).
 */
function resolveChain(
  node: TokenNodeSummary,
  byNodePath: ReadonlyMap<string, TokenNodeSummary>,
  declaredValueOf: (path: string) => unknown,
): { readonly resolvedValue: unknown; readonly aliasChain: readonly string[] } {
  if (node.kind !== "alias" || node.aliasTarget === null) {
    return { resolvedValue: declaredValueOf(node.path), aliasChain: [] };
  }
  const chain: string[] = [];
  const visited = new Set<string>([node.path]);
  let current: TokenNodeSummary = node;
  // Solo seguimos cuando el eslabón actual es un alias válido con target conocido.
  while (current.kind === "alias" && current.aliasState === "valid" && current.aliasTarget !== null) {
    const targetPath = current.aliasTarget;
    chain.push(targetPath);
    if (visited.has(targetPath)) break; // defensa anti-ciclo (el análisis ya lo marca)
    visited.add(targetPath);
    const target = byNodePath.get(targetPath);
    if (target === undefined) break; // target ausente: la cadena no continúa
    if (target.kind !== "alias") {
      return { resolvedValue: declaredValueOf(target.path), aliasChain: chain };
    }
    current = target;
  }
  // Alias no resuelto a un valor concreto: sin fallback fabricado.
  return { resolvedValue: declaredValueOf(node.path), aliasChain: chain };
}

/** Construye la vista de resolución desde el análisis único y el `sourceHash` de la fuente. */
export function buildResolvedTokenView(analysis: DesignSystemAnalysis, sourceHash: string): ResolvedTokenView {
  const parsed = analysis.documents[MANAGED_FILES.tokens]?.parsed;
  const byNodePath = new Map<string, TokenNodeSummary>();
  for (const node of analysis.nodes) byNodePath.set(node.path, node);
  const declaredValueOf = (path: string): unknown => declaredValueAt(parsed, path);

  const tokens: ResolvedTokenRecord[] = analysis.nodes.map((node) => {
    const declaredValue = declaredValueOf(node.path);
    const { resolvedValue, aliasChain } = resolveChain(node, byNodePath, declaredValueOf);
    return Object.freeze({
      path: node.path,
      declaredValue,
      resolvedValue,
      immediateAliasTarget: node.kind === "alias" ? node.aliasTarget : null,
      aliasChain: Object.freeze([...aliasChain]),
      effectiveType: node.effectiveType,
      aliasState: node.aliasState,
      trust: node.trust,
    });
  });

  const byPath: TokenResolutionMap = new Map(tokens.map((t) => [t.path, t]));
  return Object.freeze({ tokens: Object.freeze(tokens), byPath, sourceHash });
}
