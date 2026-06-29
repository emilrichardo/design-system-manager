// T040 (005) — Normalización del preset (nodos validados) al modelo genérico de cambios candidatos.
import { describe, expect, it } from "vitest";
import { normalizePresetChangeSet } from "../../../src/application/presets/normalize-preset-change-set.js";
import type { PresetTokenNode } from "../../../src/application/presets/preset-ports.js";

const node = (path: string, over: Partial<PresetTokenNode> = {}): PresetTokenNode => ({
  path,
  category: "color",
  declaredType: null,
  effectiveType: "color",
  typeOrigin: "group",
  typeSourcePath: null,
  kind: "concrete",
  aliasTarget: null,
  aliasState: "n/a",
  trust: "valid",
  level: "primitive",
  levelSource: "group",
  levelSourcePath: "color",
  typeCompatibility: "compatible",
  ...over,
});

describe("normalizePresetChangeSet (T040)", () => {
  it("maps token nodes to ordered create candidates with parent groups first", () => {
    const r = normalizePresetChangeSet([
      node("color.gray.100"),
      node("color.surface.default", { level: "semantic", kind: "alias", aliasTarget: "color.gray.100" }),
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.changeSet.changes.map((c) => `${c.operation}:${c.nodeKind}:${c.path}`)).toEqual([
      "create:group:color",
      "create:group:color.gray",
      "create:token:color.gray.100",
      "create:group:color.surface",
      "create:token:color.surface.default",
    ]);
  });

  it("carries category/level and no preset metadata; no proposed fragment in this checkpoint", () => {
    const r = normalizePresetChangeSet([node("color.gray.100")]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const token = r.changeSet.changes.find((c) => c.nodeKind === "token");
    expect(token).toMatchObject({ category: "color", level: "primitive", proposedToken: null });
    for (const change of r.changeSet.changes) {
      expect(change).not.toHaveProperty("presetId");
      expect(change).not.toHaveProperty("source");
    }
  });

  it("does not duplicate shared parent groups across tokens", () => {
    const r = normalizePresetChangeSet([node("color.gray.100"), node("color.gray.900")]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const groupColorGray = r.changeSet.changes.filter((c) => c.path === "color.gray");
    expect(groupColorGray).toHaveLength(1);
  });

  it("skips unresolved-category nodes defensively", () => {
    const r = normalizePresetChangeSet([node("button.primary", { category: "unresolved" }), node("color.gray.100")]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.changeSet.changes.every((c) => c.category === "color")).toBe(true);
  });
});
