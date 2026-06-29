// T083 (006) — Ownership: archivo regular desconocido en required path (sin manifest) → required-path-owned-by-unknown.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";

describe("ownership unknown-file-required-path (T083)", () => {
  it("archivo desconocido ocupa tokens.css sin manifest confiable", () => {
    const o = classifyBuildOwnership({
      previousManifest: { state: "absent" },
      artifactNodes: [
        { relativePath: "tokens.css", kind: "file", contentHash: "b".repeat(64), byteLength: 5 },
        { relativePath: "tokens.resolved.json", kind: "absent" },
        { relativePath: "tokens.ts", kind: "absent" },
      ],
    });
    expect(o.state).toBe("required-path-owned-by-unknown");
    expect(o.conflicts.some((c) => c.path === "tokens.css")).toBe(true);
  });
});
