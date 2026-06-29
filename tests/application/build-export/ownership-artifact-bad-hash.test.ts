// T085 (006) — Ownership: manifest con hash inválido (case/longitud/charset) → untrusted-build-manifest.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import { validManifestValue } from "./ownership-helpers.js";

describe("ownership artifact-bad-hash (T085)", () => {
  it("contentHash en mayúsculas → untrusted-build-manifest", () => {
    const mv = validManifestValue({ hashes: { css: "A".repeat(64) } });
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] }).state).toBe("untrusted-build-manifest");
  });
  it("contentHash de longitud incorrecta → untrusted-build-manifest", () => {
    const mv = validManifestValue({ hashes: { json: "abc" } });
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] }).state).toBe("untrusted-build-manifest");
  });
});
