import { realpathSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveHostRoot } from "../../src/infrastructure/host-root/resolve-host-root.js";
import { createTmpProject, ensureDir, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";

const projects: TmpProject[] = [];
async function tmp(): Promise<string> {
  const p = await createTmpProject({ packageJson: false });
  projects.push(p);
  return p.dir;
}
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("resolveHostRoot (T018, ADR-0002)", () => {
  it("resuelve desde la raíz de un proyecto npm sin Git", async () => {
    const base = await tmp();
    await writeFileIn(base, "package.json", "{}");
    const r = resolveHostRoot(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.hostRoot.rootDir).toBe(realpathSync(base));
      expect(r.hostRoot.gitRootDir).toBeNull();
      expect(r.hostRoot.isMonorepoChild).toBe(false);
      expect(r.hostRoot.writeBoundary).toBe(r.hostRoot.rootDir);
    }
  });

  it("resuelve desde una subcarpeta hasta el package.json más cercano", async () => {
    const base = await tmp();
    await writeFileIn(base, "package.json", "{}");
    const sub = await ensureDir(base, "a/b/c");
    const r = resolveHostRoot(sub);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.hostRoot.rootDir).toBe(realpathSync(base));
  });

  it("detecta la raíz Git como contexto sin alterar la raíz anfitriona", async () => {
    const base = await tmp();
    await ensureDir(base, ".git");
    await writeFileIn(base, "package.json", "{}");
    const r = resolveHostRoot(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.hostRoot.gitRootDir).toBe(realpathSync(base));
  });

  it("en monorepo usa el package.json más cercano (no la raíz global) y marca isMonorepoChild", async () => {
    const base = await tmp();
    await ensureDir(base, ".git");
    await writeFileIn(base, "package.json", "{}");
    await writeFileIn(base, "apps/web/package.json", "{}");
    const src = await ensureDir(base, "apps/web/src");
    const r = resolveHostRoot(src);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.hostRoot.rootDir).toBe(realpathSync(join(base, "apps/web")));
      expect(r.hostRoot.isMonorepoChild).toBe(true);
      expect(r.hostRoot.gitRootDir).toBe(realpathSync(base));
    }
  });

  it("falla con package-json-missing cuando no hay package.json", async () => {
    const base = await tmp();
    const sub = await ensureDir(base, "x/y");
    const r = resolveHostRoot(sub);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("package-json-missing");
  });

  it("no asciende por encima de la raíz Git para encontrar package.json", async () => {
    const base = await tmp();
    // package.json por ENCIMA de la raíz Git: no debe seleccionarse.
    await writeFileIn(base, "package.json", "{}");
    await ensureDir(base, "repo/.git");
    const sub = await ensureDir(base, "repo/sub");
    const r = resolveHostRoot(sub);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("package-json-missing");
  });

  it("falla con execution-dir-missing si el directorio no existe", async () => {
    const base = await tmp();
    const r = resolveHostRoot(join(base, "no-existe"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("execution-dir-missing");
  });
});
