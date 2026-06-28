// T018 (004) — Proyección de token foundation (T017): une nodo de 002 + resolución de nivel + categoría.
import { describe, expect, it } from "vitest";
import { projectFoundationToken } from "../../../src/application/foundations/project-foundation-token.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";
import type { FoundationLevelResolution } from "../../../src/domain/foundations/foundation-level.js";
import { deepFreeze } from "../json/json-test-utils.js";

const node = (over: Partial<TokenNodeSummary> = {}): TokenNodeSummary => ({
  path: "color.blue.500",
  declaredType: "color",
  effectiveType: "color",
  typeOrigin: "own",
  typeSourcePath: null,
  kind: "concrete",
  aliasTarget: null,
  aliasState: "n/a",
  description: null,
  depth: 3,
  trust: "valid",
  ...over,
});

const RES = {
  primitiveToken: { level: "primitive", source: "token", sourcePath: null, valid: true },
  semanticGroup: { level: "semantic", source: "group", sourcePath: "color.role", valid: true },
  unclassifiedNone: { level: "unclassified", source: "none", sourcePath: null, valid: true },
  invalidGroup: { level: "unclassified", source: "invalid", sourcePath: "color", valid: false },
} as const satisfies Record<string, FoundationLevelResolution>;

describe("projectFoundationToken (T018)", () => {
  it("primitive (token source) → levelSourcePath null; categoría resuelta", () => {
    const t = projectFoundationToken(node(), RES.primitiveToken);
    expect(t.level).toBe("primitive");
    expect(t.levelSource).toBe("token");
    expect(t.levelSourcePath).toBeNull();
    expect(t.category).toBe("color");
  });

  it("semantic heredado de grupo → conserva el path del grupo", () => {
    const t = projectFoundationToken(node({ path: "color.role.bg" }), RES.semanticGroup);
    expect(t.level).toBe("semantic");
    expect(t.levelSource).toBe("group");
    expect(t.levelSourcePath).toBe("color.role");
  });

  it("unclassified/none", () => {
    const t = projectFoundationToken(node({ path: "spacing.300" }), RES.unclassifiedNone);
    expect(t).toMatchObject({ level: "unclassified", levelSource: "none", levelSourcePath: null });
    expect(t.category).toBe("spacing");
  });

  it("metadata inválida de grupo → unclassified/invalid con path del declarante", () => {
    const t = projectFoundationToken(node(), RES.invalidGroup);
    expect(t).toMatchObject({ level: "unclassified", levelSource: "invalid", levelSourcePath: "color" });
  });

  it("categoría unresolved cuando el primer segmento no coincide", () => {
    const t = projectFoundationToken(node({ path: "background.default" }), RES.semanticGroup);
    expect(t.category).toBe("unresolved");
  });

  it("reutiliza alias/tipos/trust sin reinterpretarlos", () => {
    const aliasNode = node({
      path: "color.role.primary",
      kind: "alias",
      aliasTarget: "color.blue.500",
      aliasState: "valid",
      declaredType: null,
      effectiveType: "color",
      typeOrigin: "alias",
      typeSourcePath: null,
      trust: "recovered",
    });
    const t = projectFoundationToken(aliasNode, RES.semanticGroup);
    expect(t).toMatchObject({
      kind: "alias",
      aliasTarget: "color.blue.500",
      aliasState: "valid",
      declaredType: null,
      effectiveType: "color",
      typeOrigin: "alias",
      typeSourcePath: null,
      trust: "recovered",
    });
  });

  it("conserva exactamente los 13 campos aprobados; sin campos prohibidos", () => {
    const t = projectFoundationToken(node(), RES.primitiveToken);
    expect(Object.keys(t).sort()).toEqual(
      [
        "aliasState",
        "aliasTarget",
        "category",
        "declaredType",
        "effectiveType",
        "kind",
        "level",
        "levelSource",
        "levelSourcePath",
        "path",
        "trust",
        "typeOrigin",
        "typeSourcePath",
      ].sort(),
    );
    expect("$value" in t).toBe(false);
    expect("$extensions" in t).toBe(false);
    expect("description" in t).toBe(false);
    expect("depth" in t).toBe(false);
  });

  it("no muta el nodo ni la resolución congelados; devuelve un objeto nuevo", () => {
    const n = deepFreeze(node());
    const r = deepFreeze({ ...RES.primitiveToken });
    expect(() => projectFoundationToken(n, r)).not.toThrow();
    const t = projectFoundationToken(n, r);
    expect(t).not.toBe(n);
  });

  it("determinista: mismo input → resultado profundamente igual", () => {
    const n = node({ path: "radius.lg" });
    expect(projectFoundationToken(n, RES.primitiveToken)).toEqual(
      projectFoundationToken(n, RES.primitiveToken),
    );
  });
});
