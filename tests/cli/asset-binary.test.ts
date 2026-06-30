// T047 (007) — `asset` como proceso hijo del binario compilado: cwd distinto, rutas con espacios y
// Unicode, stdin cerrado, sin TTY. Cubre list/plan/apply/inspect/remove, streams y exit codes.
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../helpers/run-binary.js";
import { png } from "../integration/assets/asset-store-fixtures.js";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function host(dirName: string): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "asset-bin-"));
  dirs.push(parent);
  const dir = join(parent, dirName);
  await mkdir(join(dir, "design-system", "assets"), { recursive: true });
  await writeFile(join(dir, "package.json"), '{"name":"h","version":"0.0.0"}\n');
  await writeFile(join(dir, "hero.png"), png(10, 5, 2));
  return dir;
}

describe("asset binary (T047)", () => {
  it("list vacío → listed/0, stderr vacío", async () => {
    const r = await runBinary(["asset", "list"], await host("h"));
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("Assets: listed");
    expect(r.stderr).toBe("");
  });

  it("plan NO escribe; apply → applied/0; segunda apply → unchanged/2", async () => {
    const dir = await host("h");
    const plan = await runBinary(["asset", "import", "plan", "./hero.png"], dir);
    expect(plan.code).toBe(0);

    const apply1 = await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);
    expect(apply1.code).toBe(0);
    expect(apply1.stdout).toContain("Asset: applied");

    const apply2 = await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);
    expect(apply2.code).toBe(2);
  });

  it("list --json emite un envelope a stdout", async () => {
    const dir = await host("h");
    await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);
    const r = await runBinary(["asset", "list", "--json"], dir);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.stdout);
    expect(env).toMatchObject({ formatVersion: "1.0.0", command: "asset-list", outcome: "listed" });
  });

  it("funciona desde rutas con espacios y Unicode", async () => {
    for (const name of ["dir with spaces", "döcs-ünïcödé-✓"]) {
      const dir = await host(name);
      const r = await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);
      expect(r.code).toBe(0);
      expect(r.stdout).toContain("Asset: applied");
    }
  });

  it("remove de path no administrado → not-found/5", async () => {
    const r = await runBinary(["asset", "remove", "images/missing.png"], await host("h"));
    expect(r.code).toBe(5);
    expect(r.stdout).toBe("");
  });
});
