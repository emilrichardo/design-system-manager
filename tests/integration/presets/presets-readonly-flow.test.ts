// T058 (005) — list/inspect/plan son deterministas y READ-ONLY contra un host real: el archivo de
// tokens queda byte-idéntico (mismo contenido y mtime) tras repetir el flujo; no se crean temporales.
import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";
import { createBundledPresetCatalog, analyzePresetTokens } from "../../../src/infrastructure/index.js";
import { createBoundAnalyze } from "../../../src/cli/composition.js";
import { listPresets } from "../../../src/application/presets/list-presets.js";
import { inspectPreset } from "../../../src/application/presets/inspect-preset.js";
import { planPresetApplication } from "../../../src/application/presets/plan-preset-application.js";
import type { PresetId } from "../../../src/domain/presets/preset-id.js";

const TOKENS_REL = "design-system/tokens/base.tokens.json";
const projects: TmpProject[] = [];
afterAll(async () => {
  await Promise.all(projects.map((p) => p.cleanup()));
});

async function makeHost(): Promise<string> {
  const project = await createTmpProject();
  projects.push(project);
  await mkdir(join(project.dir, "design-system", "tokens"), { recursive: true });
  await writeFile(join(project.dir, TOKENS_REL), "{}\n", "utf8");
  return project.dir;
}

describe("presets read-only flow (T058)", () => {
  it("runs list -> inspect -> plan against a real host without modifying the token file", async () => {
    const dir = await makeHost();
    const tokensPath = join(dir, TOKENS_REL);
    const deps = { catalog: createBundledPresetCatalog(), analyzeTokens: analyzePresetTokens, analyzeHost: createBoundAnalyze() };

    const beforeBytes = await readFile(tokensPath);
    const beforeMtime = (await stat(tokensPath)).mtimeMs;
    const beforeEntries = await readdir(join(dir, "design-system", "tokens"));

    const list1 = await listPresets({ catalog: deps.catalog });
    const inspect1 = await inspectPreset({ id: "neutral-base" as PresetId }, { catalog: deps.catalog, analyzeTokens: deps.analyzeTokens });
    const plan1 = await planPresetApplication({ id: "neutral-base" as PresetId, executionDir: dir }, deps);

    expect(list1.outcome).toBe("success");
    expect(inspect1.outcome).toBe("success");
    expect(plan1.outcome).toBe("success");
    if (plan1.outcome === "success") {
      expect(plan1.plan.targetFile).toBe(TOKENS_REL);
      expect(plan1.plan.plan.summary.create).toBeGreaterThan(0);
    }

    // Read-only: el archivo de tokens no cambió (bytes + mtime) y no aparecieron archivos nuevos.
    expect(await readFile(tokensPath)).toEqual(beforeBytes);
    expect((await stat(tokensPath)).mtimeMs).toBe(beforeMtime);
    expect(await readdir(join(dir, "design-system", "tokens"))).toEqual(beforeEntries);
  });

  it("is deterministic across repeated runs", async () => {
    const dir = await makeHost();
    const deps = { catalog: createBundledPresetCatalog(), analyzeTokens: analyzePresetTokens, analyzeHost: createBoundAnalyze() };

    const a = await planPresetApplication({ id: "neutral-base" as PresetId, executionDir: dir }, deps);
    const b = await planPresetApplication({ id: "neutral-base" as PresetId, executionDir: dir }, deps);
    expect(a).toEqual(b);

    const l1 = await listPresets({ catalog: deps.catalog });
    const l2 = await listPresets({ catalog: deps.catalog });
    expect(l1).toEqual(l2);
  });
});
