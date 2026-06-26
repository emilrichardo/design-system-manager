import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EXPECTED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T059 — segunda ejecución idempotente", () => {
  it("created (exit 0) y luego unchanged (exit 2) sin prompts ni cambios", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);

    const first = await runRealInit(p.dir);
    expect(first.result.status).toBe("created");
    expect(first.exitCode).toBe(0);
    const contentsAfterFirst = EXPECTED_FILES.map((rel) => readFileSync(join(p.dir, rel), "utf8"));
    const entriesAfterFirst = readdirSync(p.dir).sort();

    const second = await runRealInit(p.dir);
    expect(second.result.status).toBe("unchanged");
    expect(second.exitCode).toBe(2);
    expect(second.prompter.requestIdentityCalls).toBe(0);
    expect(second.prompter.confirmCalls).toBe(0);

    // Mismos contenidos, sin archivos adicionales, sin staging.
    expect(EXPECTED_FILES.map((rel) => readFileSync(join(p.dir, rel), "utf8"))).toEqual(contentsAfterFirst);
    expect(readdirSync(p.dir).sort()).toEqual(entriesAfterFirst);
    expect(readdirSync(p.dir).filter((n) => n.startsWith(".neuraz-ds-staging-"))).toEqual([]);
  });
});
