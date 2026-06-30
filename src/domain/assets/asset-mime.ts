// T001 (007) — Familias MIME cerradas v1 y compatibilidad kind↔MIME. Dominio puro. El MIME se deriva por
// firma (en infraestructura); aquí solo se modela el conjunto permitido y qué kind admite cada MIME.
import type { AssetKind } from "./asset-kind.js";

/** MIME types soportados en v1 (familias font / raster / vector). */
export type AssetMimeType =
  | "font/woff2"
  | "font/woff"
  | "font/ttf"
  | "font/otf"
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif"
  | "image/avif"
  | "image/svg+xml";

export const FONT_MIME_TYPES: readonly AssetMimeType[] = ["font/woff2", "font/woff", "font/ttf", "font/otf"] as const;
export const RASTER_MIME_TYPES: readonly AssetMimeType[] = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"] as const;
export const VECTOR_MIME_TYPE: AssetMimeType = "image/svg+xml";

export const ASSET_MIME_TYPES: readonly AssetMimeType[] = [...FONT_MIME_TYPES, ...RASTER_MIME_TYPES, VECTOR_MIME_TYPE] as const;

/** Guard de runtime: rechaza cualquier valor fuera de la unión. */
export function isAssetMimeType(value: unknown): value is AssetMimeType {
  return typeof value === "string" && (ASSET_MIME_TYPES as readonly string[]).includes(value);
}

const isFont = (m: AssetMimeType): boolean => (FONT_MIME_TYPES as readonly string[]).includes(m);
const isRaster = (m: AssetMimeType): boolean => (RASTER_MIME_TYPES as readonly string[]).includes(m);
const isVector = (m: AssetMimeType): boolean => m === VECTOR_MIME_TYPE;

/**
 * ¿Es `mime` compatible con `kind`?
 * - font → solo MIMEs de fuente
 * - image → solo raster
 * - svg → solo vector
 * - icon / logo → vector o raster (no fuentes)
 */
export function isMimeCompatibleWithKind(kind: AssetKind, mime: AssetMimeType): boolean {
  switch (kind) {
    case "font":
      return isFont(mime);
    case "image":
      return isRaster(mime);
    case "svg":
      return isVector(mime);
    case "icon":
    case "logo":
      return isVector(mime) || isRaster(mime);
    default: {
      const _exhaustive: never = kind;
      return Boolean(_exhaustive);
    }
  }
}
