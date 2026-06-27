import { afterEach, describe, expect, it } from "vitest";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { runInspectJson } from "./json-output-helpers.js";

const projects: TmpProject[] = [];

afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T027 — inspect --json conserva todos los paths", () => {
  it("250 tokens → paths.length === total === 250, sin mensaje de truncado", async () => {
    const color: Record<string, unknown> = { $type: "color" };
    for (let i = 0; i < 250; i += 1) {
      color[`t${i}`] = { $value: COLOR, $description: "d" };
    }
    const root = await makeProject(projects, { tokens: { color } });
    const result = await runInspectJson(root);
    const body = result.json.result as { tokens: { total: number; paths: unknown[] } };

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(body.tokens.total).toBe(250);
    expect(body.tokens.paths).toHaveLength(250);
    expect(result.stdout).not.toContain("Mostrando");
    expect(result.stdout).not.toContain("trunc");
  });
});
