// T029 (009) — `computeContrast`: política de contraste WCAG 2.1 AA (contracts/viewer-color-v1.contract.md
// "Contrast policy"), pura, sin dependencia nueva (aritmética cerrada sobre `ViewerSRgb`). `not-computable`
// cuando cualquiera de los dos colores no es reducible a sRGB (nunca una ratio fabricada).
import type { ViewerContrastLevel, ViewerContrastResult, ViewerContrastState, ViewerSRgb } from "./color.js";

const NORMAL_THRESHOLD = 4.5;
const LARGE_THRESHOLD = 3.0;

/** Canal linealizado (WCAG 2.1 §1.4.3 Appendix): sRGB [0,1] → luz lineal. */
function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa (WCAG 2.1 §1.4.3 Appendix). */
function relativeLuminance(color: ViewerSRgb): number {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

/** Ratio de contraste WCAG entre dos colores sRGB (siempre ≥ 1, orden de argumentos irrelevante). */
function contrastRatio(a: ViewerSRgb, b: ViewerSRgb): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function thresholdFor(level: ViewerContrastLevel): number {
  return level === "AA-normal" ? NORMAL_THRESHOLD : LARGE_THRESHOLD;
}

/**
 * Calcula `ViewerContrastResult` para un par texto/fondo. `not-computable` (ratio `null`) cuando
 * cualquiera de los dos `ViewerSRgb` es `null` (color no reducible a sRGB) — nunca una ratio fabricada.
 */
export function computeContrast(
  text: { readonly path: string; readonly sRgb: ViewerSRgb | null },
  background: { readonly path: string; readonly sRgb: ViewerSRgb | null },
  level: ViewerContrastLevel,
): ViewerContrastResult {
  if (text.sRgb === null || background.sRgb === null) {
    return { textPath: text.path, backgroundPath: background.path, ratio: null, level, state: "not-computable" };
  }
  const ratio = contrastRatio(text.sRgb, background.sRgb);
  const state: ViewerContrastState = ratio >= thresholdFor(level) ? "pass" : "fail";
  return { textPath: text.path, backgroundPath: background.path, ratio, level, state };
}
