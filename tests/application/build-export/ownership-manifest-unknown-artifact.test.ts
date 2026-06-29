// T088 (006) — Ownership: formato/filename desconocido o entrada extra → untrusted-build-manifest.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import { hex, validManifestValue } from "./ownership-helpers.js";

describe("ownership manifest-unknown-artifact (T088)", () => {
  it("formato desconocido → untrusted-build-manifest", () => {
    const mv = validManifestValue();
    (mv.artifacts as Array<Record<string, unknown>>).push({ format: "scss", relativePath: "tokens.scss", contentHash: hex(20), byteLength: 1 });
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] }).state).toBe("untrusted-build-manifest");
  });
  it("self-entry manifest.json como artifact → untrusted-build-manifest", () => {
    const mv = validManifestValue();
    (mv.artifacts as Array<Record<string, unknown>>).push({ format: "json", relativePath: "manifest.json", contentHash: hex(21), byteLength: 1 });
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] }).state).toBe("untrusted-build-manifest");
  });
  it("clave extra no contractual en un artifact → untrusted-build-manifest", () => {
    const mv = validManifestValue();
    (mv.artifacts as Array<Record<string, unknown>>)[0]!.extra = true;
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] }).state).toBe("untrusted-build-manifest");
  });
});
