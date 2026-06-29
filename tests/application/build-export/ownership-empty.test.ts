// T076 (006) — Ownership: primer build sin manifest ni required paths → empty (permitido).
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";

describe("ownership empty (T076)", () => {
  it("manifest ausente y todos los required artifact paths ausentes → empty, sin conflictos", () => {
    const o = classifyBuildOwnership({
      previousManifest: { state: "absent" },
      artifactNodes: [
        { relativePath: "tokens.css", kind: "absent" },
        { relativePath: "tokens.resolved.json", kind: "absent" },
        { relativePath: "tokens.ts", kind: "absent" },
      ],
    });
    expect(o.state).toBe("empty");
    expect(o.conflicts).toEqual([]);
  });
});
