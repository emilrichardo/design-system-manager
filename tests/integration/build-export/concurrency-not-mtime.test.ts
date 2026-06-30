// T117 (006) — La detección usa bytes/hash, no mtime/size: mismo hash → ok aunque "el tiempo" difiera;
// distinto hash con mismo byteLength → conflict.
import { describe, expect, it } from "vitest";
import { checkConcurrency, type ConcurrencyState } from "../../../src/application/build-export/concurrency.js";

const state = (hash: string): ConcurrencyState => ({
  sourceHash: hash,
  buildManifestHash: null,
  managedArtifacts: [{ relativePath: "tokens.css", contentHash: hash, byteLength: 10 }],
  requiredPathStates: [{ relativePath: "tokens.css", state: "file" }],
});

describe("concurrency uses bytes/hash not mtime (T117)", () => {
  it("mismo hash → ok (el modelo no incluye mtime; no influye)", () => {
    expect(checkConcurrency(state("a".repeat(64)), state("a".repeat(64))).ok).toBe(true);
  });

  it("distinto hash con el mismo byteLength → conflict (detecta por contenido, no por tamaño)", () => {
    const expected = state("a".repeat(64));
    const observed = state("a".repeat(64));
    const tampered: ConcurrencyState = { ...observed, managedArtifacts: [{ relativePath: "tokens.css", contentHash: "b".repeat(64), byteLength: 10 }] };
    const r = checkConcurrency(expected, tampered);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict.code).toBe("managed-artifact-modified");
  });
});
