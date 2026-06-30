// T130 (006) — Tras el commit point (segundo rename exitoso) NO hay rollback destructivo automático:
// aunque la verificación posterior falle, el build publicado permanece y el backup se retiene.
import { readFile, readdir } from "node:fs/promises";
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

describe("artifact-set-writer — sin rollback automático tras commit point (T130)", () => {
  it("verificación post-commit fallida deja los artifacts nuevos publicados (no se restaura el viejo)", async () => {
    await writeFileIn(project.dir, `${buildRel}/manifest.json`, "{}");
    await writeFileIn(project.dir, `${buildRel}/tokens.css`, "OLD-CONTENT");

    const buildAbs = join(project.dir, buildRel);
    const corruptTarget = join(buildAbs, "tokens.css");
    // La verificación posterior lee bytes corruptos, pero el contenido real en disco es el nuevo.
    const fs = failingFs(undefined, {
      readFile: (p) => (p === corruptTarget ? new TextEncoder().encode("X") : undefined),
    });
    const r = await createArtifactSetWriter(project.dir, fs).write(makeRequest());

    expect(r.outcome).toBe("verification-error");
    expect(r.wrote).toBe(true);
    // El build en disco contiene los bytes NUEVOS (no se revirtió al viejo).
    expect(await readFile(join(buildAbs, "tokens.css"), "utf8")).toBe("/* css */");
    // El backup del viejo se retiene para recuperación manual.
    expect((await readdir(join(project.dir, "design-system"))).sort()).toContain("build.backup");
  });

  it("publicación exitosa no retiene backup (limpieza normal, sin recovery)", async () => {
    await writeFileIn(project.dir, `${buildRel}/manifest.json`, "{}");
    const r = await createArtifactSetWriter(project.dir).write(makeRequest());
    expect(r.outcome).toBe("published");
    expect(r.recoveryRequired).toBe(false);
    expect((await readdir(join(project.dir, "design-system"))).sort()).not.toContain("build.backup");
  });
});
