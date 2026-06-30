// T016 (007) — Probes: MIME por firma, dimensiones por formato, validación de fuente (válida vs
// mislabeled) y hashing determinista.
import { describe, expect, it } from "vitest";
import { detectMime } from "../../../src/infrastructure/assets/mime-detector.js";
import { readDimensions } from "../../../src/infrastructure/assets/dimension-reader.js";
import { validateFont } from "../../../src/infrastructure/assets/font-validator.js";
import { sha256Hex } from "../../../src/infrastructure/assets/hash.js";

function bytes(...vals: number[]): Uint8Array {
  return Uint8Array.from(vals);
}
const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));

function png(w: number, h: number): Uint8Array {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, ...ascii("IHDR"),
    (w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255,
    (h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255, 0, 0, 0, 0,
  ]);
}
const gif = (w: number, h: number): Uint8Array => Uint8Array.from([...ascii("GIF89a"), w & 255, (w >> 8) & 255, h & 255, (h >> 8) & 255, 0, 0]);
const jpeg = (w: number, h: number): Uint8Array =>
  Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 0]);
function webpVp8x(w: number, h: number): Uint8Array {
  const a = new Uint8Array(30);
  a.set(ascii("RIFF"), 0);
  a.set(ascii("WEBP"), 8);
  a.set(ascii("VP8X"), 12);
  const wm = w - 1, hm = h - 1;
  a[24] = wm & 255; a[25] = (wm >> 8) & 255; a[26] = (wm >> 16) & 255;
  a[27] = hm & 255; a[28] = (hm >> 8) & 255; a[29] = (hm >> 16) & 255;
  return a;
}
function avif(w: number, h: number): Uint8Array {
  const head = [0, 0, 0, 0, ...ascii("ftyp"), ...ascii("avif"), 0, 0, 0, 0];
  const ispe = [0, 0, 0, 20, ...ascii("ispe"), 0, 0, 0, 0, (w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255, (h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255];
  return Uint8Array.from([...head, ...ispe]);
}

describe("detectMime (T016)", () => {
  it("detecta familias por firma", () => {
    expect(detectMime(png(1, 1))).toBe("image/png");
    expect(detectMime(gif(1, 1))).toBe("image/gif");
    expect(detectMime(jpeg(1, 1))).toBe("image/jpeg");
    expect(detectMime(webpVp8x(1, 1))).toBe("image/webp");
    expect(detectMime(avif(1, 1))).toBe("image/avif");
    expect(detectMime(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe("image/svg+xml");
    expect(detectMime(bytes(0x77, 0x4f, 0x46, 0x32))).toBe("font/woff2");
    expect(detectMime(bytes(0x77, 0x4f, 0x46, 0x46))).toBe("font/woff");
    expect(detectMime(bytes(0x4f, 0x54, 0x54, 0x4f))).toBe("font/otf");
    expect(detectMime(bytes(0x00, 0x01, 0x00, 0x00))).toBe("font/ttf");
  });

  it("contenido desconocido → null", () => {
    expect(detectMime(bytes(0x00, 0x11, 0x22, 0x33))).toBeNull();
  });
});

describe("readDimensions (T016)", () => {
  it("lee dimensiones raster por formato", () => {
    expect(readDimensions(png(100, 50), "image/png")).toEqual({ width: 100, height: 50, unit: "px" });
    expect(readDimensions(gif(120, 60), "image/gif")).toEqual({ width: 120, height: 60, unit: "px" });
    expect(readDimensions(jpeg(128, 64), "image/jpeg")).toEqual({ width: 128, height: 64, unit: "px" });
    expect(readDimensions(webpVp8x(300, 150), "image/webp")).toEqual({ width: 300, height: 150, unit: "px" });
    expect(readDimensions(avif(64, 32), "image/avif")).toEqual({ width: 64, height: 32, unit: "px" });
  });

  it("SVG: width/height y viewBox (unit user); undeterminable → null", () => {
    expect(readDimensions(new TextEncoder().encode('<svg width="48" height="24"></svg>'), "image/svg+xml")).toEqual({ width: 48, height: 24, unit: "user" });
    expect(readDimensions(new TextEncoder().encode('<svg viewBox="0 0 16 8"></svg>'), "image/svg+xml")).toEqual({ width: 16, height: 8, unit: "user" });
    expect(readDimensions(new TextEncoder().encode("<svg></svg>"), "image/svg+xml")).toBeNull();
  });

  it("fuentes no tienen dimensiones de pixel", () => {
    expect(readDimensions(bytes(0x77, 0x4f, 0x46, 0x32), "font/woff2")).toBeNull();
  });
});

describe("validateFont (T016)", () => {
  it("acepta firmas de fuente y verifica coherencia con el MIME", () => {
    expect(validateFont(bytes(0x77, 0x4f, 0x46, 0x32), "font/woff2").ok).toBe(true);
    expect(validateFont(bytes(0x4f, 0x54, 0x54, 0x4f), "font/otf").ok).toBe(true);
    expect(validateFont(bytes(0x00, 0x01, 0x00, 0x00)).ok).toBe(true);
  });

  it("rechaza mislabeled (png con nombre/MIME de fuente) y firma desconocida", () => {
    expect(validateFont(png(1, 1), "font/woff2").ok).toBe(false);
    expect(validateFont(bytes(0x00, 0x11, 0x22, 0x33)).ok).toBe(false);
    // firma woff2 declarada como otf → incoherente
    expect(validateFont(bytes(0x77, 0x4f, 0x46, 0x32), "font/otf").ok).toBe(false);
  });
});

describe("sha256Hex (T016)", () => {
  it("es determinista y distingue contenidos", () => {
    expect(sha256Hex(bytes(1, 2, 3))).toBe(sha256Hex(bytes(1, 2, 3)));
    expect(sha256Hex(bytes(1, 2, 3))).not.toBe(sha256Hex(bytes(1, 2, 4)));
    expect(sha256Hex(bytes(1, 2, 3))).toMatch(/^[0-9a-f]{64}$/);
  });
});
