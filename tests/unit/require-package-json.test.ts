import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyPackageJson } from "../../src/infrastructure/host-root/require-package-json.js";
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

describe("verifyPackageJson (T020, ADR-0001)", () => {
  it("acepta un package.json presente, regular y con JSON válido", async () => {
    const base = await tmp();
    const path = await writeFileIn(base, "package.json", '{"name":"host"}');
    expect(verifyPackageJson(path).ok).toBe(true);
  });

  it("rechaza ausencia con package-json-missing", async () => {
    const base = await tmp();
    const r = verifyPackageJson(join(base, "package.json"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("package-json-missing");
  });

  it("rechaza un directorio llamado package.json con unexpected-file-type", async () => {
    const base = await tmp();
    await ensureDir(base, "package.json");
    const r = verifyPackageJson(join(base, "package.json"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("unexpected-file-type");
  });

  it("rechaza JSON inválido con package-json-invalid", async () => {
    const base = await tmp();
    const path = await writeFileIn(base, "package.json", "{ not json ");
    const r = verifyPackageJson(path);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("package-json-invalid");
  });
});
