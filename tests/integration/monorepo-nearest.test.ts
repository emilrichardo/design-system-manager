import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EXPECTED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, ensureDir, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T049 — monorepo: usa el workspace más cercano", () => {
  it("crea en repo/apps/web y no en la raíz global; package.json raíz intacto", async () => {
    const p = await createTmpProject({ packageJson: { name: "monorepo-root" } });
    projects.push(p);
    await ensureDir(p.dir, ".git");
    const rootPkgBefore = readFileSync(join(p.dir, "package.json"), "utf8");
    const wsPkg = await writeFileIn(p.dir, join("apps", "web", "package.json"), `${JSON.stringify({ name: "web" }, null, 2)}\n`);
    const wsPkgBefore = readFileSync(wsPkg, "utf8");
    const wsRoot = join(p.dir, "apps", "web");
    const sub = await ensureDir(p.dir, join("apps", "web", "src"));

    const { result, exitCode, reporter } = await runRealInit(sub);

    expect(result.status).toBe("created");
    expect(exitCode).toBe(0);
    expect(reporter.host?.rootDir).toBe(realpathSync(wsRoot));
    for (const rel of EXPECTED_FILES) expect(existsSync(join(wsRoot, rel))).toBe(true);
    // No se creó nada en la raíz global ni se tocó ningún package.json.
    expect(existsSync(join(p.dir, "design-system"))).toBe(false);
    expect(readFileSync(join(p.dir, "package.json"), "utf8")).toBe(rootPkgBefore);
    expect(readFileSync(wsPkg, "utf8")).toBe(wsPkgBefore);
  });

  it("un package.json por encima de la raíz Git NO se utiliza → failed/host (exit 5)", async () => {
    // outer/package.json  +  outer/repo/.git (sin package.json en repo)
    const outer = await createTmpProject({ packageJson: { name: "outer" } });
    projects.push(outer);
    const repo = await ensureDir(outer.dir, "repo");
    await ensureDir(outer.dir, join("repo", ".git"));

    const { result, exitCode, prompter } = await runRealInit(repo);

    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.category).toBe("host");
    expect(exitCode).toBe(5);
    expect(prompter.requestIdentityCalls).toBe(0);
    expect(existsSync(join(repo, "design-system"))).toBe(false);
  });
});
