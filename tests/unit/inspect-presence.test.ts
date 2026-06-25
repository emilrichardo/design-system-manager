import { readdirSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { inspectPresence } from "../../src/infrastructure/host-root/inspect-presence.js";
import { EXPECTED_FILES, MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import {
  createTmpProject,
  ensureDir,
  symlinkIn,
  symlinksSupported,
  writeFileIn,
  type TmpProject,
} from "../helpers/tmp-project.js";

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

describe("inspectPresence (T021)", () => {
  it("ninguno presente → none", async () => {
    const base = await tmp();
    const r = inspectPresence(base);
    expect(r.present).toEqual([]);
    expect(r.missing).toEqual(EXPECTED_FILES);
    expect(r.nonePresent).toBe(true);
    expect(r.allPresent).toBe(false);
    expect(r.preliminary).toBe("none");
  });

  it("uno presente → potentially-partial", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.config, "{}");
    const r = inspectPresence(base);
    expect(r.present).toEqual([MANAGED_FILES.config]);
    expect(r.missing).toHaveLength(2);
    expect(r.preliminary).toBe("potentially-partial");
  });

  it("dos presentes → potentially-partial", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.config, "{}");
    await writeFileIn(base, MANAGED_FILES.manifest, "{}");
    const r = inspectPresence(base);
    expect(r.present).toHaveLength(2);
    expect(r.missing).toEqual([MANAGED_FILES.tokens]);
    expect(r.preliminary).toBe("potentially-partial");
  });

  it("todos presentes → potentially-complete (sin afirmar validez)", async () => {
    const base = await tmp();
    for (const rel of EXPECTED_FILES) await writeFileIn(base, rel, "{}");
    const r = inspectPresence(base);
    expect(r.allPresent).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.preliminary).toBe("potentially-complete");
  });

  it("preserva orden determinista = EXPECTED_FILES", async () => {
    const base = await tmp();
    for (const rel of EXPECTED_FILES) await writeFileIn(base, rel, "{}");
    const r = inspectPresence(base);
    expect(r.details.map((d) => d.path)).toEqual(EXPECTED_FILES);
  });

  it("detecta un directorio ocupando una ruta esperada", async () => {
    const base = await tmp();
    await ensureDir(base, MANAGED_FILES.config);
    const r = inspectPresence(base);
    const detail = r.details.find((d) => d.path === MANAGED_FILES.config);
    expect(detail?.kind).toBe("directory");
    expect(detail?.present).toBe(true);
  });

  it.skipIf(!HAS_SYMLINK)("detecta un symlink en una ruta esperada", async () => {
    const base = await tmp();
    const target = await writeFileIn(base, "real.json", "{}");
    await symlinkIn(base, MANAGED_FILES.config, target);
    const r = inspectPresence(base);
    const detail = r.details.find((d) => d.path === MANAGED_FILES.config);
    expect(detail?.kind).toBe("symlink");
  });

  it("no modifica el filesystem", async () => {
    const base = await tmp();
    const before = readdirSync(base);
    inspectPresence(base);
    expect(readdirSync(base)).toEqual(before);
  });
});
