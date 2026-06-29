// T026/T028 (006) — Validación de nombres CSS y detección global de colisiones. Dominio puro: sin
// filesystem, sin CLI, sin renderers. El algoritmo es estrictamente `"--" + segments.join("-")`; cada
// segmento valida `^[A-Za-z0-9_][A-Za-z0-9_-]*$`. NO se hace lowercase, NO se aplica Unicode
// normalization, NO existe identifier escaping ni prefijo configurable. Los puntos solo separan
// segmentos del token path. La detección de colisiones es GLOBAL y se ejecuta antes de cualquier
// serialización.

const SEGMENT_RE = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;

/** Resultado de validación del nombre CSS derivado de un token path. */
export type CssNameValidation =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly code: "css-name-invalid"; readonly tokenPath: string; readonly reason: string };

/**
 * Valida un token path y devuelve el nombre de propiedad custom CSS exacto, o un error tipado.
 * Reglas obligatorias:
 *  - segments = path.split(".") con segmentos no vacíos;
 *  - cada segmento ∈ `^[A-Za-z0-9_][A-Za-z0-9_-]*$`;
 *  - case preservado, sin lowercase ni normalización Unicode;
 *  - sin identifier escaping y sin prefijo configurable.
 */
export function tokenPathToCssCustomPropertyName(tokenPath: string): CssNameValidation {
  if (tokenPath.length === 0) {
    return { ok: false, code: "css-name-invalid", tokenPath, reason: "empty-path" };
  }
  const segments = tokenPath.split(".");
  for (const segment of segments) {
    if (segment.length === 0) {
      return { ok: false, code: "css-name-invalid", tokenPath, reason: "empty-segment" };
    }
    if (!SEGMENT_RE.test(segment)) {
      return { ok: false, code: "css-name-invalid", tokenPath, reason: `invalid-segment:${segment}` };
    }
  }
  return { ok: true, name: `--${segments.join("-")}` };
}

export const validateCssCustomPropertyName = tokenPathToCssCustomPropertyName;

/** Resultado de detección de colisiones (dos paths distintos → mismo nombre custom). */
export interface CssNameCollision {
  readonly code: "css-name-collision";
  readonly name: string;
  /** Token paths que colisionan, en orden determinista (lexicográfico por code point). */
  readonly tokenPaths: readonly string[];
}

export type CssNameMapResult =
  | { readonly ok: true; readonly byPath: ReadonlyMap<string, string> }
  | { readonly ok: false; readonly invalidNames: readonly Extract<CssNameValidation, { ok: false }>[]; readonly collisions: readonly CssNameCollision[] };

/**
 * Construye el mapa global path→nombre CSS para todos los tokens; detecta nombres inválidos y
 * colisiones ANTES de cualquier serialización. Si hay errores, ninguno se elige silenciosamente: se
 * devuelven todos en orden determinista.
 */
export function buildCssNameMap(tokenPaths: readonly string[]): CssNameMapResult {
  const invalidNames: Extract<CssNameValidation, { ok: false }>[] = [];
  const nameToPaths = new Map<string, string[]>();
  const validByPath = new Map<string, string>();

  for (const path of tokenPaths) {
    const validation = tokenPathToCssCustomPropertyName(path);
    if (!validation.ok) {
      invalidNames.push(validation);
      continue;
    }
    validByPath.set(path, validation.name);
    const existing = nameToPaths.get(validation.name);
    if (existing === undefined) nameToPaths.set(validation.name, [path]);
    else existing.push(path);
  }

  const collisions: CssNameCollision[] = [];
  for (const [name, paths] of nameToPaths) {
    if (paths.length > 1) {
      const sortedPaths = [...paths].sort();
      collisions.push({ code: "css-name-collision", name, tokenPaths: Object.freeze(sortedPaths) });
    }
  }
  // Orden determinista de colisiones por nombre.
  collisions.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  if (invalidNames.length > 0 || collisions.length > 0) {
    return { ok: false, invalidNames: Object.freeze(invalidNames), collisions: Object.freeze(collisions) };
  }
  return { ok: true, byPath: validByPath };
}
