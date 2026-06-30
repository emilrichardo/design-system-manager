// T048 (007) — Regresión: ninguna operación de assets modifica tokens/host/build, y los comandos de
// 001–006 conservan su comportamiento tras administrar assets. Assets y tokens están separados.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { png } from "./../assets/asset-store-fixtures.js";

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

describe("regression 007 — assets do not touch tokens/build (T048)", () => {
  it("asset apply no modifica los tokens ni el host manifest", async () => {
    const dir = await host();
    writeFileSync(join(dir, "hero.png"), png(10, 5, 2));
    const tokensBefore = readFileSync(join(dir, TOKENS_REL));
    const manifestBefore = readFileSync(join(dir, "design-system", "design-system.json"));

    const apply = await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);
    expect(apply.code).toBe(0);

    expect(readFileSync(join(dir, TOKENS_REL))).toEqual(tokensBefore);
    expect(readFileSync(join(dir, "design-system", "design-system.json"))).toEqual(manifestBefore);
  });

  it("tras administrar assets, build/validate/foundations siguen funcionando (001–006 estables)", async () => {
    const dir = await host();
    writeFileSync(join(dir, "hero.png"), png(8, 8, 1));
    await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);

    const build = await runBinary(["build"], dir);
    expect(build.code).toBe(0);
    expect(build.stdout).toContain("Build: built");

    const validate = await runBinary(["validate"], dir);
    expect(validate.code).toBe(0);

    const foundations = await runBinary(["foundations", "--json"], dir);
    expect(JSON.parse(foundations.stdout)).toMatchObject({ formatVersion: "1.0.0", command: "foundations" });

    // build no escribe en el asset store y assets no escribe en build/.
    const exportCss = await runBinary(["export", "css"], dir);
    expect(exportCss.code).toBe(0);
    expect(exportCss.stdout.startsWith(":root {")).toBe(true);
  });

  it("build no gestiona el asset store: asset list sigue intacto tras build", async () => {
    const dir = await host();
    writeFileSync(join(dir, "hero.png"), png(4, 4, 3));
    await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);
    await runBinary(["build"], dir);
    const list = await runBinary(["asset", "list", "--json"], dir);
    expect(JSON.parse(list.stdout).result.assets).toHaveLength(1);
  });
});
