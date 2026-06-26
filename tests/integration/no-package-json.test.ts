import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T050 — sin package.json (end-to-end)", () => {
  it("→ failed/host (exit 5), no solicita identidad, cero escrituras", async () => {
    // Proyecto temporal SIN package.json y sin .git (no halla package.json al ascender).
    const p = await createTmpProject({ packageJson: false });
    projects.push(p);

    const { result, exitCode, prompter, reporter } = await runRealInit(p.dir);

    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.category).toBe("host");
    expect(exitCode).toBe(5);
    expect(prompter.requestIdentityCalls).toBe(0);
    expect(prompter.confirmCalls).toBe(0);
    expect(reporter.result?.status).toBe("failed");
    expect(existsSync(join(p.dir, "design-system"))).toBe(false);
    expect(readdirSync(p.dir)).toEqual([]);
  });
});
