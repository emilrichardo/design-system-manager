// T129 (006) — Estados de recuperación del writer: primer rename, segundo rename, restore exitoso,
// restore fallido (catastrófico), verificación post-commit fallida; cleanup, residual de staging/backup
// y rutas públicas relativas.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createArtifactSetWriter } from "../../../src/infrastructure/build-export/artifact-set-writer.js";
import { BUILD_OUTPUT_ROOT } from "../../../src/domain/build-export/build-manifest.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../../helpers/tmp-project.js";
import { failingFs, makeRequest } from "../../helpers/writer-fakes.js";

let project: TmpProject;
const buildRel = BUILD_OUTPUT_ROOT;

async function seedPriorBuild(): Promise<void> {
  await writeFileIn(project.dir, `${buildRel}/manifest.json`, "{}");
  await writeFileIn(project.dir, `${buildRel}/tokens.css`, "OLD");
}

beforeEach(async () => {
  project = await createTmpProject();
});
afterEach(async () => {
  await project.cleanup();
});

describe("artifact-set-writer — recovery states (T129)", () => {
  it("fallo antes de mover: output disponible, sin backup, sin recovery", async () => {
    await seedPriorBuild();
    const fs = failingFs(undefined, { writeFile: (p) => (p.endsWith("tokens.css") ? new Error("EACCES") : undefined) });
    const r = await createArtifactSetWriter(project.dir, fs).write(makeRequest());
    expect([r.outputAvailable, r.backupRelativePath, r.recoveryRequired]).toEqual([true, null, false]);
  });

  it("segundo rename falla, restore OK: output disponible, sin backup, sin recovery", async () => {
    await seedPriorBuild();
    const fs = failingFs(undefined, { rename: (_f, _t, n) => (n === 2 ? new Error("EPERM") : undefined) });
    const r = await createArtifactSetWriter(project.dir, fs).write(makeRequest());
    expect(r.outcome).toBe("write-error");
    expect([r.outputAvailable, r.backupRelativePath, r.recoveryRequired]).toEqual([true, null, false]);
  });

  it("segundo rename falla y restore falla: write-error, output NO disponible, backup retenido relativo, recovery requerido", async () => {
    await seedPriorBuild();
    const fs = failingFs(undefined, { rename: (_f, _t, n) => (n >= 2 ? new Error("EPERM") : undefined) });
    const r = await createArtifactSetWriter(project.dir, fs).write(makeRequest());
    expect(r.outcome).toBe("write-error");
    expect(r.wrote).toBe(false);
    expect(r.outputAvailable).toBe(false);
    expect(r.recoveryRequired).toBe(true);
    expect(r.backupRelativePath).toBe("design-system/build.backup");
    expect(r.backupRelativePath?.startsWith("/")).toBe(false); // relativo, no absoluto
  });

  it("verificación post-commit falla: verification-error, wrote true, output disponible, backup retenido, recovery requerido, sin rollback", async () => {
    await seedPriorBuild();
    // Corromper SOLO la lectura post-commit del build dir (la verificación del candidato en staging pasa).
    const corruptTarget = join(project.dir, buildRel, "tokens.css");
    const fs = failingFs(undefined, {
      readFile: (p) => (p === corruptTarget ? new TextEncoder().encode("CORRUPT") : undefined),
    });
    const r = await createArtifactSetWriter(project.dir, fs).write(makeRequest());
    expect(r.outcome).toBe("verification-error");
    expect(r.wrote).toBe(true);
    expect(r.outputAvailable).toBe(true);
    expect(r.recoveryRequired).toBe(true);
    expect(r.backupRelativePath).toBe("design-system/build.backup");
    expect(r.verification?.status).toBe("failed");
    // sin rollback: el backup sigue presente.
    const parent = join(project.dir, "design-system");
    expect((await readdir(parent)).sort()).toContain("build.backup");
  });
});
