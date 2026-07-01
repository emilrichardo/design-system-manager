// T054 (009) — Ninguna sesión del Viewer modifica `design-system/build/**`, `design-system/assets/**`, el
// manifest del host, el manifest de assets ni el resultado de `token plan`/`token apply` de `008`;
// `001`–`008` byte-estables.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { png } from "../assets/asset-store-fixtures.js";

const TOKENS_REL = "design-system/tokens/base.tokens.json";
const MANIFEST_REL = "design-system/design-system.json";
const ASSET_MANIFEST_REL = "design-system/assets/assets.json";
const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});
async function host(): Promise<HostProject> {
  const p = await makeHostProject();
  hosts.push(p);
  return p;
}
async function commandFile(dir: string, operations: readonly unknown[]): Promise<string> {
  const path = join(dir, "mutation.json");
  await writeFile(path, `${JSON.stringify({ formatVersion: "1.0.0", operations }, null, 2)}\n`, "utf8");
  return path;
}

describe("regression 001–008 — Viewer sessions do not touch anything (T054)", () => {
  it("view --json no modifica build/assets/manifest/tokens tras un build y una importación de assets reales", async () => {
    const p = await host();
    await runBinary(["build"], p.dir);
    await writeFile(join(p.dir, "hero.png"), png(8, 8, 1));
    await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], p.dir);

    const buildBefore = await readFile(join(p.dir, "design-system", "build", "manifest.json"), "utf8");
    const assetManifestBefore = await readFile(join(p.dir, ASSET_MANIFEST_REL), "utf8");
    const hostManifestBefore = await readFile(join(p.dir, MANIFEST_REL), "utf8");
    const tokensBefore = await readFile(join(p.dir, TOKENS_REL), "utf8");

    const r = await runBinary(["view", "--json"], p.dir);
    expect(r.code).toBe(0);

    expect(await readFile(join(p.dir, "design-system", "build", "manifest.json"), "utf8")).toBe(buildBefore);
    expect(await readFile(join(p.dir, ASSET_MANIFEST_REL), "utf8")).toBe(assetManifestBefore);
    expect(await readFile(join(p.dir, MANIFEST_REL), "utf8")).toBe(hostManifestBefore);
    expect(await readFile(join(p.dir, TOKENS_REL), "utf8")).toBe(tokensBefore);
  });

  it("token plan/apply de 008 siguen funcionando exactamente igual tras ejecutar el Viewer", async () => {
    const p = await host();
    await runBinary(["view", "--json"], p.dir);

    const file = await commandFile(p.dir, [{ kind: "update-value", path: "color.base.blue-500", value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1, hex: "#000000" } }]);
    const plan = await runBinary(["token", "plan", "--file", file], p.dir);
    expect(plan.code).toBe(0);
    expect(plan.stdout).toContain("Token plan: planned");

    const apply = await runBinary(["token", "apply", "--file", file], p.dir);
    expect(apply.code).toBe(0);
    expect(apply.stdout).toContain("Token apply: applied");

    const again = await runBinary(["token", "apply", "--file", file], p.dir);
    expect(again.code).toBe(2);
  });

  it("Asset Manager sigue funcionando igual tras ejecutar el Viewer", async () => {
    const p = await host();
    await runBinary(["view", "--json"], p.dir);
    await mkdir(p.dir, { recursive: true });
    await writeFile(join(p.dir, "hero.png"), png(4, 4, 1));
    const apply = await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], p.dir);
    expect(apply.code).toBe(0);
    const list = await runBinary(["asset", "list", "--json"], p.dir);
    expect(list.code).toBe(0);
    expect(JSON.parse(list.stdout)).toMatchObject({ formatVersion: "1.0.0" });
  });

  it("build/export siguen siendo byte-estables tras ejecutar el Viewer varias veces", async () => {
    const p = await host();
    await runBinary(["view", "--json"], p.dir);
    await runBinary(["view", "--json"], p.dir);
    const build1 = await runBinary(["build"], p.dir);
    expect(build1.code).toBe(0);
    const css1 = await readFile(join(p.dir, "design-system", "build", "tokens.css"));
    await runBinary(["view", "--json"], p.dir);
    const build2 = await runBinary(["build"], p.dir);
    expect(build2.code).toBe(2); // unchanged
    const css2 = await readFile(join(p.dir, "design-system", "build", "tokens.css"));
    expect(css2).toEqual(css1);
  }, 20000);

  it("validate/inspect/foundations/presets conservan outcome/exit tras ejecutar el Viewer", async () => {
    const p = await host();
    await runBinary(["view", "--json"], p.dir);
    expect((await runBinary(["validate"], p.dir)).code).toBe(0);
    expect((await runBinary(["inspect"], p.dir)).code).toBe(0);
    expect((await runBinary(["foundations"], p.dir)).code).toBe(4);
    expect((await runBinary(["presets", "list"], p.dir)).code).toBe(0);
  }, 20000);

  it("init sigue produciendo el mismo estado (unchanged) tras ejecutar el Viewer", async () => {
    const p = await host();
    await runBinary(["view", "--json"], p.dir);
    expect((await runBinary(["init"], p.dir)).code).toBe(2);
  });

  it("003 JSON histórico (validate --json) sigue byte-estable tras ejecutar el Viewer", async () => {
    const p = await host();
    const before = await runBinary(["validate", "--json"], p.dir);
    await runBinary(["view", "--json"], p.dir);
    const after = await runBinary(["validate", "--json"], p.dir);
    expect(after.stdout).toBe(before.stdout);
  });
});
