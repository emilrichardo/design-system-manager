import { stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTmpProject } from "../helpers/tmp-project.js";

// T006: el helper crea un proyecto npm temporal aislado y lo limpia.
describe("createTmpProject", () => {
  it("crea un directorio con package.json y luego lo elimina", async () => {
    const project = await createTmpProject({ packageJson: { name: "host-fixture" } });
    const dirStat = await stat(project.dir);
    expect(dirStat.isDirectory()).toBe(true);

    const pkg = JSON.parse(await readFile(join(project.dir, "package.json"), "utf8"));
    expect(pkg.name).toBe("host-fixture");

    await project.cleanup();
    expect(existsSync(project.dir)).toBe(false);
  });

  it("puede omitir package.json y crear un marcador .git", async () => {
    const project = await createTmpProject({ packageJson: false, withGit: true });
    expect(existsSync(join(project.dir, "package.json"))).toBe(false);
    expect(existsSync(join(project.dir, ".git"))).toBe(true);
    await project.cleanup();
  });
});
