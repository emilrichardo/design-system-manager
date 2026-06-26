import { chmodSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

const runningAsRoot = typeof process.getuid === "function" && process.getuid() === 0;
const SKIP = process.platform === "win32" || runningAsRoot;

describe("T056 — sin permisos de escritura", () => {
  it.skipIf(SKIP)("→ failed/filesystem (exit 6), sin parciales ni staging", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);
    chmodSync(p.dir, 0o555); // solo lectura/ejecución
    try {
      const { result, exitCode } = await runRealInit(p.dir);
      expect(result.status).toBe("failed");
      if (result.status === "failed") expect(result.category).toBe("filesystem");
      expect(exitCode).toBe(6);
      expect(existsSync(join(p.dir, "design-system"))).toBe(false);
      expect(readdirSync(p.dir).filter((n) => n.startsWith(".neuraz-ds-staging-"))).toEqual([]);
    } finally {
      chmodSync(p.dir, 0o755); // restaurar para poder limpiar
    }
  });
});
