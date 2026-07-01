// T046 (008) — Regresión: ninguna mutación de tokens modifica build/assets/host/asset-manifest, y
// init/validate/inspect/foundations/presets/build/export/asset conservan su comportamiento (bytes/JSON/
// exit) tras aplicar mutaciones de tokens.
import { readFile, writeFile } from "node:fs/promises";
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
async function host(): Promise<string> {
  const p = await makeHostProject();
  hosts.push(p);
  return p.dir;
}
async function commandFile(dir: string, operations: readonly unknown[]): Promise<string> {
  const path = join(dir, "mutation.json");
  await writeFile(path, `${JSON.stringify({ formatVersion: "1.0.0", operations }, null, 2)}\n`, "utf8");
  return path;
}

describe("regression 001–007 — token mutations do not touch build/assets/host (T046)", () => {
  it("apply no modifica design-system/build/**, design-system/assets/** ni el manifest del host", async () => {
    const dir = await host();
    await runBinary(["build"], dir);
    await writeFile(join(dir, "hero.png"), png(8, 8, 1));
    await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);

    const buildBefore = await readFile(join(dir, "design-system", "build", "manifest.json"), "utf8");
    const cssBefore = await readFile(join(dir, "design-system", "build", "tokens.css"), "utf8");
    const assetManifestBefore = await readFile(join(dir, ASSET_MANIFEST_REL), "utf8");
    const hostManifestBefore = await readFile(join(dir, MANIFEST_REL), "utf8");

    const file = await commandFile(dir, [{ kind: "update-value", path: "color.base.blue-500", value: { colorSpace: "srgb", components: [0.67, 0.8, 0.94], alpha: 1, hex: "#abcdef" } }]);
    const apply = await runBinary(["token", "apply", "--file", file], dir);
    expect(apply.code).toBe(0);

    expect(await readFile(join(dir, "design-system", "build", "manifest.json"), "utf8")).toBe(buildBefore);
    expect(await readFile(join(dir, "design-system", "build", "tokens.css"), "utf8")).toBe(cssBefore);
    expect(await readFile(join(dir, ASSET_MANIFEST_REL), "utf8")).toBe(assetManifestBefore);
    expect(await readFile(join(dir, MANIFEST_REL), "utf8")).toBe(hostManifestBefore);
  });

  it("validate/inspect/foundations conservan outcome/exit tras una mutación de tokens", async () => {
    const dir = await host();
    const value = { colorSpace: "srgb", components: [0, 0, 0], alpha: 1, hex: "#000000" };
    const file = await commandFile(dir, [{ kind: "update-value", path: "color.base.blue-500", value }]);
    await runBinary(["token", "apply", "--file", file], dir);

    const validate = await runBinary(["validate"], dir);
    expect(validate.code).toBe(0);

    const inspect = await runBinary(["inspect"], dir);
    expect(inspect.code).toBe(0);

    const foundations = await runBinary(["foundations"], dir);
    expect(foundations.code).toBe(4); // token inicial unclassified → partial/4 (sin cambios de 004)
  });

  it("presets list/inspect y build/export siguen funcionando tras mutaciones de tokens", async () => {
    const dir = await host();
    const file = await commandFile(dir, [{ kind: "create-token", path: "spacing.400", type: "dimension", value: { value: 16, unit: "px" } }]);
    await runBinary(["token", "apply", "--file", file], dir);

    const presetsList = await runBinary(["presets", "list", "--json"], dir);
    expect(presetsList.code).toBe(0);
    expect(JSON.parse(presetsList.stdout)).toMatchObject({ command: "preset-list" });

    const build = await runBinary(["build"], dir);
    expect(build.code).toBe(0);
    expect(build.stdout).toContain("Build: built");

    const exportCss = await runBinary(["export", "css"], dir);
    expect(exportCss.code).toBe(0);
    expect(exportCss.stdout).toContain("--spacing-400");
  });

  it("asset list/import siguen funcionando tras mutaciones de tokens (superficies separadas)", async () => {
    const dir = await host();
    const file = await commandFile(dir, [{ kind: "update-value", path: "color.base.blue-500", value: { colorSpace: "srgb", components: [0.67, 0.8, 0.94], alpha: 1, hex: "#abcdef" } }]);
    await runBinary(["token", "apply", "--file", file], dir);

    await writeFile(join(dir, "hero.png"), png(4, 4, 1));
    const importApply = await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], dir);
    expect(importApply.code).toBe(0);

    const list = await runBinary(["asset", "list"], dir);
    expect(list.code).toBe(0);
    expect(list.stdout).toContain("Assets: listed");
  });

  it("init sigue produciendo el mismo estado inicial (008 no altera 001)", async () => {
    const dir = await host();
    const secondInit = await runBinary(["init"], dir);
    expect(secondInit.code).toBe(2); // unchanged: ya inicializado
  });
});
