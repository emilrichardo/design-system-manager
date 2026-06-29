// T081 (006) — Ownership: managed artifact con hash/byteLength distinto → managed-artifact-modified.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import { nodesMatching, validManifestValue } from "./ownership-helpers.js";

describe("ownership artifact-modified (T081)", () => {
  it("hash distinto en un artifact administrado → managed-artifact-modified", () => {
    const mv = validManifestValue();
    const nodes = nodesMatching(mv);
    const tampered = nodes.map((n) => (n.relativePath === "tokens.css" ? { ...n, contentHash: "f".repeat(64) } : n));
    const o = classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: tampered });
    expect(o.state).toBe("managed-artifact-modified");
    expect(o.conflicts[0]?.path).toBe("tokens.css");
    expect(o.conflicts[0]?.format).toBe("css");
  });
  it("byteLength distinto → managed-artifact-modified", () => {
    const mv = validManifestValue();
    const nodes = nodesMatching(mv).map((n) => (n.relativePath === "tokens.ts" ? { ...n, byteLength: 9999 } : n));
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: nodes }).state).toBe("managed-artifact-modified");
  });
});
