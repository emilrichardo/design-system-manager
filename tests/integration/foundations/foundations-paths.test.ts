// T046 (004) - JSON foundations conserva >200 tokens, sin cota textual.
import { afterEach, describe, expect, it } from "vitest";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";
import { COLOR } from "../../helpers/ds-fixtures.js";
import { foundation, category, runFoundationsJson, seedDesignSystem } from "./foundations-test-helpers.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("foundations JSON paths >200 (T046)", () => {
  it("250 tokens en una categoría se conservan completos", async () => {
    const p = await createTmpProject();
    projects.push(p);
    const color: Record<string, unknown> = { $type: "color", ...foundation("primitive") };
    for (let i = 0; i < 250; i += 1) {
      color[`t${i}`] = { $value: COLOR, $description: "d" };
    }
    await seedDesignSystem(p.dir, { color });
    const r = await runFoundationsJson(p.dir);

    expect(r.code).toBe(0);
    const tokens = category(r.json, "color").tokens as unknown[];
    expect(tokens).toHaveLength(250);
    expect(category(r.json, "color")).toMatchObject({ counts: { total: 250 } });
    expect(r.stdout).not.toContain("Mostrando");
    expect(r.stdout).not.toContain("no se muestran");
  });
});
