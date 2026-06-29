// T082 (006) — Ownership: artifact listado en el manifest ausente en disco → managed-artifact-missing.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import { nodesMatching, validManifestValue } from "./ownership-helpers.js";

describe("ownership artifact-missing (T082)", () => {
  it("artifact administrado ausente → managed-artifact-missing", () => {
    const mv = validManifestValue();
    const nodes = nodesMatching(mv).map((n) => (n.relativePath === "tokens.resolved.json" ? { relativePath: n.relativePath, kind: "absent" as const } : n));
    const o = classifyBuildOwnership({ previousManifest: { state: "parsed", value: mv }, artifactNodes: nodes });
    expect(o.state).toBe("managed-artifact-missing");
    expect(o.conflicts[0]?.path).toBe("tokens.resolved.json");
  });
});
