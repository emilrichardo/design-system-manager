// T041 (005) — Equivalencia estructural y de campos administrados (`jsonEquivalent`, `managedDifference`).
import { describe, expect, it } from "vitest";
import { jsonEquivalent, managedDifference } from "../../../src/domain/changes/equivalence.js";
import type { ManagedNode } from "../../../src/domain/changes/equivalence.js";
import { deepFreeze } from "../json/json-test-utils.js";

const node = (over: Partial<ManagedNode> = {}): ManagedNode => ({
  path: "color.gray.100",
  nodeKind: "token",
  category: "color",
  value: { colorSpace: "srgb", components: [0, 0, 0] },
  aliasTarget: null,
  effectiveType: "color",
  level: "primitive",
  description: null,
  ...over,
});

describe("jsonEquivalent (T041)", () => {
  it("treats 1 and 1.0 as the same JSON number", () => {
    expect(jsonEquivalent(1, 1.0)).toBe(true);
  });

  it("is insensitive to object key order", () => {
    expect(jsonEquivalent({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(jsonEquivalent({ colorSpace: "srgb", components: [0, 0, 1] }, { components: [0, 0, 1], colorSpace: "srgb" })).toBe(true);
  });

  it("is sensitive to array order", () => {
    expect(jsonEquivalent([1, 2, 3], [3, 2, 1])).toBe(false);
    expect(jsonEquivalent([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("distinguishes primitives and shapes", () => {
    expect(jsonEquivalent("a", "b")).toBe(false);
    expect(jsonEquivalent(true, false)).toBe(false);
    expect(jsonEquivalent(null, null)).toBe(true);
    expect(jsonEquivalent({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(jsonEquivalent([1], { 0: 1 })).toBe(false);
  });

  it("does not mutate frozen inputs", () => {
    const a = deepFreeze({ components: [0, 0, 1] });
    const b = deepFreeze({ components: [0, 0, 1] });
    expect(() => jsonEquivalent(a, b)).not.toThrow();
    expect(jsonEquivalent(a, b)).toBe(true);
  });
});

describe("managedDifference (T041)", () => {
  it("returns null for managed-equivalent tokens (key order irrelevant)", () => {
    expect(managedDifference(node(), node({ value: { components: [0, 0, 0], colorSpace: "srgb" } }))).toBeNull();
  });

  it("detects a differing $value", () => {
    expect(managedDifference(node(), node({ value: { colorSpace: "srgb", components: [1, 1, 1] } }))).toBe("value");
  });

  it("treats identical alias targets as equivalent and different ones as alias diff", () => {
    expect(managedDifference(node({ aliasTarget: "color.base" }), node({ aliasTarget: "color.base" }))).toBeNull();
    expect(managedDifference(node({ aliasTarget: "color.base" }), node({ aliasTarget: "color.other" }))).toBe("alias");
    expect(managedDifference(node({ aliasTarget: "color.base" }), node({ aliasTarget: null }))).toBe("alias");
  });

  it("detects effective type and foundation level differences", () => {
    expect(managedDifference(node(), node({ effectiveType: "dimension" }))).toBe("type");
    expect(managedDifference(node(), node({ level: "semantic" }))).toBe("level");
  });

  it("ignores unknown content (only managed fields compared)", () => {
    // Same managed fields → equivalent, regardless of unknown extensions/props (absent from ManagedNode).
    expect(managedDifference(node({ description: "x" }), node({ description: "y" }))).toBeNull();
  });

  it("does not mutate frozen inputs", () => {
    const a = deepFreeze(node());
    const b = deepFreeze(node());
    expect(() => managedDifference(a, b)).not.toThrow();
  });
});
