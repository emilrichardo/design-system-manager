import { readdirSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { detectConflicts } from "../../src/infrastructure/fs/detect-conflicts.js";
import { nodeFileSystem } from "../../src/infrastructure/fs/node-file-system.js";
import { EXPECTED_FILES, MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, ensureDir, symlinkIn, symlinksSupported, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";

const projects: TmpProject[] = [];
async function tmp(): Promise<string> {
  const p = await createTmpProject({ packageJson: false });
  projects.push(p);
  return p.dir;
}
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const HAS_SYMLINK = symlinksSupported();

describe("detectConflicts (T032)", () => {
  it("ningún destino existente → sin conflictos", async () => {
    expect(await detectConflicts(nodeFileSystem, await tmp())).toEqual([]);
  });

  it("config existente → conflicto", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.config, "{}");
    expect(await detectConflicts(nodeFileSystem, base)).toEqual([MANAGED_FILES.config]);
  });

  it("manifiesto y tokens existentes → conflictos en orden determinista", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.tokens, "{}");
    await writeFileIn(base, MANAGED_FILES.manifest, "{}");
    expect(await detectConflicts(nodeFileSystem, base)).toEqual([MANAGED_FILES.manifest, MANAGED_FILES.tokens]);
  });

  it("directorio ocupando una ruta de archivo → conflicto", async () => {
    const base = await tmp();
    await ensureDir(base, MANAGED_FILES.config);
    expect(await detectConflicts(nodeFileSystem, base)).toContain(MANAGED_FILES.config);
  });

  it.skipIf(!HAS_SYMLINK)("symlink en una ruta final → conflicto", async () => {
    const base = await tmp();
    const target = await writeFileIn(base, "real.json", "{}");
    await symlinkIn(base, MANAGED_FILES.config, target);
    expect(await detectConflicts(nodeFileSystem, base)).toContain(MANAGED_FILES.config);
  });

  it("no modifica el filesystem", async () => {
    const base = await tmp();
    const before = readdirSync(base);
    await detectConflicts(nodeFileSystem, base);
    expect(readdirSync(base)).toEqual(before);
    expect(EXPECTED_FILES.length).toBe(3);
  });
});
