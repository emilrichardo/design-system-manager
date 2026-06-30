// T154 (006) — Regresión de 005 (presets): list/inspect/plan (read-only) y apply (escritura atómica,
// idempotente) conservan outcomes/exits/JSON y no cambian con 006. plan no escribe; apply → applied/0 y
// luego unchanged/2.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";

const TOKENS_REL = "design-system/tokens/base.tokens.json";
const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});
async function host(): Promise<string> {
  const p = await makeHostProject();
  hosts.push(p);
  return p.dir;
}

describe("regression 005 — presets (T154)", () => {
  it("list/inspect → exit 0; JSON con outcome success", async () => {
    const dir = await host();
    const list = await runBinary(["presets", "list", "--json"], dir);
    expect(list.code).toBe(0);
    expect(JSON.parse(list.stdout)).toMatchObject({ formatVersion: "1.0.0", command: "preset-list", outcome: "success" });

    const inspect = await runBinary(["presets", "inspect", "neutral-base", "--json"], dir);
    expect(inspect.code).toBe(0);
    expect(JSON.parse(inspect.stdout)).toMatchObject({ command: "preset-inspect", outcome: "success" });
  });

  it("plan es read-only: no modifica los bytes del host", async () => {
    const dir = await host();
    const before = readFileSync(join(dir, TOKENS_REL));
    const plan = await runBinary(["presets", "plan", "neutral-base", "--json"], dir);
    expect(plan.code).toBe(0);
    expect(JSON.parse(plan.stdout)).toMatchObject({ command: "preset-plan" });
    expect(readFileSync(join(dir, TOKENS_REL))).toEqual(before);
  });

  it("apply → applied/0 y segunda aplicación → unchanged/2 (idempotente)", async () => {
    const dir = await host();
    const apply1 = await runBinary(["presets", "apply", "neutral-base", "--json"], dir);
    expect(apply1.code).toBe(0);
    expect(JSON.parse(apply1.stdout)).toMatchObject({ command: "preset-apply", outcome: "applied" });

    const bytes = readFileSync(join(dir, TOKENS_REL));
    const apply2 = await runBinary(["presets", "apply", "neutral-base"], dir);
    expect(apply2.code).toBe(2);
    expect(apply2.stdout).toContain("unchanged");
    expect(readFileSync(join(dir, TOKENS_REL))).toEqual(bytes);
    // presets no genera un build dir.
    expect(existsSync(join(dir, "design-system", "build"))).toBe(false);
  });
});
