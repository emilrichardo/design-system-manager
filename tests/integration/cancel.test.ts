import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function assertNoWrites(dir: string): Promise<void> {
  expect(existsSync(join(dir, "design-system"))).toBe(false);
  expect(existsSync(join(dir, "neuraz-ds.config.json"))).toBe(false);
  expect(readdirSync(dir).filter((n) => n.startsWith(".neuraz-ds-staging-"))).toEqual([]);
}

describe("T057 — cancelación", () => {
  it("cancelación durante la identidad → cancelled (exit 1), sin escrituras", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);
    const { result, exitCode, prompter, reporter } = await runRealInit(p.dir, { identity: { kind: "cancelled" } });
    expect(result.status).toBe("cancelled");
    expect(exitCode).toBe(1);
    expect(prompter.confirmCalls).toBe(0);
    expect(reporter.result?.status).toBe("cancelled");
    await assertNoWrites(p.dir);
  });

  it("confirmación negativa → cancelled (exit 1), sin escrituras", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);
    const { result, exitCode } = await runRealInit(p.dir, { confirm: { kind: "answered", value: false } });
    expect(result.status).toBe("cancelled");
    expect(exitCode).toBe(1);
    await assertNoWrites(p.dir);
  });

  it("cancelación explícita en confirmación → cancelled (exit 1), sin escrituras", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);
    const { result, exitCode } = await runRealInit(p.dir, { confirm: { kind: "cancelled" } });
    expect(result.status).toBe("cancelled");
    expect(exitCode).toBe(1);
    await assertNoWrites(p.dir);
  });
});
