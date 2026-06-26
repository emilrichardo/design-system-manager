// T008 — Ruta canónica y profundidad de un token (ADR-0010). Orden de inserción JSON (lo decide quien
// recorre, no esta función). Raíz = profundidad 0. Dominio puro y determinista.

/** Une segmentos en una ruta canónica `a.b.c`. `[]` ⇒ raíz (`""`). */
export function tokenPath(segments: readonly string[]): string {
  return segments.join(".");
}

/** Separa una ruta canónica en segmentos. `""` ⇒ `[]` (raíz). */
export function pathSegments(path: string): readonly string[] {
  return path === "" ? [] : path.split(".");
}

/** Profundidad por segmentos: raíz (`[]`) = 0; cada nivel suma 1. */
export function depthOf(segments: readonly string[]): number {
  return segments.length;
}

/** Profundidad de una ruta canónica: raíz (`""`) = 0. */
export function depthOfPath(path: string): number {
  return depthOf(pathSegments(path));
}
