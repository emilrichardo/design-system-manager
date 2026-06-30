// T127 (006) — Writer transaccional sobre filesystem real (POSIX): renames sibling, ventana de dos
// renames en directorio no vacío (con unknown nodes copiados), cleanup de staging tras éxito.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifactSetWriter } from "../../../src/infrastructure/build-export/artifact-set-writer.js";
import { BUILD_OUTPUT_ROOT } from "../../../src/domain/build-export/build-manifest.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../../helpers/tmp-project.js";
import { makeRequest } from "../../helpers/writer-fakes.js";

let project: TmpProject;
const buildRel = BUILD_OUTPUT_ROOT;

beforeEach(async () => {
  project = await createTmpProject();
});
afterEach(async () => {
  await project.cleanup();
});

describe("artifact-set-writer — POSIX real (T127)", () => {
  it("publica el conjunto en un build dir ausente (single rename)", async () => {
    const writer = createArtifactSetWriter(project.dir);
    const r = await writer.write(makeRequest());
    expect(r.outcome).toBe("published");
    expect(r.wrote).toBe(true);
    expect(r.outputAvailable).toBe(true);
    expect(r.backupRelativePath).toBeNull();
    const buildDir = join(project.dir, buildRel);
    const names = (await readdir(buildDir)).sort();
    expect(names).toContain("tokens.css");
    expect(names).toContain("manifest.json");
  });

  it("ventana de dos renames sobre directorio no vacío: preserva unknown nodes byte-a-byte", async () => {
    // build/ previo con artifacts viejos + contenido desconocido.
    await writeFileIn(project.dir, `${buildRel}/tokens.css`, "OLD");
    await writeFileIn(project.dir, `${buildRel}/manifest.json`, "{}");
    await writeFileIn(project.dir, `${buildRel}/notes.txt`, "keep me");
    await writeFileIn(project.dir, `${buildRel}/extra/data.bin`, "nested");

    const writer = createArtifactSetWriter(project.dir);
    const r = await writer.write(makeRequest());
    expect(r.outcome).toBe("published");

    const buildDir = join(project.dir, buildRel);
    expect(await readFile(join(buildDir, "notes.txt"), "utf8")).toBe("keep me");
    expect(await readFile(join(buildDir, "extra", "data.bin"), "utf8")).toBe("nested");
    expect(await readFile(join(buildDir, "tokens.css"), "utf8")).toBe("/* css */");
  });

  it("limpia staging y backup tras una publicación exitosa", async () => {
    await writeFileIn(project.dir, `${buildRel}/manifest.json`, "{}");
    const writer = createArtifactSetWriter(project.dir);
    await writer.write(makeRequest());
    const parent = join(project.dir, "design-system");
    const siblings = (await readdir(parent)).sort();
    expect(siblings).not.toContain("build.staging");
    expect(siblings).not.toContain("build.backup");
    expect(siblings).toContain("build");
  });
});
