// T087 (006) — Ownership: dos artifacts con el mismo relativePath → untrusted-build-manifest.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import { hex } from "./ownership-helpers.js";

describe("ownership manifest-duplicate-path (T087)", () => {
  it("relativePath duplicado → untrusted-build-manifest", () => {
    const mv = {
      formatVersion: "1.0.0",
      source: "design-system/tokens/base.tokens.json",
      sourceHash: hex(1),
      artifacts: [
        { format: "css", relativePath: "tokens.css", contentHash: hex(10), byteLength: 1 },
        { format: "css", relativePath: "tokens.css", contentHash: hex(11), byteLength: 2 },
        { format: "typescript", relativePath: "tokens.ts", contentHash: hex(12), byteLength: 3 },
      ],
    };
    expect(classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: [] }).state).toBe("untrusted-build-manifest");
  });
});
