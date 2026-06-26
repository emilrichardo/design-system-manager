import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EXPECTED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T051 — estado none", () => {
  it("solicita identidad, confirma, crea → created (exit 0)", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);

    const { result, exitCode, prompter } = await runRealInit(p.dir);

    expect(result.status).toBe("created");
    expect(exitCode).toBe(0);
    expect(prompter.requestIdentityCalls).toBe(1);
    expect(prompter.confirmCalls).toBe(1);
    for (const rel of EXPECTED_FILES) expect(existsSync(join(p.dir, rel))).toBe(true);
  });
});
