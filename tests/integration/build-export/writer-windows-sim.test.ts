// T128 (006) — Writer transaccional con fallos simulados vía seam (Windows/antivirus/handle abierto):
// fallo de rename y de escritura por permisos. Reproduce condiciones imposibles de forzar en POSIX real.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifactSetWriter } from "../../../src/infrastructure/build-export/artifact-set-writer.js";
import { BUILD_OUTPUT_ROOT } from "../../../src/domain/build-export/build-manifest.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../../helpers/tmp-project.js";
import { failingFs, makeRequest } from "../../helpers/writer-fakes.js";

let project: TmpProject;
const buildRel = BUILD_OUTPUT_ROOT;

beforeEach(async () => {
  project = await createTmpProject();
});
afterEach(async () => {
  await project.cleanup();
});

describe("artifact-set-writer — Windows/handle simulado (T128)", () => {
  it("fallo de escritura del candidato (permiso) → write-error antes de mover, output disponible", async () => {
    await writeFileIn(project.dir, `${buildRel}/manifest.json`, "{}");
    const fs = failingFs(undefined, { writeFile: (p) => (p.endsWith("tokens.css") ? new Error("EACCES") : undefined) });
    const writer = createArtifactSetWriter(project.dir, fs);
    const r = await writer.write(makeRequest());
    expect(r.outcome).toBe("write-error");
    expect(r.wrote).toBe(false);
    expect(r.outputAvailable).toBe(true);
    expect(r.backupRelativePath).toBeNull();
    expect(r.recoveryRequired).toBe(false);
    // staging limpiado.
    const parent = join(project.dir, "design-system");
    expect((await readdir(parent)).sort()).not.toContain("build.staging");
  });

  it("primer rename (build→backup) bloqueado por handle abierto → write-error, build intacto", async () => {
    await writeFileIn(project.dir, `${buildRel}/manifest.json`, "{}");
    await writeFileIn(project.dir, `${buildRel}/notes.txt`, "live");
    const fs = failingFs(undefined, { rename: (_from, _to, n) => (n === 1 ? new Error("EPERM") : undefined) });
    const writer = createArtifactSetWriter(project.dir, fs);
    const r = await writer.write(makeRequest());
    expect(r.outcome).toBe("write-error");
    expect(r.outputAvailable).toBe(true);
    expect(r.recoveryRequired).toBe(false);
    expect(fs.hooks.calls.rename).toBe(1); // se detuvo en el primer rename
  });

  it("segundo rename (staging→build) bloqueado, restore exitoso → write-error recuperable", async () => {
    await writeFileIn(project.dir, `${buildRel}/manifest.json`, "{}");
    const fs = failingFs(undefined, { rename: (_from, _to, n) => (n === 2 ? new Error("EPERM") : undefined) });
    const writer = createArtifactSetWriter(project.dir, fs);
    const r = await writer.write(makeRequest());
    expect(r.outcome).toBe("write-error");
    expect(r.wrote).toBe(false);
    expect(r.outputAvailable).toBe(true);
    expect(r.backupRelativePath).toBeNull(); // restore devolvió el backup a build
    expect(fs.hooks.calls.rename).toBe(3); // backup→build, staging→build(fail), backup→build(restore)
  });

  it("no expone rutas absolutas ni `Error` en el resultado público", async () => {
    const fs = failingFs(undefined, { writeFile: (p) => (p.endsWith("manifest.json") ? new Error("/abs/secret EACCES") : undefined) });
    const writer = createArtifactSetWriter(project.dir, fs);
    const r = await writer.write(makeRequest());
    expect(r.error?.message ?? "").not.toContain("/abs/secret");
    expect(r.error?.message ?? "").not.toMatch(/Error:/);
  });
});
