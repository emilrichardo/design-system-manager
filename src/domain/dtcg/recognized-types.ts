// T009 — Fuente canónica única de los tipos `$type` reconocidos por DTCG 2025.10 (research.md §1,
// ADR-0008). Inmutable; centralizada; sin duplicar. NO modifica el schema estricto de generación de
// `001` (color-only). Dominio puro.

/** Los 13 `$type` estándar de DTCG 2025.10 (7 simples + 6 compuestos). */
export const RECOGNIZED_DTCG_TYPES = [
  // simples
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  // compuestos
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography",
] as const;

export type RecognizedDtcgType = (typeof RECOGNIZED_DTCG_TYPES)[number];

/**
 * Tipos con análisis semántico **profundo** en Neuraz hoy. Inicialmente solo `color` (plan).
 * Los demás reconocidos se inspeccionan de forma genérica (warning `dtcg-type-not-deeply-inspected`).
 */
export const DEEPLY_SUPPORTED_DTCG_TYPES = ["color"] as const;

export type DeeplySupportedDtcgType = (typeof DEEPLY_SUPPORTED_DTCG_TYPES)[number];

/** Categoría canónica para nodos sin tipo efectivo determinable (en `byType`). */
export const UNTYPED_CATEGORY = "(untyped)";

const recognized: ReadonlySet<string> = new Set(RECOGNIZED_DTCG_TYPES);
const deeplySupported: ReadonlySet<string> = new Set(DEEPLY_SUPPORTED_DTCG_TYPES);

/** ¿`type` es uno de los 13 tipos reconocidos por DTCG 2025.10? */
export function isRecognizedType(type: string): boolean {
  return recognized.has(type);
}

/** ¿`type` cuenta con análisis profundo en Neuraz? (hoy: solo `color`). */
export function isDeeplySupportedType(type: string): boolean {
  return deeplySupported.has(type);
}

/** Reconocido por DTCG pero sin análisis profundo en Neuraz ⇒ warning, no invalida. */
export function isRecognizedButShallow(type: string): boolean {
  return recognized.has(type) && !deeplySupported.has(type);
}
