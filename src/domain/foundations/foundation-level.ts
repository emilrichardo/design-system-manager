// T001 (004) — Nivel foundation y su resolución (dominio puro; sin Node/CLI/infra). El nivel se
// clasifica SOLO por metadata `$extensions` (ADR-0014); aquí se definen los tipos, no la lectura.
// `unclassified` es un estado DERIVADO de inspección y NUNCA un valor persistible (ver
// PersistedFoundationLevel). Sin inferencia por path/nombre/`$type`/alias.

/** Niveles persistibles en `$extensions…foundation.level`. */
export type PersistedFoundationLevel = "primitive" | "semantic";

/** Nivel efectivo de un token (persistible + el estado derivado `unclassified`). */
export type FoundationLevel = PersistedFoundationLevel | "unclassified";

/** Origen del nivel efectivo resuelto. */
export type FoundationLevelSource =
  | "token" // metadata propia del token
  | "group" // heredado del grupo ancestro más cercano (convención Neuraz)
  | "none" // sin metadata propia ni heredada
  | "invalid"; // la declaración aplicable era inválida

/**
 * Resolución del nivel efectivo, con procedencia suficiente para inspección/diagnóstico.
 * - `source === "token" | "group"` ⇒ `level ∈ {primitive, semantic}` y `valid === true`.
 * - `source === "none"`            ⇒ `level === "unclassified"`, `sourcePath === null`, `valid === true`.
 * - `source === "invalid"`         ⇒ `level === "unclassified"`, `valid === false`, `sourcePath` = path del declarante.
 * `sourcePath` es `null` (nunca `undefined`) cuando no hay origen con ruta.
 */
export interface FoundationLevelResolution {
  readonly level: FoundationLevel;
  readonly source: FoundationLevelSource;
  readonly sourcePath: string | null;
  readonly valid: boolean;
}
