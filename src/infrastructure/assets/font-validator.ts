// T012 (007) — Validación de fuentes por firma/estructura mínima (sin conversión, sin subsetting).
// Acepta woff2 (`wOF2`), woff (`wOFF`) y sfnt (`0x00010000` / `true` / `OTTO`). Puro.
import type { AssetMimeType } from "../../domain/assets/asset-mime.js";

export interface FontValidationResult {
  readonly ok: boolean;
  readonly code: string | null;
  readonly message: string | null;
}

function sig(bytes: Uint8Array, ...expected: number[]): boolean {
  if (bytes.length < expected.length) return false;
  return expected.every((b, i) => bytes[i] === b);
}

const OK: FontValidationResult = Object.freeze({ ok: true, code: null, message: null });

/**
 * Valida que `bytes` sea una fuente reconocible. Si se da `mime`, verifica además coherencia con la
 * firma (p. ej. `font/otf` exige `OTTO`). No convierte ni hace subsetting.
 */
export function validateFont(bytes: Uint8Array, mime?: AssetMimeType): FontValidationResult {
  const isWoff2 = sig(bytes, 0x77, 0x4f, 0x46, 0x32);
  const isWoff = sig(bytes, 0x77, 0x4f, 0x46, 0x46);
  const isOtto = sig(bytes, 0x4f, 0x54, 0x54, 0x4f);
  const isSfnt = sig(bytes, 0x00, 0x01, 0x00, 0x00) || sig(bytes, 0x74, 0x72, 0x75, 0x65);
  const recognized = isWoff2 || isWoff || isOtto || isSfnt;
  if (!recognized) {
    return { ok: false, code: "font-invalid", message: "El archivo no tiene una firma de fuente reconocible." };
  }
  if (mime !== undefined) {
    const matches =
      (mime === "font/woff2" && isWoff2) ||
      (mime === "font/woff" && isWoff) ||
      (mime === "font/otf" && isOtto) ||
      (mime === "font/ttf" && isSfnt);
    if (!matches) return { ok: false, code: "font-invalid", message: `La firma no coincide con ${mime}.` };
  }
  return OK;
}
