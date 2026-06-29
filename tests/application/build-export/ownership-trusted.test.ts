// T077 (006) — Ownership: build manifest soportado con hashes/byteLength coincidentes → trusted.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import { nodesMatching, validManifestValue } from "./ownership-helpers.js";

describe("ownership trusted (T077)", () => {
  it("manifest válido + artifacts intactos → trusted, sin conflictos", () => {
    const mv = validManifestValue();
    const o = classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: nodesMatching(mv) });
    expect(o.state).toBe("trusted");
    expect(o.conflicts).toEqual([]);
  });
});
