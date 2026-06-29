// T084 (006) — Ownership: directorio desconocido en required path (sin manifest) → required-path-owned-by-unknown.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";

describe("ownership unknown-dir-required-path (T084)", () => {
  it("directorio ocupa tokens.ts sin manifest confiable", () => {
    const o = classifyBuildOwnership({
      previousManifest: { state: "absent" },
      artifactNodes: [
        { relativePath: "tokens.css", kind: "absent" },
        { relativePath: "tokens.resolved.json", kind: "absent" },
        { relativePath: "tokens.ts", kind: "directory" },
      ],
    });
    expect(o.state).toBe("required-path-owned-by-unknown");
    expect(o.conflicts.some((c) => c.path === "tokens.ts")).toBe(true);
  });
});
