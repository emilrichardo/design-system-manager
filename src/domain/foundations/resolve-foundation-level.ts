// T010 (004) — Resolución PURA del nivel efectivo (ADR-0014; contract foundation-level-resolution-v1).
// Precedencia: declaración propia del token → declaración del grupo ancestro más cercano →
// `unclassified`. Una declaración propia inválida NO hereda del grupo (refleja `invalid`). Un ancestro
// declarante inválido bloquea ancestros más lejanos. No infiere por path/nombre/`$type`/alias.
// Convención Neuraz (no herencia DTCG estándar). Dominio puro, sin recorrer árbol.
import type { FoundationLevelResolution } from "./foundation-level.js";
import type { FoundationDeclaration } from "./parse-foundation-extension.js";

/** Declaración (no ausente) de un ancestro, con su path lógico. */
export interface DeclaringAncestor {
  readonly declaration: FoundationDeclaration;
  readonly path: string;
}

const UNCLASSIFIED_NONE: FoundationLevelResolution = {
  level: "unclassified",
  source: "none",
  sourcePath: null,
  valid: true,
};

/**
 * Resuelve el nivel efectivo de un token a partir de su declaración propia y del ancestro declarante
 * más cercano (grupo cuya declaración NO es `absent`), o `null` si ninguno declaró.
 * - own válido            → token level (source `token`, sourcePath `null`).
 * - own inválido          → unclassified/`invalid`/sourcePath = path del token (no hereda del grupo).
 * - own ausente + ancestro válido   → group level (source `group`, sourcePath = path del grupo).
 * - own ausente + ancestro inválido → unclassified/`invalid`/sourcePath = path del grupo.
 * - own ausente + sin ancestro      → unclassified/`none`/null.
 */
export function resolveFoundationLevel(
  own: FoundationDeclaration,
  ownPath: string,
  nearestAncestor: DeclaringAncestor | null,
): FoundationLevelResolution {
  if (own.kind === "valid") {
    return { level: own.level, source: "token", sourcePath: null, valid: true };
  }
  if (own.kind === "invalid") {
    return { level: "unclassified", source: "invalid", sourcePath: ownPath, valid: false };
  }
  // own ausente: usa el ancestro declarante más cercano (si lo hay).
  if (nearestAncestor === null || nearestAncestor.declaration.kind === "absent") {
    return UNCLASSIFIED_NONE;
  }
  if (nearestAncestor.declaration.kind === "valid") {
    return { level: nearestAncestor.declaration.level, source: "group", sourcePath: nearestAncestor.path, valid: true };
  }
  return { level: "unclassified", source: "invalid", sourcePath: nearestAncestor.path, valid: false };
}
