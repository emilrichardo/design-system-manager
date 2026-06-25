import { realpathSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertWithinRoot } from "../../src/infrastructure/host-root/path-guard.js";
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
  return realpathSync(p.dir);
}
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

const HAS_SYMLINK = symlinksSupported();

describe("assertWithinRoot (T019, FR-001h/FR-025)", () => {
  it("acepta una ruta directa interna existente", async () => {
    const root = await tmp();
    await writeFileIn(root, "neuraz-ds.config.json", "{}");
    const r = assertWithinRoot(root, "neuraz-ds.config.json");
    expect(r.ok).toBe(true);
  });

  it("acepta un subdirectorio interno (aún inexistente) con ancestro válido", async () => {
    const root = await tmp();
    const r = assertWithinRoot(root, "design-system/tokens/base.tokens.json");
    expect(r.ok).toBe(true);
  });

  it("rechaza escape mediante ..", async () => {
    const root = await ensureDir(await tmp(), "inner");
    const r = assertWithinRoot(root, "../../etc/passwd");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("escape");
  });

  it("rechaza una ruta absoluta externa", async () => {
    const root = await tmp();
    const other = await tmp();
    const r = assertWithinRoot(root, join(other, "x.json"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("escape");
  });

  it("rechaza prefijos engañosos (proyecto-otro no está dentro de proyecto)", async () => {
    const base = await tmp();
    const root = await ensureDir(base, "proyecto");
    await ensureDir(base, "proyecto-otro");
    const r = assertWithinRoot(root, join(base, "proyecto-otro", "f.json"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("escape");
  });

  it.skipIf(!HAS_SYMLINK)("acepta un symlink interno", async () => {
    const root = await tmp();
    const target = await ensureDir(root, "real");
    await symlinkIn(root, "link", target);
    const r = assertWithinRoot(root, "link/file.json");
    expect(r.ok).toBe(true);
  });

  it.skipIf(!HAS_SYMLINK)("rechaza un symlink externo", async () => {
    const root = await tmp();
    const outside = await tmp();
    await symlinkIn(root, "escape", outside);
    const r = assertWithinRoot(root, "escape/file.json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("external-symlink");
  });

  it.skipIf(!HAS_SYMLINK)("rechaza cuando un ancestro es un symlink externo", async () => {
    const root = await tmp();
    const outside = await tmp();
    await symlinkIn(root, "dir", outside);
    const r = assertWithinRoot(root, "dir/sub/file.json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("external-symlink");
  });

  it.skipIf(!HAS_SYMLINK)("rechaza un symlink roto", async () => {
    const root = await tmp();
    await symlinkIn(root, "broken", join(root, "no-existe-target"));
    const r = assertWithinRoot(root, "broken");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("broken-symlink");
  });
});
