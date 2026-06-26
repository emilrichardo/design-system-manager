// T010 — Precedencia del $type efectivo (C1). Función pura con resolvedores inyectados.
import { describe, expect, it } from "vitest";
import {
  resolveEffectiveType,
  type EffectiveTypeContext,
  type EffectiveTypeNode,
} from "../../../src/domain/traversal/effective-type.js";

const noGroup: EffectiveTypeContext["nearestGroupType"] = () => null;
const noAlias: EffectiveTypeContext["resolveAliasType"] = () => null;

function ctx(part: Partial<EffectiveTypeContext>): EffectiveTypeContext {
  return { resolveAliasType: noAlias, nearestGroupType: noGroup, ...part };
}

const concrete = (declaredType: string | null): EffectiveTypeNode => ({
  declaredType,
  isAlias: false,
  aliasTarget: null,
});
const alias = (target: string | null, declaredType: string | null = null): EffectiveTypeNode => ({
  declaredType,
  isAlias: true,
  aliasTarget: target,
});

describe("resolveEffectiveType — precedencia C1", () => {
  it("(1) tipo propio gana sobre alias y grupo", () => {
    const r = resolveEffectiveType(alias("color.base.blue", "color"), {
      resolveAliasType: () => "dimension",
      nearestGroupType: () => ({ type: "number", path: "g" }),
    });
    expect(r).toEqual({ effectiveType: "color", typeOrigin: "own", typeSourcePath: null });
  });

  it("(2) alias sin tipo propio toma el tipo del referenciado; gana al grupo", () => {
    const r = resolveEffectiveType(alias("color.base.blue"), {
      resolveAliasType: () => "color",
      nearestGroupType: () => ({ type: "dimension", path: "spacing" }),
    });
    expect(r).toEqual({ effectiveType: "color", typeOrigin: "alias", typeSourcePath: null });
  });

  it("(2b) alias encadenado: el resolvedor devuelve el tipo final", () => {
    const r = resolveEffectiveType(alias("a.b"), ctx({ resolveAliasType: () => "shadow" }));
    expect(r.effectiveType).toBe("shadow");
    expect(r.typeOrigin).toBe("alias");
  });

  it("(2c) alias roto ⇒ indeterminable (no cae al grupo)", () => {
    const r = resolveEffectiveType(alias("missing.token"), {
      resolveAliasType: () => null,
      nearestGroupType: () => ({ type: "color", path: "g" }),
    });
    expect(r).toEqual({ effectiveType: null, typeOrigin: "none", typeSourcePath: null });
  });

  it("(2d) alias cíclico ⇒ indeterminable", () => {
    const r = resolveEffectiveType(alias("self"), ctx({ resolveAliasType: () => null }));
    expect(r.effectiveType).toBeNull();
    expect(r.typeOrigin).toBe("none");
  });

  it("(3) token concreto hereda del grupo ancestro más cercano; expone typeSourcePath", () => {
    const r = resolveEffectiveType(concrete(null), {
      resolveAliasType: noAlias,
      nearestGroupType: () => ({ type: "color", path: "color.base" }),
    });
    expect(r).toEqual({ effectiveType: "color", typeOrigin: "group", typeSourcePath: "color.base" });
  });

  it("(4) sin tipo propio, sin alias y sin grupo ⇒ indeterminable", () => {
    const r = resolveEffectiveType(concrete(null), ctx({}));
    expect(r).toEqual({ effectiveType: null, typeOrigin: "none", typeSourcePath: null });
  });

  it("no infiere desde $value ni usa $extensions (la función solo ve declaredType/isAlias/target)", () => {
    // Un nodo concreto sin tipo no obtiene tipo aunque 'tenga' un valor con forma de color.
    const r = resolveEffectiveType(concrete(null), ctx({}));
    expect(r.effectiveType).toBeNull();
  });
});
