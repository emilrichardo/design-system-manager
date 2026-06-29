// T078 (006) — Ownership: manifest ausente con required paths presentes → required-path-owned-by-unknown.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";

describe("ownership manifest-absent-required-present (T078)", () => {
  it("no asume ownership cuando no hay manifest confiable", () => {
    const o = classifyBuildOwnership({
      previousManifest: { state: "absent" },
      artifactNodes: [
        { relativePath: "tokens.css", kind: "file", contentHash: "a".repeat(64), byteLength: 10 },
        { relativePath: "tokens.resolved.json", kind: "absent" },
        { relativePath: "tokens.ts", kind: "absent" },
      ],
    });
    expect(o.state).toBe("required-path-owned-by-unknown");
    expect(o.conflicts.every((c) => c.blocksWrite)).toBe(true);
  });
});
