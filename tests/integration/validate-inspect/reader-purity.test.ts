// T025 — Pureza observacional: leer NO altera el proyecto (sin escrituras, staging ni archivos nuevos).
// No se afirma preservación de `atime` (puede cambiar por lectura según el filesystem).
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { nodeFileSystem } from "../../../src/infrastructure/fs/node-file-system.js";
import { createManagedDocumentReader } from "../../../src/infrastructure/analysis/managed-document-reader.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

interface Entry {
  readonly path: string;
  readonly size: number;
  readonly mtimeMs: number;
}

async function snapshot(root: string): Promise<Entry[]> {
  const out: Entry[] = [];
  async function walk(dir: string): Promise<void> {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        out.push({ path: `${relative(root, abs)}/`, size: -1, mtimeMs: -1 });
        await walk(abs);
      } else {
        const st = await stat(abs);
        out.push({ path: relative(root, abs), size: st.size, mtimeMs: st.mtimeMs });
      }
    }
  }
  await walk(root);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

describe("Pureza observacional del lector (T025)", () => {
  it("ningún cambio observable tras lecturas exitosas y fallidas", async () => {
    const p = await createTmpProject();
    projects.push(p);
    const root = p.dir;
    await writeFile(join(root, "neuraz-ds.config.json"), '{"configSchemaVersion":"1.0.0","designSystemDir":"design-system"}');
    await mkdir(join(root, "design-system", "tokens"), { recursive: true });
    await writeFile(join(root, "design-system", "design-system.json"), '{"name":"Acme"}');
    await writeFile(join(root, "design-system", "tokens", "base.tokens.json"), '{"color":{}}');

    const before = await snapshot(root);
    const reader = createManagedDocumentReader({ fileSystem: nodeFileSystem });

    // Lecturas variadas: éxito + varios fallos.
    await reader.read({ rootDir: root, document: "config", relativePath: "neuraz-ds.config.json", maxBytes: 5_000_000 });
    await reader.read({ rootDir: root, document: "manifest", relativePath: "design-system/design-system.json", maxBytes: 5_000_000 });
    await reader.read({ rootDir: root, document: "tokens", relativePath: "design-system/tokens/base.tokens.json", maxBytes: 2 }); // too-large
    await reader.read({ rootDir: root, document: "config", relativePath: "../evil.json", maxBytes: 10 }); // outside-root

    const after = await snapshot(root);
    expect(after).toEqual(before);
    // Sin staging ni archivos nuevos.
    expect(after.some((e) => e.path.includes(".neuraz-ds-staging-"))).toBe(false);
    expect(after).toHaveLength(before.length);
  });
});
