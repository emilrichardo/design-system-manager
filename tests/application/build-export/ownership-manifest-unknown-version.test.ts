// T080 (006) — Ownership: formatVersion no soportada → untrusted-build-manifest (sin migrar).
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import { validManifestValue } from "./ownership-helpers.js";

describe("ownership manifest-unknown-version (T080)", () => {
  it("formatVersion 2.0.0 → untrusted-build-manifest", () => {
    const mv = { ...validManifestValue(), formatVersion: "2.0.0" };
    const o = classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] });
    expect(o.state).toBe("untrusted-build-manifest");
  });
});
