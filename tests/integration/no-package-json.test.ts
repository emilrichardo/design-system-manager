import { readdirSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { resolveHostRoot } from "../../src/infrastructure/host-root/resolve-host-root.js";
import { createTmpProject, ensureDir, type TmpProject } from "../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("ausencia de package.json (T020, integración)", () => {
  it("falla con error host y no escribe ningún archivo", async () => {
    const p = await createTmpProject({ packageJson: false });
    projects.push(p);
    const sub = await ensureDir(p.dir, "app/src");

    const before = readdirSync(p.dir);
    const r = resolveHostRoot(sub);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("package-json-missing");
    // No se creó nada nuevo en la raíz del directorio temporal.
    expect(readdirSync(p.dir).sort()).toEqual(before.sort());
  });
});
