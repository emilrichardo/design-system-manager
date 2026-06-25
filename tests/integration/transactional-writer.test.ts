import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { commitTransaction } from "../../src/infrastructure/fs/transactional-writer.js";
import { nodeFileSystem } from "../../src/infrastructure/fs/node-file-system.js";
import { prepareFiles } from "../../src/infrastructure/serialization/prepare-files.js";
import { EXPECTED_FILES, MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, ensureDir, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { faultyFs } from "../helpers/faulty-fs.js";
import { validIdentity } from "../fixtures/documents.js";

const projects: TmpProject[] = [];
async function tmp(): Promise<string> {
  const p = await createTmpProject({ packageJson: false });
  projects.push(p);
  return p.dir;
}
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

const prepared = prepareFiles(validIdentity);
const stagingDirs = (base: string) => readdirSync(base).filter((n) => n.startsWith(".neuraz-ds-staging-"));

describe("commitTransaction (T033)", () => {
  it("transacción exitosa: crea la estructura exacta, contenido válido, sin staging", async () => {
    const base = await tmp();
    const r = await commitTransaction(nodeFileSystem, base, prepared);
    expect(r.status).toBe("committed");
    if (r.status === "committed") expect(r.files).toEqual(EXPECTED_FILES);
    for (const rel of EXPECTED_FILES) expect(existsSync(join(base, rel))).toBe(true);
    const tokens = JSON.parse(readFileSync(join(base, MANAGED_FILES.tokens), "utf8"));
    expect(tokens.color.base["blue-500"].$value.colorSpace).toBe("srgb");
    expect(stagingDirs(base)).toEqual([]);
  });

  it("conflicto previo: no escribe nada", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.config, "{}");
    const r = await commitTransaction(nodeFileSystem, base, prepared);
    expect(r.status).toBe("conflict");
    expect(existsSync(join(base, MANAGED_FILES.manifest))).toBe(false);
    expect(stagingDirs(base)).toEqual([]);
  });

  it("conflicto tardío (destino aparece antes del rename): preserva lo aparecido y revierte", async () => {
    const base = await tmp();
    // lstatKind se llama: detectConflicts (3) + por archivo en promote. Hacemos que la verificación
    // de conflicto tardío del 2º archivo lo vea presente creándolo tras el primer rename mediante
    // un fs que, en la llamada de lstat del manifiesto, devuelva "file".
    const real = nodeFileSystem;
    let renamed = 0;
    const fs = {
      ...real,
      rename: async (f: string, t: string) => {
        renamed++;
        return real.rename(f, t);
      },
      lstatKind: async (p: string) => {
        // tras el primer rename, simular que el manifiesto ya existe (aparición tardía)
        if (renamed >= 1 && p === join(base, MANAGED_FILES.manifest)) return "file" as const;
        return real.lstatKind(p);
      },
    };
    const r = await commitTransaction(fs, base, prepared);
    expect(r.status).toBe("conflict");
    if (r.status === "conflict") expect(r.conflicts).toContain(MANAGED_FILES.manifest);
    // el config promovido se revierte; no queda estado parcial ni staging
    expect(existsSync(join(base, MANAGED_FILES.config))).toBe(false);
    expect(stagingDirs(base)).toEqual([]);
  });

  it("fallo antes del primer rename: rollback total, sin estado parcial", async () => {
    const base = await tmp();
    const fs = faultyFs(nodeFileSystem, { op: "rename", afterCalls: 0 });
    const r = await commitTransaction(fs, base, prepared);
    expect(r.status).toBe("failed");
    if (r.status === "failed") expect(r.category).toBe("filesystem");
    for (const rel of EXPECTED_FILES) expect(existsSync(join(base, rel))).toBe(false);
    expect(existsSync(join(base, "design-system"))).toBe(false);
    expect(stagingDirs(base)).toEqual([]);
  });

  it("fallo tras el primer rename: revierte el archivo creado y los dirs creados", async () => {
    const base = await tmp();
    const fs = faultyFs(nodeFileSystem, { op: "rename", afterCalls: 1 });
    const r = await commitTransaction(fs, base, prepared);
    expect(r.status).toBe("failed");
    expect(existsSync(join(base, MANAGED_FILES.config))).toBe(false);
    expect(existsSync(join(base, "design-system"))).toBe(false);
    expect(stagingDirs(base)).toEqual([]);
  });

  it("fallo tras el segundo rename: revierte ambos archivos y dirs vacíos", async () => {
    const base = await tmp();
    const fs = faultyFs(nodeFileSystem, { op: "rename", afterCalls: 2 });
    const r = await commitTransaction(fs, base, prepared);
    expect(r.status).toBe("failed");
    expect(existsSync(join(base, MANAGED_FILES.config))).toBe(false);
    expect(existsSync(join(base, MANAGED_FILES.manifest))).toBe(false);
    expect(existsSync(join(base, "design-system"))).toBe(false);
  });

  it("preserva un directorio preexistente y su contenido ajeno durante el rollback", async () => {
    const base = await tmp();
    await writeFileIn(base, "design-system/keep.txt", "no tocar");
    const fs = faultyFs(nodeFileSystem, { op: "rename", afterCalls: 2 }); // falla en tokens
    const r = await commitTransaction(fs, base, prepared);
    expect(r.status).toBe("failed");
    expect(existsSync(join(base, "design-system"))).toBe(true);
    expect(readFileSync(join(base, "design-system/keep.txt"), "utf8")).toBe("no tocar");
    expect(existsSync(join(base, MANAGED_FILES.manifest))).toBe(false);
  });

  it("fallo en la creación del staging: error filesystem, sin escritura", async () => {
    const base = await tmp();
    const fs = faultyFs(nodeFileSystem, { op: "mkdtemp", afterCalls: 0 });
    const r = await commitTransaction(fs, base, prepared);
    expect(r.status).toBe("failed");
    if (r.status === "failed") expect(r.category).toBe("filesystem");
    expect(stagingDirs(base)).toEqual([]);
  });

  it("rollback deja un estado limpio: una segunda transacción tiene éxito", async () => {
    const base = await tmp();
    await commitTransaction(faultyFs(nodeFileSystem, { op: "rename", afterCalls: 1 }), base, prepared);
    const r = await commitTransaction(nodeFileSystem, base, prepared);
    expect(r.status).toBe("committed");
    expect(stagingDirs(base)).toEqual([]);
  });

  it("preexistente intacto: un archivo ajeno en la raíz se conserva tras éxito", async () => {
    const base = await tmp();
    await writeFileIn(base, "README.md", "ajeno");
    await commitTransaction(nodeFileSystem, base, prepared);
    expect(readFileSync(join(base, "README.md"), "utf8")).toBe("ajeno");
  });
});
