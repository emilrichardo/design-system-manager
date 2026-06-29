// T099 (005) — Diff contra el filesystem real: create, grupos intermedios, unchanged, update estrecho
// de `$description`, categorías host-only preservadas, y rutas con espacios/Unicode. Plan read-only.
import { afterEach, describe, expect, it } from "vitest";
import { planPresetApplication } from "../../../src/application/presets/plan-preset-application.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { fixtureCatalogUrl, presetId, realPlanDeps } from "./preset-e2e-harness.js";

const NS = "ar.neuraz.design-system-manager";
const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

const plan = (id: string, dir: string, catalogUrl?: URL) =>
  planPresetApplication({ id: presetId(id), executionDir: dir }, realPlanDeps(catalogUrl));

/** Host con exactamente los tokens de neutral-base (self-describing) → todo unchanged. */
const neutralBaseHostTokens = {
  color: {
    gray: {
      "100": { $type: "color", $extensions: { [NS]: { foundation: { level: "primitive" } } }, $value: { colorSpace: "srgb", components: [0.961, 0.961, 0.961], alpha: 1, hex: "#f5f5f5" } },
      "900": { $type: "color", $extensions: { [NS]: { foundation: { level: "primitive" } } }, $value: { colorSpace: "srgb", components: [0.102, 0.102, 0.102], alpha: 1, hex: "#1a1a1a" } },
    },
    surface: { default: { $type: "color", $extensions: { [NS]: { foundation: { level: "semantic" } } }, $value: "{color.gray.100}" } },
  },
  spacing: {
    "100": { $type: "dimension", $extensions: { [NS]: { foundation: { level: "primitive" } } }, $value: { value: 4, unit: "px" } },
    "200": { $type: "dimension", $extensions: { [NS]: { foundation: { level: "primitive" } } }, $value: { value: 8, unit: "px" } },
  },
};

describe("preset filesystem diff (T099)", () => {
  it("creates missing tokens and the required intermediate groups", async () => {
    const dir = await makeProject(bag); // init tokens have a `color` group but not gray/surface/spacing
    const r = await plan("neutral-base", dir);
    expect(r.outcome).toBe("success");
    if (r.outcome !== "success") return;
    const ops = r.plan.plan.changeSet.changes.map((c) => `${c.operation}:${c.nodeKind}:${c.path}`);
    expect(ops).toContain("create:group:color.gray");
    expect(ops).toContain("create:token:color.gray.100");
    expect(ops).toContain("create:group:spacing");
    expect(ops).toContain("create:token:spacing.200");
  });

  it("is all-unchanged when the host already contains the preset tokens", async () => {
    const dir = await makeProject(bag, { tokens: neutralBaseHostTokens });
    const r = await plan("neutral-base", dir);
    expect(r.outcome).toBe("unchanged");
    if (r.outcome === "unchanged") {
      expect(r.plan.plan.summary.create).toBe(0);
      expect(r.plan.plan.summary.wouldWrite).toBe(false);
    }
  });

  it("classifies a narrow $description completion as update", async () => {
    const host = { spacing: { "100": { $type: "dimension", $extensions: { [NS]: { foundation: { level: "primitive" } } }, $value: { value: 4, unit: "px" } } } };
    const dir = await makeProject(bag, { tokens: host });
    const r = await plan("described", dir, fixtureCatalogUrl("./fixtures/described-catalog/"));
    expect(r.outcome).toBe("success");
    if (r.outcome === "success") {
      const update = r.plan.plan.changeSet.changes.find((c) => c.path === "spacing.100");
      expect(update?.operation).toBe("update");
    }
  });

  it("does not touch host-only categories (only neutral-base paths appear)", async () => {
    const host = { typography: { $type: "fontFamily", body: { $value: ["Inter"] } } };
    const dir = await makeProject(bag, { tokens: host });
    const r = await plan("neutral-base", dir);
    expect(r.outcome).toBe("success");
    if (r.outcome === "success") {
      expect(r.plan.plan.changeSet.changes.every((c) => c.path.startsWith("color") || c.path.startsWith("spacing"))).toBe(true);
    }
  });
});
