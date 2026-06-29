// T017 (006) — Anota la representabilidad PRELIMINAR por formato de un token normalizado. El detalle
// exacto de CSS (matriz de tipos, naming, escaping) corresponde al Checkpoint C; aquí solo se indica,
// de forma coarse, que el token puede continuar hacia los renderers. JSON/TypeScript admiten cualquier
// valor JSON-safe; CSS queda como preliminar (`representable: true`, `reason: null`) hasta C.
import { BUILD_FORMATS } from "../../domain/build-export/build-format.js";
import type { FormatCompatibility } from "../../domain/build-export/normalized-token.js";

/** Compatibilidad preliminar para los tres formatos (orden canónico css/json/typescript). */
export function computeFormatCompatibility(): readonly FormatCompatibility[] {
  return BUILD_FORMATS.map((format) => ({ format, representable: true, reason: null }));
}
