// T014 (006) — Token normalizado y conjunto normalizado. Dominio puro e inmutable: sin filesystem, sin
// Commander, sin streams, sin renderers. Es la proyección estable que consumen los renderers (C/D/E);
// los grupos y los nodos no publicables NO entran aquí.
import type { BuildFormat } from "./build-format.js";
import type { FoundationCategoryId } from "../foundations/foundation-category.js";
import type { FoundationLevel } from "../foundations/foundation-level.js";
import type { NodeTrust } from "../analysis/token-node-summary.js";

/** Representabilidad preliminar por formato (el detalle CSS exacto se decide en el Checkpoint C). */
export interface FormatCompatibility {
  readonly format: BuildFormat;
  readonly representable: boolean;
  readonly reason: string | null;
}

/** Aviso no bloqueante de la proyección (deterministay seguro; sin rutas absolutas ni `Error`). */
export interface BuildProjectionIssue {
  readonly code: string;
  readonly path: string | null;
  readonly message: string;
  readonly severity: "warning";
}

/** Token publicable normalizado, derivado del análisis único (002) y la proyección foundations (004). */
export interface NormalizedBuildToken {
  readonly path: string;
  readonly segments: readonly string[];
  /** Categoría foundation canónica, o `null` si el token no es atribuible (unresolved). */
  readonly category: FoundationCategoryId | null;
  readonly foundationLevel: FoundationLevel;
  /** `$type` efectivo del análisis (nunca `null`: un tipo no resuelto bloquea la proyección). */
  readonly effectiveType: string;
  /** `$value` declarado (copia defensiva, JSON-safe). */
  readonly sourceValue: unknown;
  /** Valor final resuelto (copia defensiva, JSON-safe). */
  readonly resolvedValue: unknown;
  /** Target de alias inmediato, o `null` en un token concreto. */
  readonly aliasOf: string | null;
  /** Cadena inmediato→final (`[]` en un token concreto). */
  readonly aliasChain: readonly string[];
  readonly description: string | null;
  readonly trust: NodeTrust;
  /** Índice de orden canónico (asignado tras ordenar). */
  readonly order: number;
  readonly compatibility: readonly FormatCompatibility[];
}

/** Conjunto normalizado completo (nunca parcial). */
export interface NormalizedTokenSet {
  readonly source: { readonly logicalPath: string; readonly sourceHash: string };
  readonly tokens: readonly NormalizedBuildToken[];
  readonly byPath: ReadonlyMap<string, NormalizedBuildToken>;
  readonly warnings: readonly BuildProjectionIssue[];
}
