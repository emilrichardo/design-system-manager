// T008 (006) — Vectores byte-exactos para SHA-256 hex minúsculas.
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../../src/infrastructure/build-export/hash.js";

const enc = new TextEncoder();

describe("sha256Hex (T007)", () => {
  it("vector de bytes vacíos", () => {
    expect(sha256Hex(new Uint8Array([]))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("vector ASCII 'abc'", () => {
    expect(sha256Hex(enc.encode("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("mismo byte array → mismo hash", () => {
    expect(sha256Hex(enc.encode("neuraz"))).toBe(sha256Hex(enc.encode("neuraz")));
  });
  it("bytes diferentes → hash diferente (café compuesto vs descompuesto)", () => {
    const composed = enc.encode("café"); // é precompuesto
    const decomposed = enc.encode("café"); // e + combining acute
    expect(Array.from(composed)).not.toEqual(Array.from(decomposed));
    expect(sha256Hex(composed)).not.toBe(sha256Hex(decomposed));
  });
  it("formato: exactamente 64 caracteres [0-9a-f], sin mayúsculas", () => {
    const h = sha256Hex(enc.encode("Primary"));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(h.toLowerCase());
  });
  it("trabaja sobre bytes binarios arbitrarios", () => {
    expect(sha256Hex(new Uint8Array([0x00, 0xff, 0xfe, 0x9f]))).toMatch(/^[0-9a-f]{64}$/);
  });
});
