// T056 (005) — Proyección PURA de un bloque DTCG ya parseado a `ManagedNode[]` (tokens + grupos) para
// el motor de diff del Checkpoint E. Reutiliza datos ya analizados: el `effectiveType` y el foundation
// level efectivo se inyectan por path (no se recalculan aquí). Se usa para AMBOS lados (candidatos del
// preset y estado del host). No muta el documento, no lee filesystem, no resuelve el host.
import type { ManagedNode } from "../../domain/changes/equivalence.js";
import type { FoundationLevel } from "../../domain/foundations/foundation-level.js";
import { resolveFoundationCategory } from "../../domain/foundations/resolve-foundation-category.js";

/** Hechos ya resueltos por `002`/`004` para un path (tipo efectivo + level efectivo). */
export interface ManagedNodeFacts {
  readonly effectiveType: string | null;
  readonly level: FoundationLevel;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function aliasTargetOf(node: Record<string, unknown>): string | null {
  const value = node.$value;
  if (typeof value !== "string") return null;
  const match = /^\{(.+)\}$/.exec(value);
  return match ? (match[1] as string) : null;
}

function cloneJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (isRecord(value)) {
    const cloned: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) cloned[key] = cloneJson(child);
    return cloned;
  }
  return value;
}

function groupFragment(node: Record<string, unknown>): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) out[key] = cloneJson(value);
  }
  return Object.keys(out).length === 0 ? null : out;
}

function walk(
  node: Record<string, unknown>,
  segments: readonly string[],
  facts: ReadonlyMap<string, ManagedNodeFacts>,
  out: ManagedNode[],
): void {
  if ("$value" in node) {
    const path = segments.join(".");
    const known = facts.get(path);
    out.push({
      path,
      nodeKind: "token",
      category: resolveFoundationCategory(path),
      value: node.$value,
      aliasTarget: aliasTargetOf(node),
      effectiveType: known?.effectiveType ?? null,
      level: known?.level ?? "unclassified",
      description: typeof node.$description === "string" ? node.$description : null,
      fragment: cloneJson(node) as Record<string, unknown>,
    });
    return;
  }
  if (segments.length > 0) {
    const path = segments.join(".");
    out.push({
      path,
      nodeKind: "group",
      category: resolveFoundationCategory(path),
      value: null,
      aliasTarget: null,
      effectiveType: null,
      level: "unclassified",
      description: null,
      fragment: groupFragment(node),
    });
  }
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const child = node[key];
    if (isRecord(child)) walk(child, [...segments, key], facts, out);
  }
}

/** Proyecta el bloque parseado a `ManagedNode[]` (tokens y grupos; la raíz no se emite). */
export function projectManagedNodes(
  parsed: unknown,
  facts: ReadonlyMap<string, ManagedNodeFacts>,
): readonly ManagedNode[] {
  const out: ManagedNode[] = [];
  if (isRecord(parsed)) walk(parsed, [], facts, out);
  return out;
}
