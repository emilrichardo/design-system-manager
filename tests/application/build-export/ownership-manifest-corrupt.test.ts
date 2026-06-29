// T079 (006) — Ownership: manifest corrupto (ilegible o shape inválida) → untrusted-build-manifest.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";

describe("ownership manifest-corrupt (T079)", () => {
  it("bytes no parseables → untrusted-build-manifest", () => {
    const o = classifyBuildOwnership({ previousManifest: { state: "unreadable" }, artifactNodes: [] });
    expect(o.state).toBe("untrusted-build-manifest");
    expect(o.conflicts[0]?.blocksWrite).toBe(true);
  });
  it("shape inválida (objeto vacío) → untrusted-build-manifest", () => {
    const o = classifyBuildOwnership({ previousManifest: { state: "parsed", value: {} }, artifactNodes: [] });
    expect(o.state).toBe("untrusted-build-manifest");
  });
});
