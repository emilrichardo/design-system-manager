// T006 — TokenNodeSummary (C5): typeOrigin literal + typeSourcePath separado.
import { describe, expect, it } from "vitest";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";

describe("TokenNodeSummary (C5)", () => {
  it("token concreto que hereda del grupo: typeOrigin 'group' + typeSourcePath", () => {
    const node: TokenNodeSummary = {
      path: "color.base.blue",
      declaredType: null,
      effectiveType: "color",
      typeOrigin: "group",
      typeSourcePath: "color.base",
      kind: "concrete",
      aliasTarget: null,
      aliasState: "n/a",
      description: "Azul base",
      depth: 3,
      trust: "valid",
    };
    expect(node.typeOrigin).toBe("group");
    expect(node.typeSourcePath).toBe("color.base");
  });

  it("origen distinto de 'group' ⇒ typeSourcePath null (no se usa group:<ruta>)", () => {
    const own: TokenNodeSummary = {
      path: "color.blue",
      declaredType: "color",
      effectiveType: "color",
      typeOrigin: "own",
      typeSourcePath: null,
      kind: "concrete",
      aliasTarget: null,
      aliasState: "n/a",
      description: null,
      depth: 2,
      trust: "valid",
    };
    expect(own.typeOrigin).toBe("own");
    expect(own.typeSourcePath).toBeNull();
  });

  it("alias: kind 'alias', aliasTarget y aliasState; typeOrigin 'alias' con typeSourcePath null", () => {
    const alias: TokenNodeSummary = {
      path: "color.primary",
      declaredType: null,
      effectiveType: "color",
      typeOrigin: "alias",
      typeSourcePath: null,
      kind: "alias",
      aliasTarget: "color.base.blue",
      aliasState: "valid",
      description: null,
      depth: 2,
      trust: "valid",
    };
    expect(alias.kind).toBe("alias");
    expect(alias.aliasTarget).toBe("color.base.blue");
    expect(alias.aliasState).toBe("valid");
    expect(alias.typeSourcePath).toBeNull();
  });

  it("nodo no confiable (tipo no reconocido) ⇒ trust 'untrusted'", () => {
    const node: TokenNodeSummary = {
      path: "weird",
      declaredType: "elevation",
      effectiveType: "elevation",
      typeOrigin: "own",
      typeSourcePath: null,
      kind: "concrete",
      aliasTarget: null,
      aliasState: "n/a",
      description: null,
      depth: 1,
      trust: "untrusted",
    };
    expect(node.trust).toBe("untrusted");
  });
});
