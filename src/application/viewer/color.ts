// T004 (009) — Tipos de `ViewerColorV1`/`ViewerContrastResult` (data-model.md,
// contracts/viewer-color-v1.contract.md). Solo tipos/shape en Checkpoint A; la fórmula de contraste
// (`computeContrast`) y `projectColorSwatch` llegan en Checkpoint D. La política WCAG 2.1 AA está
// especificada en spec.md/el contrato — aquí solo se fija el vocabulario de estado/salida.
import type { ViewerTokenV1, SafeJsonValue } from "./token.js";

/** Estado del contraste per la política WCAG 2.1 AA (spec.md "Colors & contrast policy"). */
export type ViewerContrastState = "pass" | "fail" | "not-computable";

/** Nivel de umbral aplicado (texto normal vs. texto grande/no-texto). */
export type ViewerContrastLevel = "AA-normal" | "AA-large";

/**
 * Resultado de contraste para un par texto/fondo elegido por el usuario. `ratio` es `null` si y solo
 * si `state === "not-computable"` (nunca una ratio fabricada).
 */
export interface ViewerContrastResult {
  readonly textPath: string;
  readonly backgroundPath: string;
  readonly ratio: number | null;
  readonly level: ViewerContrastLevel;
  readonly state: ViewerContrastState;
}

/** Componentes sRGB derivados una sola vez del valor resuelto; `null` cuando no es reducible a sRGB. */
export interface ViewerSRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Proyección de un swatch de color (`category === "color"`). `contrast` solo está presente cuando el
 * usuario ya eligió un par texto/fondo (nunca precomputado para cada combinación posible).
 */
export interface ViewerColorV1 {
  readonly token: ViewerTokenV1;
  readonly swatch: {
    readonly resolvedValue: SafeJsonValue;
    readonly sRgb: ViewerSRgb | null;
  };
  readonly contrast: ViewerContrastResult | null;
}
