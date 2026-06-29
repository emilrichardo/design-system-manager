// T098 (005) — Estados de proyecto contra el filesystem real, vía los casos de uso con dependencias
// reales (host analyze enlazado de 002 + catálogo empaquetado). Read-only para plan; sin escrituras.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { planPresetApplication } from "../../../src/application/presets/plan-preset-application.js";
import { emptyProject, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { TOKENS_REL, fixtureCatalogUrl, presetId, realPlanDeps } from "./preset-e2e-harness.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

const plan = (id: string, dir: string, catalogUrl?: URL) =>
  planPresetApplication({ id: presetId(id), executionDir: dir }, realPlanDeps(catalogUrl));

describe("preset filesystem states (T098)", () => {
  it("project without a Design System → not-found:design-system", async () => {
    const dir = await emptyProject(bag);
    const r = await plan("neutral-base", dir);
    expect(r.outcome).toBe("not-found");
    if (r.outcome === "not-found") expect(r.notFoundResource).toBe("design-system");
  });

  it("initialized project + valid preset → success with creates", async () => {
    const dir = await makeProject(bag);
    const r = await plan("neutral-base", dir);
    expect(r.outcome).toBe("success");
    if (r.outcome === "success") {
      expect(r.plan.targetFile).toBe(TOKENS_REL);
      expect(r.plan.plan.summary.create).toBeGreaterThan(0);
      expect(r.plan.plan.writable).toBe(true);
    }
  });

  it("nonexistent preset → not-found:preset (distinct from design-system)", async () => {
    const dir = await makeProject(bag);
    const r = await plan("does-not-exist", dir);
    expect(r.outcome).toBe("not-found");
    if (r.outcome === "not-found") expect(r.notFoundResource).toBe("preset");
  });

  it("invalid bundled preset → invalid-preset (via injected fixture catalog)", async () => {
    const dir = await makeProject(bag);
    const r = await plan("bad", dir, fixtureCatalogUrl("./fixtures/invalid-catalog/"));
    expect(r.outcome).toBe("invalid-preset");
  });

  it("unreadable target (invalid JSON) → read-error", async () => {
    const dir = await makeProject(bag, { tokens: "{ not valid json" });
    expect((await plan("neutral-base", dir)).outcome).toBe("read-error");
  });

  it("invalid UTF-8 target → read-error", async () => {
    const dir = await makeProject(bag);
    await writeFile(join(dir, TOKENS_REL), Buffer.from([0xff, 0xfe, 0x00, 0x9f]));
    expect((await plan("neutral-base", dir)).outcome).toBe("read-error");
  });

  it("plan is read-only: the target bytes are unchanged afterwards", async () => {
    const dir = await makeProject(bag);
    const { readFile } = await import("node:fs/promises");
    const before = await readFile(join(dir, TOKENS_REL));
    await plan("neutral-base", dir);
    expect(await readFile(join(dir, TOKENS_REL))).toEqual(before);
  });
});
