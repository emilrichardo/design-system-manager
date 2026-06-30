// T114 (006) — Límites de nodos desconocidos reusando ANALYSIS_LIMITS: límite exacto vs límite+1,
// directorios anidados, directorio vacío.
import { describe, expect, it } from "vitest";
import { classifyUnknownNodes } from "../../../src/application/build-export/classify-unknown-nodes.js";
import { ANALYSIS_LIMITS } from "../../../src/domain/traversal/limits.js";
import type { RawOutputNode } from "../../../src/domain/build-export/build-snapshot.js";

describe("classify unknown nodes — limits (T114)", () => {
  it("profundidad exacta permitida; profundidad+1 rechazada", () => {
    expect(classifyUnknownNodes([{ relativePath: "a", rawKind: "regular-file", byteLength: 1, depth: ANALYSIS_LIMITS.maxDepth }]).ok).toBe(true);
    const over = classifyUnknownNodes([{ relativePath: "a", rawKind: "regular-file", byteLength: 1, depth: ANALYSIS_LIMITS.maxDepth + 1 }]);
    expect(over.ok).toBe(false);
  });

  it("archivo por encima del presupuesto de bytes total → rechazado", () => {
    const over = classifyUnknownNodes([{ relativePath: "big", rawKind: "regular-file", byteLength: ANALYSIS_LIMITS.maxTotalBytes + 1, depth: 0 }]);
    expect(over.ok).toBe(false);
  });

  it("bytes totales acumulados por encima del presupuesto → rechazado", () => {
    const half = Math.ceil(ANALYSIS_LIMITS.maxTotalBytes / 2) + 1;
    const r = classifyUnknownNodes([
      { relativePath: "a", rawKind: "regular-file", byteLength: half, depth: 0 },
      { relativePath: "b", rawKind: "regular-file", byteLength: half, depth: 0 },
    ]);
    expect(r.ok).toBe(false);
  });

  it("directorios anidados permitidos dentro de los límites", () => {
    const nodes: RawOutputNode[] = [
      { relativePath: "d", rawKind: "regular-directory", byteLength: null, depth: 0 },
      { relativePath: "d/e", rawKind: "regular-directory", byteLength: null, depth: 1 },
      { relativePath: "d/e/f.txt", rawKind: "regular-file", byteLength: 4, depth: 2 },
    ];
    expect(classifyUnknownNodes(nodes).ok).toBe(true);
  });

  it("directorio vacío (lista vacía) → ok sin nodos", () => {
    const r = classifyUnknownNodes([]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nodes).toEqual([]);
  });
});
