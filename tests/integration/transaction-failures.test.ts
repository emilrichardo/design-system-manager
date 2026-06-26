import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import type { FileSystem } from "../../src/application/ports.js";
import { nodeFileSystem } from "../../src/infrastructure/fs/node-file-system.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { faultyFs } from "../helpers/faulty-fs.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const staging = (dir: string) => readdirSync(dir).filter((n) => n.startsWith(".neuraz-ds-staging-"));

async function host(): Promise<TmpProject> {
  const p = await createTmpProject({ packageJson: { name: "host" } });
  projects.push(p);
  return p;
}

describe("T058 — errores de la transacción", () => {
  it("fallo al crear el staging → failed/filesystem (exit 6), sin escrituras", async () => {
    const p = await host();
    const { result, exitCode } = await runRealInit(p.dir, { fileSystem: faultyFs(nodeFileSystem, { op: "mkdtemp", afterCalls: 0 }) });
    expect(result.status === "failed" && result.category).toBe("filesystem");
    expect(exitCode).toBe(6);
    expect(existsSync(join(p.dir, "design-system"))).toBe(false);
    expect(staging(p.dir)).toEqual([]);
  });

  it("fallo al escribir en staging → failed/filesystem (exit 6), staging limpio", async () => {
    const p = await host();
    const { result, exitCode } = await runRealInit(p.dir, { fileSystem: faultyFs(nodeFileSystem, { op: "writeFileExclusive", afterCalls: 0 }) });
    expect(result.status === "failed" && result.category).toBe("filesystem");
    expect(exitCode).toBe(6);
    expect(existsSync(join(p.dir, MANAGED_FILES.config))).toBe(false);
    expect(staging(p.dir)).toEqual([]);
  });

  it("fallo tras el primer rename → failed/filesystem (exit 6), rollback, sin parciales", async () => {
    const p = await host();
    const { result, exitCode } = await runRealInit(p.dir, { fileSystem: faultyFs(nodeFileSystem, { op: "rename", afterCalls: 1 }) });
    expect(result.status === "failed" && result.category).toBe("filesystem");
    expect(exitCode).toBe(6);
    expect(existsSync(join(p.dir, MANAGED_FILES.config))).toBe(false);
    expect(existsSync(join(p.dir, "design-system"))).toBe(false);
    expect(staging(p.dir)).toEqual([]);
  });

  it("fallo tras el segundo rename → failed/filesystem (exit 6), preserva ajenos", async () => {
    const p = await host();
    await writeFileIn(p.dir, "design-system/keep.txt", "ajeno");
    const { result, exitCode } = await runRealInit(p.dir, { fileSystem: faultyFs(nodeFileSystem, { op: "rename", afterCalls: 2 }) });
    expect(result.status === "failed" && result.category).toBe("filesystem");
    expect(exitCode).toBe(6);
    expect(readFileSync(join(p.dir, "design-system/keep.txt"), "utf8")).toBe("ajeno");
    expect(existsSync(join(p.dir, MANAGED_FILES.manifest))).toBe(false);
  });

  it("fallo en la verificación posterior → failed/post-verify (exit 7), rollback", async () => {
    const p = await host();
    // La raíz se resuelve por realpath; comparar por sufijo evita el desfase /var↔/private/var.
    const isTokens = (path: string) => path.endsWith(MANAGED_FILES.tokens) && !path.includes(".neuraz-ds-staging-");
    let promoted = false;
    const tampering: FileSystem = {
      ...nodeFileSystem,
      rename: async (from, to) => {
        const out = await nodeFileSystem.rename(from, to);
        if (isTokens(to)) promoted = true;
        return out;
      },
      readFile: async (path) => (promoted && isTokens(path) ? "{}\n" : nodeFileSystem.readFile(path)),
    };
    const { result, exitCode } = await runRealInit(p.dir, { fileSystem: tampering });
    expect(result.status === "failed" && result.category).toBe("post-verify");
    expect(exitCode).toBe(7);
    expect(existsSync(join(p.dir, MANAGED_FILES.config))).toBe(false);
    expect(existsSync(join(p.dir, MANAGED_FILES.tokens))).toBe(false);
    expect(staging(p.dir)).toEqual([]);
  });
});
