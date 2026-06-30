// T011 (007) — Lectura de dimensiones por CABECERA (sin render, sin librerías). PNG/JPEG/GIF/WebP/AVIF
// raster (`unit:"px"`) y SVG por `width`/`height`/`viewBox` (`unit:"user"`). Undeterminable → `null`
// (nunca se adivina). Puro.
import type { AssetDimensions } from "../../domain/assets/asset-record.js";
import type { AssetMimeType } from "../../domain/assets/asset-mime.js";

const px = (width: number | null, height: number | null): AssetDimensions => ({ width, height, unit: "px" });

function u16be(b: Uint8Array, o: number): number {
  return ((b[o] ?? 0) << 8) | (b[o + 1] ?? 0);
}
function u16le(b: Uint8Array, o: number): number {
  return (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8);
}
function u32be(b: Uint8Array, o: number): number {
  return (((b[o] ?? 0) << 24) | ((b[o + 1] ?? 0) << 16) | ((b[o + 2] ?? 0) << 8) | (b[o + 3] ?? 0)) >>> 0;
}
function u24le(b: Uint8Array, o: number): number {
  return (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8) | ((b[o + 2] ?? 0) << 16);
}
function ascii(b: Uint8Array, s: number, e: number): string {
  let out = "";
  for (let i = s; i < e && i < b.length; i += 1) out += String.fromCharCode(b[i] ?? 0);
  return out;
}

function readPng(b: Uint8Array): AssetDimensions | null {
  // IHDR width@16, height@20 (big-endian).
  if (b.length < 24) return null;
  return px(u32be(b, 16), u32be(b, 20));
}

function readGif(b: Uint8Array): AssetDimensions | null {
  if (b.length < 10) return null;
  return px(u16le(b, 6), u16le(b, 8));
}

function readJpeg(b: Uint8Array): AssetDimensions | null {
  let o = 2; // skip SOI
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) {
      o += 1;
      continue;
    }
    const marker = b[o + 1] ?? 0;
    // SOF0..SOF15 carry dimensions, excluding DHT(C4), JPG(C8), DAC(CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return px(u16be(b, o + 7), u16be(b, o + 5));
    }
    const segLen = u16be(b, o + 2);
    if (segLen < 2) return null;
    o += 2 + segLen;
  }
  return null;
}

function readWebp(b: Uint8Array): AssetDimensions | null {
  const fmt = ascii(b, 12, 16);
  if (fmt === "VP8X") return px(u24le(b, 24) + 1, u24le(b, 27) + 1);
  if (fmt === "VP8 ") {
    // lossy: 14-bit width/height at offset 26/28 (mask 0x3FFF).
    return px(u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  }
  if (fmt === "VP8L") {
    // lossless: bits after 0x2f signature at offset 21.
    if ((b[20] ?? 0) !== 0x2f) return null;
    const bits = u32be(b, 21);
    // Stored little-endian bitstream; reconstruct 14-bit width/height.
    const b21 = b[21] ?? 0, b22 = b[22] ?? 0, b23 = b[23] ?? 0, b24 = b[24] ?? 0;
    const width = 1 + (((b22 & 0x3f) << 8) | b21);
    const height = 1 + (((b24 & 0x0f) << 10) | (b23 << 2) | ((b22 & 0xc0) >> 6));
    void bits;
    return px(width, height);
  }
  return null;
}

function readAvif(b: Uint8Array): AssetDimensions | null {
  // Scan for the 'ispe' box: 4 bytes size, 'ispe', 1 version + 3 flags, width(4 BE), height(4 BE).
  for (let i = 0; i + 12 < b.length; i += 1) {
    if (ascii(b, i, i + 4) === "ispe") {
      return px(u32be(b, i + 8), u32be(b, i + 12));
    }
  }
  return null;
}

function readSvg(b: Uint8Array): AssetDimensions | null {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(b.subarray(0, 4096));
  const tag = text.match(/<svg\b[^>]*>/i);
  if (!tag) return null;
  const head = tag[0];
  const num = (re: RegExp): number | null => {
    const m = head.match(re);
    if (!m) return null;
    const v = Number.parseFloat(m[1] ?? "");
    return Number.isFinite(v) ? v : null;
  };
  const w = num(/\bwidth\s*=\s*"([0-9.]+)(?:px)?"/i);
  const h = num(/\bheight\s*=\s*"([0-9.]+)(?:px)?"/i);
  if (w !== null && h !== null) return { width: w, height: h, unit: "user" };
  const vb = head.match(/\bviewBox\s*=\s*"\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)\s*"/i);
  if (vb) {
    const vw = Number.parseFloat(vb[1] ?? "");
    const vh = Number.parseFloat(vb[2] ?? "");
    if (Number.isFinite(vw) && Number.isFinite(vh)) return { width: vw, height: vh, unit: "user" };
  }
  return null; // undeterminable — never guessed
}

/** Lee dimensiones según el MIME; `null` cuando el formato no las declara o no se reconocen. */
export function readDimensions(bytes: Uint8Array, mime: AssetMimeType): AssetDimensions | null {
  switch (mime) {
    case "image/png":
      return readPng(bytes);
    case "image/gif":
      return readGif(bytes);
    case "image/jpeg":
      return readJpeg(bytes);
    case "image/webp":
      return readWebp(bytes);
    case "image/avif":
      return readAvif(bytes);
    case "image/svg+xml":
      return readSvg(bytes);
    default:
      return null; // fonts and anything else: no pixel dimensions
  }
}
