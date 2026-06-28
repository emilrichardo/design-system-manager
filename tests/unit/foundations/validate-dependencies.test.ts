// T020 (004) — Dependencias foundation: primitive no puede depender de semantic.
import { describe, expect, it } from "vitest";
import { validateFoundationDependencies } from "../../../src/application/foundations/validate-dependencies.js";
import type { FoundationTokenInspection } from "../../../src/application/foundations/foundations-ports.js";
import { deepFreeze } from "../json/json-test-utils.js";

const token = (over: Partial<FoundationTokenInspection>): FoundationTokenInspection => ({
  path: "color.base",
  category: "color",
  level: "primitive",
  levelSource: "token",
  levelSourcePath: null,
  declaredType: "color",
  effectiveType: "color",
  typeOrigin: "own",
  typeSourcePath: null,
  kind: "concrete",
  aliasTarget: null,
  aliasState: "n/a",
  trust: "valid",
  ...over,
});

describe("validateFoundationDependencies (T019/T020)", () => {
  it("emite error para primitive → semantic directo", () => {
    const issues = validateFoundationDependencies([
      token({ path: "color.alias", level: "primitive", kind: "alias", aliasTarget: "color.role", aliasState: "valid" }),
      token({ path: "color.role", level: "semantic" }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: "foundation-forbidden-dependency",
      severity: "error",
      document: "tokens",
      path: "color.alias",
    });
  });

  it("detecta primitive → primitive → semantic sin re-resolver $value", () => {
    const issues = validateFoundationDependencies([
      token({ path: "color.a", kind: "alias", aliasTarget: "color.b", aliasState: "valid" }),
      token({ path: "color.b", kind: "alias", aliasTarget: "color.c", aliasState: "valid" }),
      token({ path: "color.c", level: "semantic" }),
    ]);
    expect(issues.map((issue) => issue.path)).toEqual(["color.a", "color.b"]);
  });

  it("permite semantic → primitive, semantic → semantic y primitive → primitive concreto", () => {
    const issues = validateFoundationDependencies([
      token({ path: "color.semantic-to-primitive", level: "semantic", kind: "alias", aliasTarget: "color.base", aliasState: "valid" }),
      token({ path: "color.semantic-to-semantic", level: "semantic", kind: "alias", aliasTarget: "color.role", aliasState: "valid" }),
      token({ path: "color.primitive-to-primitive", kind: "alias", aliasTarget: "color.base", aliasState: "valid" }),
      token({ path: "color.base" }),
      token({ path: "color.role", level: "semantic" }),
    ]);
    expect(issues).toEqual([]);
  });

  it("corta en alias problemático, target ausente, unclassified o unresolved sin duplicar issues de 002", () => {
    const issues = validateFoundationDependencies([
      token({ path: "color.missing", kind: "alias", aliasTarget: "color.role", aliasState: "missing" }),
      token({ path: "color.to-group", kind: "alias", aliasTarget: "color.role", aliasState: "to-group" }),
      token({ path: "color.unknown-target", kind: "alias", aliasTarget: "color.absent", aliasState: "valid" }),
      token({ path: "color.to-unclassified", kind: "alias", aliasTarget: "color.unclassified", aliasState: "valid" }),
      token({ path: "color.to-unresolved", kind: "alias", aliasTarget: "brand.role", aliasState: "valid" }),
      token({ path: "color.unclassified", level: "unclassified" }),
      token({ path: "color.role", level: "semantic" }),
      token({ path: "brand.role", category: "unresolved", level: "semantic" }),
    ]);
    expect(issues).toEqual([]);
  });

  it("termina con ciclos defensivos aunque 002 ya los haya clasificado", () => {
    const issues = validateFoundationDependencies([
      token({ path: "color.a", kind: "alias", aliasTarget: "color.b", aliasState: "valid" }),
      token({ path: "color.b", kind: "alias", aliasTarget: "color.a", aliasState: "valid" }),
    ]);
    expect(issues).toEqual([]);
  });

  it("no muta tokens congelados y preserva orden determinista", () => {
    const tokens = deepFreeze([
      token({ path: "color.a", kind: "alias", aliasTarget: "color.s1", aliasState: "valid" }),
      token({ path: "color.b", kind: "alias", aliasTarget: "color.s2", aliasState: "valid" }),
      token({ path: "color.s1", level: "semantic" }),
      token({ path: "color.s2", level: "semantic" }),
    ]);
    expect(validateFoundationDependencies(tokens).map((issue) => issue.path)).toEqual(["color.a", "color.b"]);
  });
});
