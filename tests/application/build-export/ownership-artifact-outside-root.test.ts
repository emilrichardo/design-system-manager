// T086 (006) — Ownership: artifact con path fuera del output (traversal/absolute) → untrusted-build-manifest.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import { validManifestValue } from "./ownership-helpers.js";

describe("ownership artifact-outside-root (T086)", () => {
  it("relativePath con traversal → untrusted-build-manifest", () => {
    const mv = validManifestValue();
    (mv.artifacts as Array<{ relativePath: string }>)[0]!.relativePath = "../tokens.css";
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] }).state).toBe("untrusted-build-manifest");
  });
  it("relativePath absoluto → untrusted-build-manifest", () => {
    const mv = validManifestValue();
    (mv.artifacts as Array<{ relativePath: string }>)[2]!.relativePath = "/etc/tokens.ts";
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] }).state).toBe("untrusted-build-manifest");
  });
});
