// T021 — nodeFileSystem.byteSize (bytes reales, sin leer contenido completo).
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { nodeFileSystem } from "../../../src/infrastructure/fs/node-file-system.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
async function tmp(): Promise<string> {
  const p = await createTmpProject();
  projects.push(p);
  return p.dir;
}

describe("nodeFileSystem.byteSize (T021)", () => {
  it("archivo vacío → 0", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "e.txt"), "");
    expect(await nodeFileSystem.byteSize(join(dir, "e.txt"))).toBe(0);
  });

  it("ASCII → nº de bytes = nº de chars", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "a.txt"), "hello");
    expect(await nodeFileSystem.byteSize(join(dir, "a.txt"))).toBe(5);
  });

  it("Unicode multibyte → bytes != caracteres", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "u.txt"), "€€"); // 2 chars, 6 bytes UTF-8
    expect(await nodeFileSystem.byteSize(join(dir, "u.txt"))).toBe(6);
  });

  it("ruta inexistente → lanza (estructurable)", async () => {
    const dir = await tmp();
    await expect(nodeFileSystem.byteSize(join(dir, "nope.txt"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
