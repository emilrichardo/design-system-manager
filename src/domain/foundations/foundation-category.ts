// T002 (004) — Categorías foundation y registro canónico inmutable (dominio puro; ADR-0015). El
// registro NO contiene valores/escala/preset/CSS/componentes/metadata persistida: solo identidad,
// orden, tipos DTCG relacionados (de los 13 reconocidos por 002) y profundidad. Una sola fuente de
// verdad; no configurable por entorno/usuario en 004.
import type { RecognizedDtcgType } from "../dtcg/recognized-types.js";

/** Las nueve categorías foundation reconocidas (orden canónico = displayOrder 0–8). */
export type FoundationCategoryId =
  | "color"
  | "spacing"
  | "typography"
  | "radius"
  | "border"
  | "shadow"
  | "opacity"
  | "sizing"
  | "motion";

/** Profundidad de validación disponible hoy. Solo `color` es profundo; el resto, superficial. */
export type ValidationDepth = "deep" | "surface";

/** Definición inmutable de una categoría. `supportedTypes` solo usa los 13 tipos DTCG de 002. */
export interface FoundationCategoryDefinition {
  readonly id: FoundationCategoryId;
  readonly displayOrder: number;
  readonly supportedTypes: readonly RecognizedDtcgType[];
  readonly validationDepth: ValidationDepth;
  readonly allowsPrimitive: boolean;
  readonly allowsSemantic: boolean;
}

// Datos canónicos en orden 0–8. `as const satisfies` garantiza literales y conformidad de tipos.
const CATEGORY_DATA = [
  { id: "color", displayOrder: 0, supportedTypes: ["color"], validationDepth: "deep", allowsPrimitive: true, allowsSemantic: true },
  { id: "spacing", displayOrder: 1, supportedTypes: ["dimension"], validationDepth: "surface", allowsPrimitive: true, allowsSemantic: true },
  { id: "typography", displayOrder: 2, supportedTypes: ["dimension", "fontFamily", "fontWeight", "number", "typography"], validationDepth: "surface", allowsPrimitive: true, allowsSemantic: true },
  { id: "radius", displayOrder: 3, supportedTypes: ["dimension"], validationDepth: "surface", allowsPrimitive: true, allowsSemantic: true },
  { id: "border", displayOrder: 4, supportedTypes: ["dimension", "strokeStyle", "color", "border"], validationDepth: "surface", allowsPrimitive: true, allowsSemantic: true },
  { id: "shadow", displayOrder: 5, supportedTypes: ["shadow"], validationDepth: "surface", allowsPrimitive: true, allowsSemantic: true },
  { id: "opacity", displayOrder: 6, supportedTypes: ["number"], validationDepth: "surface", allowsPrimitive: true, allowsSemantic: true },
  { id: "sizing", displayOrder: 7, supportedTypes: ["dimension"], validationDepth: "surface", allowsPrimitive: true, allowsSemantic: true },
  { id: "motion", displayOrder: 8, supportedTypes: ["duration", "cubicBezier", "transition"], validationDepth: "surface", allowsPrimitive: true, allowsSemantic: true },
] as const satisfies readonly FoundationCategoryDefinition[];

// Congelación de runtime explícita y acotada (registro + cada definición + su supportedTypes).
for (const def of CATEGORY_DATA) {
  Object.freeze(def.supportedTypes);
  Object.freeze(def);
}

/** Registro canónico, inmutable y determinista (orden 0–8). Única fuente de verdad. */
export const FOUNDATION_CATEGORIES: readonly FoundationCategoryDefinition[] = Object.freeze(CATEGORY_DATA);

/** Ids en orden canónico (lista derivada, congelada). */
export const FOUNDATION_CATEGORY_IDS: readonly FoundationCategoryId[] = Object.freeze(
  FOUNDATION_CATEGORIES.map((c) => c.id),
);

const byId: ReadonlyMap<string, FoundationCategoryDefinition> = new Map(
  FOUNDATION_CATEGORIES.map((c) => [c.id, c]),
);

/** ¿`id` es exactamente una categoría reconocida? (sin plurales/sinónimos/normalización). */
export function isFoundationCategoryId(id: string): id is FoundationCategoryId {
  return byId.has(id);
}

/** Definición de una categoría reconocida. */
export function foundationCategoryDefinition(id: FoundationCategoryId): FoundationCategoryDefinition {
  return byId.get(id) as FoundationCategoryDefinition;
}
