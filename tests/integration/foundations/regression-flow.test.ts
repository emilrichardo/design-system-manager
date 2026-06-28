// T050 (004) - Flujo regresivo init -> foundations -> init unchanged.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { runRealInit } from "../../helpers/real-init.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";
import { category, resultOf, runFoundationsJson } from "./foundations-test-helpers.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function managedBytes(root: string): Promise<Record<string, string>> {
  return {
    packageJson: await readFile(join(root, "package.json"), "utf8"),
    config: await readFile(join(root, MANAGED_FILES.config), "utf8"),
    manifest: await readFile(join(root, MANAGED_FILES.manifest), "utf8"),
    tokens: await readFile(join(root, MANAGED_FILES.tokens), "utf8"),
  };
}

describe("foundations regression flow (T050)", () => {
  it("init -> foundations partial/4 -> init unchanged/2, bytes intactos", async () => {
    const project = await createTmpProject();
    projects.push(project);

    const first = await runRealInit(project.dir);
    expect(first.exitCode).toBe(0);
    expect(first.result.status).toBe("created");
    const before = await managedBytes(project.dir);

    const foundations = await runFoundationsJson(project.dir);
    expect(foundations.code).toBe(4);
    expect(foundations.json.outcome).toBe("partial");
    expect(category(foundations.json, "color")).toMatchObject({
      state: "partial",
      counts: { total: 2, primitive: 0, semantic: 0, unclassified: 2 },
    });
    expect(resultOf(foundations.json).summary).toMatchObject({
      categories: { absent: 8, partial: 1, complete: 0, invalid: 0 },
    });

    const second = await runRealInit(project.dir);
    expect(second.exitCode).toBe(2);
    expect(second.result.status).toBe("unchanged");
    expect(await managedBytes(project.dir)).toEqual(before);
  });
});
