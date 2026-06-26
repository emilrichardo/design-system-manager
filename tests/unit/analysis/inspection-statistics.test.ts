// T011 — Reglas de conteo / InspectionStatistics (ADR-0010).
import { describe, expect, it } from "vitest";
import {
  computeStatistics,
  emptyStatistics,
} from "../../../src/domain/analysis/inspection-statistics.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";

function node(part: Partial<TokenNodeSummary>): TokenNodeSummary {
  return {
    path: "x",
    declaredType: null,
    effectiveType: "color",
    typeOrigin: "own",
    typeSourcePath: null,
    kind: "concrete",
    aliasTarget: null,
    aliasState: "n/a",
    description: null,
    depth: 1,
    trust: "valid",
    ...part,
  };
}

describe("computeStatistics", () => {
  it("documento sin tokens ⇒ estadísticas vacías", () => {
    expect(computeStatistics([], 0)).toEqual(emptyStatistics);
  });

  it("cuenta total, aliases, concreteValues = total − aliases", () => {
    const nodes = [
      node({ path: "color.blue", kind: "concrete", effectiveType: "color", depth: 2 }),
      node({
        path: "color.primary",
        kind: "alias",
        aliasTarget: "color.blue",
        aliasState: "valid",
        effectiveType: "color",
        typeOrigin: "alias",
        depth: 2,
      }),
    ];
    const s = computeStatistics(nodes, 1);
    expect(s.total).toBe(2);
    expect(s.aliases).toBe(1);
    expect(s.concreteValues).toBe(1);
    expect(s.groups).toBe(1);
  });

  it("byType usa el tipo efectivo; sin tipo ⇒ (untyped); conserva literal no reconocido", () => {
    const nodes = [
      node({ path: "a", effectiveType: "color" }),
      node({ path: "b", effectiveType: "color" }),
      node({ path: "c", effectiveType: null, typeOrigin: "none", trust: "recovered" }),
      node({ path: "d", effectiveType: "elevation", typeOrigin: "own", trust: "untrusted" }),
    ];
    const s = computeStatistics(nodes, 0);
    expect(s.byType).toEqual({ color: 2, "(untyped)": 1, elevation: 1 });
  });

  it("maxDepth = mayor profundidad de token (raíz=0)", () => {
    const nodes = [node({ path: "a", depth: 1 }), node({ path: "a.b.c", depth: 3 })];
    expect(computeStatistics(nodes, 0).maxDepth).toBe(3);
  });

  it("aliasIssues cuenta aliases problemáticos (missing/to-group/cyclic/malformed)", () => {
    const nodes = [
      node({ path: "ok", kind: "alias", aliasState: "valid" }),
      node({ path: "bad1", kind: "alias", aliasState: "missing" }),
      node({ path: "bad2", kind: "alias", aliasState: "cyclic" }),
    ];
    expect(computeStatistics(nodes, 0).aliasIssues).toBe(2);
  });

  it("no muta la entrada y es determinista", () => {
    const nodes = [node({ path: "a" })];
    const a = computeStatistics(nodes, 0);
    const b = computeStatistics(nodes, 0);
    expect(a).toEqual(b);
    expect(nodes).toHaveLength(1);
  });
});
