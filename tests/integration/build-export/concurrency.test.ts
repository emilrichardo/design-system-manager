// T116 (006) — Detección de concurrencia: una prueba por tipo de modificación → conflict/wrote:false.
import { describe, expect, it } from "vitest";
import { checkConcurrency, type ConcurrencyState } from "../../../src/application/build-export/concurrency.js";

function baseState(): ConcurrencyState {
  return {
    sourceHash: "a".repeat(64),
    buildManifestHash: "b".repeat(64),
    managedArtifacts: [{ relativePath: "tokens.css", contentHash: "c".repeat(64), byteLength: 10 }],
    requiredPathStates: [{ relativePath: "tokens.css", state: "file" }],
  };
}

describe("concurrency detection (T116)", () => {
  it("sin cambios → ok", () => {
    expect(checkConcurrency(baseState(), baseState()).ok).toBe(true);
  });

  it("source cambió → source-modified", () => {
    const r = checkConcurrency(baseState(), { ...baseState(), sourceHash: "f".repeat(64) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict.code).toBe("source-modified");
  });

  it("build manifest cambió → untrusted-build-manifest", () => {
    const r = checkConcurrency(baseState(), { ...baseState(), buildManifestHash: "0".repeat(64) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict.code).toBe("untrusted-build-manifest");
  });

  it("managed artifact modificado → managed-artifact-modified", () => {
    const r = checkConcurrency(baseState(), { ...baseState(), managedArtifacts: [{ relativePath: "tokens.css", contentHash: "9".repeat(64), byteLength: 10 }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict.code).toBe("managed-artifact-modified");
  });

  it("managed artifact desapareció → managed-artifact-missing", () => {
    const r = checkConcurrency(baseState(), { ...baseState(), managedArtifacts: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict.code).toBe("managed-artifact-missing");
  });

  it("required path pasó a symlink → unsupported-unknown-node", () => {
    const r = checkConcurrency(baseState(), { ...baseState(), requiredPathStates: [{ relativePath: "tokens.css", state: "symlink" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict.code).toBe("unsupported-unknown-node");
  });

  it("required path ocupado por contenido desconocido (dir) → required-path-owned-by-unknown", () => {
    const r = checkConcurrency(baseState(), { ...baseState(), requiredPathStates: [{ relativePath: "tokens.css", state: "dir" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.conflict.code).toBe("required-path-owned-by-unknown");
  });
});
