// T046 (005) — Equivalencia ESTRUCTURAL de campos administrados (dominio puro, genérico). Compara un
// candidato contra un nodo existente SIN reserializar ni mutar las entradas. La igualdad estructural
// es insensible al orden de claves de objetos pero SENSIBLE al orden de arrays; números equivalentes
// (`1` y `1.0` parsean al mismo number) son iguales. Campos administrados comparados: `$value`
// (concreto), alias target, `$type` EFECTIVO y foundation level EFECTIVO. `$description` se trata
// aparte (no es diferencia de equivalencia administrada). Sin presets/CLI/JSON/filesystem.
import type { FoundationCategoryRef } from "../foundations/category-state.js";
import type { FoundationLevel } from "../foundations/foundation-level.js";
import type { ProposedTokenFragment } from "./token-change.js";
import type { TokenChangeNodeKind } from "./token-change.js";

/** Nodo normalizado y comparable (candidato u host). Solo datos ya analizados; sin AST mutable/Error. */
export interface ManagedNode {
  readonly path: string;
  readonly nodeKind: TokenChangeNodeKind;
  readonly category: FoundationCategoryRef;
  /** `$value` administrado del token concreto (no alias). `null`/irrelevante para grupos o alias. */
  readonly value: unknown;
  readonly aliasTarget: string | null;
  /** `$type` efectivo ya resuelto por `002` (propio/heredado/alias). */
  readonly effectiveType: string | null;
  /** Foundation level efectivo ya resuelto por `004`. */
  readonly level: FoundationLevel;
  readonly description: string | null;
  readonly fragment?: ProposedTokenFragment | null;
}

/** Campo administrado que difiere primero (prioridad alias/value → type → level), o `null` si equivalen. */
export type ManagedDifference = "value" | "alias" | "type" | "level" | null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Equivalencia estructural de dos valores JSON ya parseados. Insensible al orden de claves de objeto;
 * sensible al orden de arrays. `1 === 1.0` (mismo number). Función pura: no muta ni reserializa.
 */
export function jsonEquivalent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => jsonEquivalent(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(
      (key) => Object.prototype.hasOwnProperty.call(b, key) && jsonEquivalent(a[key], b[key]),
    );
  }
  return false; // primitivos distintos (los iguales ya retornaron por `===`)
}

/**
 * Devuelve el primer campo administrado que difiere entre candidato y host (o `null` si equivalen).
 * Compara únicamente campos administrados; ignora `$extensions`/propiedades desconocidas (preservables)
 * y `$description` (tratado por la política de descripción del planner). No muta las entradas.
 */
export function managedDifference(candidate: ManagedNode, host: ManagedNode): ManagedDifference {
  const candidateIsAlias = candidate.aliasTarget !== null;
  const hostIsAlias = host.aliasTarget !== null;

  if (candidateIsAlias || hostIsAlias) {
    if (candidate.aliasTarget !== host.aliasTarget) return "alias";
  } else if (!jsonEquivalent(candidate.value, host.value)) {
    return "value";
  }

  if (candidate.effectiveType !== host.effectiveType) return "type";
  if (candidate.level !== host.level) return "level";
  return null;
}
