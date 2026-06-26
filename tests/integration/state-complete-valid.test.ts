import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTmpProject, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit, samplePrepared } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T052 — estado complete-valid", () => {
  it("→ unchanged (exit 2), no prompts, bytes preservados", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);
    for (const f of samplePrepared()) await writeFileIn(p.dir, f.relativePath, f.content);
    const before = samplePrepared().map((f) => readFileSync(join(p.dir, f.relativePath), "utf8"));

    const { result, exitCode, prompter } = await runRealInit(p.dir);

    expect(result.status).toBe("unchanged");
    expect(exitCode).toBe(2);
    expect(prompter.requestIdentityCalls).toBe(0);
    expect(prompter.confirmCalls).toBe(0);
    // Bytes intactos.
    const after = samplePrepared().map((f) => readFileSync(join(p.dir, f.relativePath), "utf8"));
    expect(after).toEqual(before);
    expect(readdirSync(p.dir).filter((n) => n.startsWith(".neuraz-ds-staging-"))).toEqual([]);
  });
});
