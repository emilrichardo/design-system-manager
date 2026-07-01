// T004/T030 (009) — Tipos de `ViewerColorV1`/`ViewerContrastResult` (data-model.md,
// contracts/viewer-color-v1.contract.md) y `projectColorSwatch` (Checkpoint D): deriva `sRgb` una sola
// vez desde el `resolvedValue` ya cargado (sin re-resolver el token); `contrast` se calcula aparte, solo
// cuando el usuario elige un par texto/fondo (`computeContrast` en `contrast.ts`).
import type { ViewerTokenV1, SafeJsonValue } from "./token.js";
import { computeContrast } from "./contrast.js";

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

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** Parsea `#rgb`/`#rrggbb`/`#rrggbbaa` a componentes sRGB [0,1]; `null` si no es un hex válido. */
function sRgbFromHex(hex: string): ViewerSRgb | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(hex);
  if (m === null) return null;
  const digits = m[1] as string;
  const expand = digits.length === 3 ? digits.split("").map((c) => c + c).join("") : digits;
  const r = parseInt(expand.slice(0, 2), 16) / 255;
  const g = parseInt(expand.slice(2, 4), 16) / 255;
  const b = parseInt(expand.slice(4, 6), 16) / 255;
  return { r: clamp01(r), g: clamp01(g), b: clamp01(b) };
}

/**
 * Deriva `ViewerSRgb` desde un valor DTCG color ya resuelto (una sola vez, sin re-resolver el alias):
 * objeto `{colorSpace:"srgb", components:[r,g,b]}` (directo), objeto con `hex` (cualquier colorSpace con
 * fallback sRGB), o un string `#rrggbb` bare. Cualquier otra forma (colorSpace no-sRGB sin `hex`, alias
 * roto, valor ausente) → `null` (nunca una conversión adivinada).
 */
export function sRgbFromResolvedValue(value: SafeJsonValue): ViewerSRgb | null {
  if (typeof value === "string") return sRgbFromHex(value);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (rec["colorSpace"] === "srgb" && Array.isArray(rec["components"]) && rec["components"].length >= 3) {
    const [r, g, b] = rec["components"] as [unknown, unknown, unknown];
    if (typeof r === "number" && typeof g === "number" && typeof b === "number") {
      return { r: clamp01(r), g: clamp01(g), b: clamp01(b) };
    }
  }
  if (typeof rec["hex"] === "string") return sRgbFromHex(rec["hex"]);
  return null;
}

/** Proyecta `ViewerColorV1` desde un `ViewerTokenV1` ya categorizado como `color`; `contrast` empieza `null`. */
export function projectColorSwatch(token: ViewerTokenV1): ViewerColorV1 {
  return {
    token,
    swatch: { resolvedValue: token.resolvedValue, sRgb: sRgbFromResolvedValue(token.resolvedValue) },
    contrast: null,
  };
}

/** Adjunta un `ViewerContrastResult` a un par ya proyectado (nunca precomputado para cada combinación). */
export function withContrast(text: ViewerColorV1, background: ViewerColorV1, level: ViewerContrastResult["level"]): ViewerColorV1 {
  return {
    ...text,
    contrast: computeContrast(
      { path: text.token.path, sRgb: text.swatch.sRgb },
      { path: background.token.path, sRgb: background.swatch.sRgb },
      level,
    ),
  };
}
