// T113 (006) — Clasificación de nodos desconocidos por kind: regular file/dir permitidos; symlink,
// FIFO, socket, device, special y path-escape rechazados → unsupported-unknown-node (vía seam/fake).
import { describe, expect, it } from "vitest";
import { classifyUnknownNodes } from "../../../src/application/build-export/classify-unknown-nodes.js";
import type { RawNodeKind, RawOutputNode } from "../../../src/domain/build-export/build-snapshot.js";

function node(relativePath: string, rawKind: RawNodeKind, byteLength: number | null = 0, depth = 0): RawOutputNode {
  return { relativePath, rawKind, byteLength, depth };
}

describe("classify unknown nodes — kinds (T113)", () => {
  it("permite archivos y directorios regulares (copyAction copy)", () => {
    const r = classifyUnknownNodes([node("notes.txt", "regular-file", 10), node("extra", "regular-directory", null)]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes.map((n) => `${n.relativePath}:${n.kind}:${n.copyAction}`)).toEqual(["notes.txt:regular-file:copy", "extra:regular-directory:copy"]);
  });

  it.each(["symlink", "socket", "fifo", "block-device", "char-device", "other"] as const)("rechaza %s → unsupported-unknown-node", (kind) => {
    const r = classifyUnknownNodes([node(`weird-${kind}`, kind)]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conflicts[0]?.code).toBe("unsupported-unknown-node");
    expect(r.conflicts[0]?.blocksWrite).toBe(true);
  });

  it("rechaza path traversal / absoluto", () => {
    expect(classifyUnknownNodes([node("../escape.txt", "regular-file", 1)]).ok).toBe(false);
    expect(classifyUnknownNodes([node("/abs.txt", "regular-file", 1)]).ok).toBe(false);
  });

  it("un cambio de node kind concurrente (file→symlink) se rechaza al reclasificar", () => {
    expect(classifyUnknownNodes([node("notes.txt", "regular-file", 1)]).ok).toBe(true);
    expect(classifyUnknownNodes([node("notes.txt", "symlink", null)]).ok).toBe(false);
  });

  it("conflictos en orden determinista por path", () => {
    const r = classifyUnknownNodes([node("z", "socket"), node("a", "fifo")]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conflicts.map((c) => c.path)).toEqual(["a", "z"]);
  });
});
