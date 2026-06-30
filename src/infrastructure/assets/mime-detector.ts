// T010 (007) — Detección de MIME por FIRMA (magic bytes); la extensión es solo una pista secundaria.
// Devuelve un `AssetMimeType` cerrado o `null` si la firma es desconocida/no soportada. Sin red, puro.
import type { AssetMimeType } from "../../domain/assets/asset-mime.js";

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let s = "";
  for (let i = start; i < end && i < bytes.length; i += 1) s += String.fromCharCode(bytes[i] ?? 0);
  return s;
}

function startsWith(bytes: Uint8Array, sig: readonly number[]): boolean {
  if (bytes.length < sig.length) return false;
  for (let i = 0; i < sig.length; i += 1) if (bytes[i] !== sig[i]) return false;
  return true;
}

/** ¿El contenido parece SVG (tras BOM/espacios iniciales, empieza por `<?xml` o `<svg`)? */
function looksLikeSvg(bytes: Uint8Array): boolean {
  let i = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3; // UTF-8 BOM
  while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)) i += 1;
  const head = ascii(bytes, i, i + 256).toLowerCase();
  if (head.startsWith("<?xml")) return head.includes("<svg");
  return head.startsWith("<svg");
}

/** Detecta el MIME por firma. `null` cuando no corresponde a una familia soportada v1. */
export function detectMime(bytes: Uint8Array): AssetMimeType | null {
  // Fonts
  if (startsWith(bytes, [0x77, 0x4f, 0x46, 0x32])) return "font/woff2"; // 'wOF2'
  if (startsWith(bytes, [0x77, 0x4f, 0x46, 0x46])) return "font/woff"; // 'wOFF'
  if (startsWith(bytes, [0x4f, 0x54, 0x54, 0x4f])) return "font/otf"; // 'OTTO'
  if (startsWith(bytes, [0x00, 0x01, 0x00, 0x00])) return "font/ttf"; // sfnt 1.0
  if (startsWith(bytes, [0x74, 0x72, 0x75, 0x65])) return "font/ttf"; // 'true'

  // Raster
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif"; // 'GIF8'
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  // AVIF: ISO-BMFF 'ftyp' box at offset 4, brand 'avif'/'avis' at offset 8
  if (ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) return "image/avif";

  // Vector
  if (looksLikeSvg(bytes)) return "image/svg+xml";

  return null;
}
