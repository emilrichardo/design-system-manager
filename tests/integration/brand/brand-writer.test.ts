import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyBrandMutation } from "../../../src/application/brand/apply-brand-mutation.js";
import { BRAND_ROOT, emptyBrandVisualLanguage, emptyBrandVoice } from "../../../src/domain/brand/index.js";
import { readBrandSource } from "../../../src/infrastructure/brand/brand-source-reader.js";
import { createBrandWriter } from "../../../src/infrastructure/brand/brand-writer.js";
import type { WriterFileSystem } from "../../../src/infrastructure/build-export/artifact-set-writer.js";
import { sha256Hex } from "../../../src/infrastructure/build-export/hash.js";
import { failingFs } from "../../helpers/writer-fakes.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function seedBrandProject(): Promise<TmpProject> {
  const project = await createTmpProject();
  projects.push(project);
  await writeFileIn(project.dir, `${BRAND_ROOT}/brand.json`, JSON.stringify({ formatVersion: "1.0.0", name: null, shortName: null, description: null, purpose: null, mission: null, vision: null, values: [], positioning: null, audiences: [], personality: null, principles: [], promise: null, differentiators: [], status: "placeholder" }, null, 2) + "\n");
  await writeFileIn(project.dir, `${BRAND_ROOT}/voice-and-tone.json`, JSON.stringify(emptyBrandVoice(), null, 2) + "\n");
  await writeFileIn(project.dir, `${BRAND_ROOT}/visual-language.json`, JSON.stringify(emptyBrandVisualLanguage(), null, 2) + "\n");
  await writeFileIn(project.dir, `${BRAND_ROOT}/usage-guidelines.json`, "[]\n");
  return project;
}

function deps(fs?: WriterFileSystem) {
  return {
    hashBytes: sha256Hex,
    readSource: { read: readBrandSource },
    createWriter: (rootDir: string) => createBrandWriter(rootDir, fs),
  };
}

describe("brand writer / applyBrandMutation (T017-T018)", () => {
  it("apply real escribe los cuatro documentos y una segunda ejecución resulta unchanged", async () => {
    const project = await seedBrandProject();

    const first = await applyBrandMutation(
      { executionDir: project.dir },
      { brandProfile: { formatVersion: "1.0.0", name: "Acme", shortName: "Acme", description: null, purpose: null, mission: null, vision: null, values: [], positioning: null, audiences: [], personality: null, principles: [], promise: null, differentiators: [], status: "partial" } },
      deps(),
    );
    const second = await applyBrandMutation(
      { executionDir: project.dir },
      { brandProfile: { formatVersion: "1.0.0", name: "Acme", shortName: "Acme", description: null, purpose: null, mission: null, vision: null, values: [], positioning: null, audiences: [], personality: null, principles: [], promise: null, differentiators: [], status: "partial" } },
      deps(),
    );

    expect(first.outcome).toBe("applied");
    expect(second.outcome).toBe("unchanged");
    const profile = JSON.parse(await readFile(join(project.dir, BRAND_ROOT, "brand.json"), "utf8")) as { name: string };
    expect(profile.name).toBe("Acme");
  });

  it("cambio concurrente detectado antes de escribir: conflict", async () => {
    const project = await seedBrandProject();
    const fs = failingFs(undefined, {
      readFile: (path) => (path.endsWith("/design-system/brand/brand.json") ? new TextEncoder().encode('{"changed":true}\n') : undefined),
    });

    const result = await applyBrandMutation(
      { executionDir: project.dir },
      { brandProfile: { formatVersion: "1.0.0", name: "Acme", shortName: null, description: null, purpose: null, mission: null, vision: null, values: [], positioning: null, audiences: [], personality: null, principles: [], promise: null, differentiators: [], status: "partial" } },
      deps(fs),
    );

    expect(result.outcome).toBe("conflict");
    expect(result.wrote).toBe(false);
  });

  it("verificación posterior fallida devuelve verification-error", async () => {
    const project = await seedBrandProject();
    let readsOfTarget = 0;
    const fs = failingFs(undefined, {
      readFile: (path) => (path.includes("design-system/brand/brand.json") && ++readsOfTarget >= 2 ? new TextEncoder().encode("CORRUPT") : undefined),
    });

    const result = await applyBrandMutation(
      { executionDir: project.dir },
      { brandProfile: { formatVersion: "1.0.0", name: "Acme", shortName: null, description: null, purpose: null, mission: null, vision: null, values: [], positioning: null, audiences: [], personality: null, principles: [], promise: null, differentiators: [], status: "partial" } },
      deps(fs),
    );

    expect(result.outcome).toBe("verification-error");
    expect(result.wrote).toBe(false);
  });
});
