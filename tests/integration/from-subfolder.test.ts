import { existsSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EXPECTED_FILES, MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, ensureDir, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T048 — ejecución desde subcarpeta", () => {
  it("resuelve la raíz del package.json más cercano y crea allí (no en la subcarpeta)", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);
    const sub = await ensureDir(p.dir, join("src", "features"));

    const { result, exitCode, reporter } = await runRealInit(sub);

    expect(result.status).toBe("created");
    expect(exitCode).toBe(0);
    expect(reporter.host?.rootDir).toBe(realpathSync(p.dir));
    for (const rel of EXPECTED_FILES) expect(existsSync(join(p.dir, rel))).toBe(true);
    // Nada creado dentro de la subcarpeta.
    expect(readdirSync(sub)).toEqual([]);
    expect(existsSync(join(sub, MANAGED_FILES.config))).toBe(false);
  });
});
