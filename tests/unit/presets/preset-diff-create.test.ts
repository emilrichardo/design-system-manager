// T042 (005) — Diff: operación `create` para tokens y grupos padre ausentes, con orden padres-antes-hijos.
import { describe, expect, it } from "vitest";
import { planPresetDiff } from "../../../src/application/presets/plan-preset-diff.js";
import type { ManagedNode } from "../../../src/domain/changes/equivalence.js";

const tok = (path: string, over: Partial<ManagedNode> = {}): ManagedNode => ({
  path,
  nodeKind: "token",
  category: path.split(".")[0] as ManagedNode["category"],
  value: { value: 4, unit: "px" },
  aliasTarget: null,
  effectiveType: "dimension",
  level: "primitive",
  description: null,
  ...over,
});
const grp = (path: string): ManagedNode => ({
  path,
  nodeKind: "group",
  category: path.split(".")[0] as ManagedNode["category"],
  value: null,
  aliasTarget: null,
  effectiveType: null,
  level: "unclassified",
  description: null,
});

const ops = (changes: readonly { operation: string; nodeKind: string; path: string }[]) =>
  changes.map((c) => `${c.operation}:${c.nodeKind}:${c.path}`);

describe("preset diff create (T042)", () => {
  it("creates an absent token", () => {
    const r = planPresetDiff({ candidates: [tok("spacing.100")], host: new Map() });
    expect(ops(r.plan.changeSet.changes)).toEqual(["create:token:spacing.100"]);
    expect(r.plan.writable).toBe(true);
  });

  it("creates absent parent groups and the token, parents before child", () => {
    const r = planPresetDiff({
      candidates: [grp("color"), grp("color.gray"), tok("color.gray.100", { effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0] } })],
      host: new Map(),
    });
    expect(ops(r.plan.changeSet.changes)).toEqual([
      "create:group:color",
      "create:group:color.gray",
      "create:token:color.gray.100",
    ]);
  });

  it("creates only the missing groups when a compatible parent already exists", () => {
    const host = new Map<string, ManagedNode>([["color", grp("color")]]);
    const r = planPresetDiff({
      candidates: [grp("color"), grp("color.gray"), tok("color.gray.100", { effectiveType: "color", value: { colorSpace: "srgb", components: [0, 0, 0] } })],
      host,
    });
    expect(ops(r.plan.changeSet.changes)).toEqual([
      "unchanged:group:color",
      "create:group:color.gray",
      "create:token:color.gray.100",
    ]);
    expect(r.plan.writable).toBe(true);
  });

  it("preserves nodeKind on each created change", () => {
    const r = planPresetDiff({ candidates: [grp("spacing"), tok("spacing.100")], host: new Map() });
    const group = r.plan.changeSet.changes.find((c) => c.path === "spacing");
    const token = r.plan.changeSet.changes.find((c) => c.path === "spacing.100");
    expect(group?.nodeKind).toBe("group");
    expect(token?.nodeKind).toBe("token");
  });
});
