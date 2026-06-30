// T046 (007) — Comandos `asset` en proceso: selección de reporter (humano vs JSON), `plan` no escribe,
// apply→unchanged idempotente, remove ownership-bound. Exit codes vía la tabla común.
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { makeAssetCli } from "./asset-cli-fakes.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";
import { png } from "../integration/assets/asset-store-fixtures.js";

const VERSION = "9.9.9";
const argv = (...args: string[]) => ["node", "neuraz-ds", ...args];

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "asset-cli-"));
  await mkdir(join(root, "design-system", "assets"), { recursive: true });
  await writeFile(join(root, "hero.png"), png(10, 5, 2));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function run(args: string[], h = makeAssetCli(root)): Promise<{ code: number; io: typeof h.io }> {
  return runCli({ argv: argv(...args), cwd: root, io: h.io, deps: buildDeps().deps, assetDeps: h.deps, version: VERSION }).then((code) => ({ code, io: h.io }));
}
const exists = async (rel: string): Promise<boolean> => readFile(join(root, "design-system", "assets", rel)).then(() => true).catch(() => false);

describe("asset commands (T046)", () => {
  it("list humano vs --json", async () => {
    expect((await run(["asset", "list"])).io.outText).toContain("Assets: listed");
    const j = await run(["asset", "list", "--json"]);
    expect(j.code).toBe(0);
    expect(j.io.outText).toContain('"command": "asset-list"');
  });

  it("import plan NO escribe (store/manifest intactos)", async () => {
    const r = await run(["asset", "import", "plan", "./hero.png"]);
    expect(r.code).toBe(0);
    expect(r.io.outText).toContain("Asset plan:");
    expect(await exists("images/hero.png")).toBe(false);
    expect(await exists("assets.json")).toBe(false);
  });

  it("import apply → applied/0 y segunda vez unchanged/2; remove → removed/0", async () => {
    const apply1 = await run(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"]);
    expect(apply1.code).toBe(0);
    expect(apply1.io.outText).toContain("Asset: applied");
    expect(await exists("images/hero.png")).toBe(true);

    const apply2 = await run(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"]);
    expect(apply2.code).toBe(2);
    expect(apply2.io.outText).toContain("unchanged");

    const inspect = await run(["asset", "inspect", "images/hero.png", "--json"]);
    expect(inspect.code).toBe(0);
    expect(inspect.io.outText).toContain('"command": "asset-inspect"');

    const remove = await run(["asset", "remove", "images/hero.png"]);
    expect(remove.code).toBe(0);
    expect(remove.io.outText).toContain("Asset: removed");
    expect(await exists("images/hero.png")).toBe(false);
  });

  it("inspect de path no administrado → not-found/5", async () => {
    const r = await run(["asset", "inspect", "images/missing.png"]);
    expect(r.code).toBe(5);
  });

  it("remove de path no administrado → not-found/5, sin escribir", async () => {
    const r = await run(["asset", "remove", "images/missing.png"]);
    expect(r.code).toBe(5);
  });
});
