// T006 — Resumen canónico por token (data-model.md; C5). `typeOrigin` es un literal y la ruta del
// grupo fuente va en el campo separado `typeSourcePath` (NUNCA `group:<ruta>`). Dominio puro.

/** Origen del `$type` efectivo (C1/C5). `typeSourcePath` solo se usa con `"group"`. */
export type TypeOrigin = "own" | "alias" | "group" | "none";

/** Clase del nodo según su `$value`. */
export type NodeKind = "concrete" | "alias";

/** Estado del alias de un token (cuando `kind === "alias"`; si no, `"n/a"`). */
export type AliasState = "valid" | "missing" | "to-group" | "cyclic" | "malformed" | "n/a";

/** Confiabilidad del nodo (subconjunto de `Trust` aplicable a un token concreto/recuperado). */
export type NodeTrust = "valid" | "recovered" | "untrusted";

/** Resumen estructurado de un token hallado en el recorrido. */
export interface TokenNodeSummary {
  /** Ruta canónica `a.b.c` (orden de inserción JSON). */
  readonly path: string;
  /** `$type` declarado en el token, o `null`. */
  readonly declaredType: string | null;
  /** `$type` efectivo tras la precedencia C1; `null` si indeterminable. */
  readonly effectiveType: string | null;
  /** Origen del tipo efectivo. */
  readonly typeOrigin: TypeOrigin;
  /** Ruta del grupo fuente cuando `typeOrigin === "group"`; si no, `null` (C5). */
  readonly typeSourcePath: string | null;
  readonly kind: NodeKind;
  /** Ruta destino si es alias; si no, `null`. */
  readonly aliasTarget: string | null;
  readonly aliasState: AliasState;
  /** `$description`, o `null`. */
  readonly description: string | null;
  /** Profundidad (raíz = 0; = nº de segmentos de la ruta). */
  readonly depth: number;
  readonly trust: NodeTrust;
}
