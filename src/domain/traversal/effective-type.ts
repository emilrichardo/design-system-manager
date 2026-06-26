// T010 — Precedencia del `$type` efectivo (C1). Función pura: opera sobre una entrada ya preparada
// (no recorre documentos reales). La resolución de aliases y la búsqueda del grupo ancestro se
// inyectan como callbacks, manteniendo el dominio independiente del recorrido/infra.
import type { TypeOrigin } from "../analysis/token-node-summary.js";

/** Nodo evaluado para determinar su tipo efectivo. */
export interface EffectiveTypeNode {
  /** `$type` declarado en el token, o `null`. */
  readonly declaredType: string | null;
  /** ¿El `$value` del token es una referencia (alias)? */
  readonly isAlias: boolean;
  /** Ruta destino del alias (cuando `isAlias`), o `null`. */
  readonly aliasTarget: string | null;
}

/** Contexto de resolución (inyectado por el recorrido). */
export interface EffectiveTypeContext {
  /**
   * Tipo efectivo del token referenciado por `targetPath` (resolviendo cadenas de aliases).
   * Devuelve `null` si el destino no existe, es un grupo, forma un ciclo o es indeterminable.
   */
  readonly resolveAliasType: (targetPath: string) => string | null;
  /**
   * Grupo ancestro más cercano que declara `$type` (con su ruta), o `null`.
   */
  readonly nearestGroupType: () => { readonly type: string; readonly path: string } | null;
}

/** Resultado de la determinación del tipo efectivo. */
export interface EffectiveType {
  readonly effectiveType: string | null;
  readonly typeOrigin: TypeOrigin;
  /** Ruta del grupo fuente cuando `typeOrigin === "group"`; si no, `null`. */
  readonly typeSourcePath: string | null;
}

const UNDETERMINABLE: EffectiveType = {
  effectiveType: null,
  typeOrigin: "none",
  typeSourcePath: null,
};

/**
 * Precedencia normativa C1:
 *  1. `$type` declarado en el token (gana siempre).
 *  2. Si no declara y `$value` es alias: tipo efectivo del token referenciado (cadenas resueltas).
 *     Un alias roto o cíclico ⇒ indeterminable (NO cae al grupo: el valor ya es una referencia).
 *  3. Si no es alias: `$type` heredado del grupo ancestro más cercano.
 *  4. En otro caso: indeterminable (token inválido).
 *
 * No infiere el tipo desde la forma de `$value`; `$extensions` no participa. Función pura.
 */
export function resolveEffectiveType(
  node: EffectiveTypeNode,
  ctx: EffectiveTypeContext,
): EffectiveType {
  // 1. tipo propio declarado
  if (node.declaredType !== null) {
    return { effectiveType: node.declaredType, typeOrigin: "own", typeSourcePath: null };
  }
  // 2. tipo por alias (prevalece sobre el grupo)
  if (node.isAlias) {
    const resolved = node.aliasTarget !== null ? ctx.resolveAliasType(node.aliasTarget) : null;
    if (resolved !== null) {
      return { effectiveType: resolved, typeOrigin: "alias", typeSourcePath: null };
    }
    return UNDETERMINABLE; // alias roto/cíclico/indeterminable
  }
  // 3. tipo heredado del grupo ancestro más cercano
  const group = ctx.nearestGroupType();
  if (group !== null) {
    return { effectiveType: group.type, typeOrigin: "group", typeSourcePath: group.path };
  }
  // 4. indeterminable
  return UNDETERMINABLE;
}
