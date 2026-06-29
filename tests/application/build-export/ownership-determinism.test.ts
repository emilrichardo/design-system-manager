// T074 (006) — Determinismo e inmutabilidad del clasificador de ownership.
import { describe, expect, it } from "vitest";
import { classifyBuildOwnership, type RequiredPathNode } from "../../../src/application/build-export/ownership.js";

describe("ownership determinism + immutability (T074)", () => {
  it("distinto orden de artifactNodes → mismo estado y mismos conflictos en mismo orden", () => {
    const nodesA: RequiredPathNode[] = [
      { relativePath: "tokens.css", kind: "file", contentHash: "a".repeat(64), byteLength: 1 },
      { relativePath: "tokens.ts", kind: "directory" },
    ];
    const nodesB = [...nodesA].reverse();
    const a = classifyBuildOwnership({ previousManifest: { state: "absent" }, artifactNodes: nodesA });
    const b = classifyBuildOwnership({ previousManifest: { state: "absent" }, artifactNodes: nodesB });
    expect(b.state).toBe(a.state);
    expect(b.conflicts.map((c) => `${c.path}|${c.code}`)).toEqual(a.conflicts.map((c) => `${c.path}|${c.code}`));
  });
  it("no muta la entrada", () => {
    const nodes: RequiredPathNode[] = [{ relativePath: "tokens.css", kind: "file", contentHash: "a".repeat(64), byteLength: 1 }];
    const snapshot = JSON.stringify(nodes);
    classifyBuildOwnership({ previousManifest: { state: "absent" }, artifactNodes: nodes });
    expect(JSON.stringify(nodes)).toBe(snapshot);
  });
});
