// Nivel C — Ejecuta el binario compilado (dist/cli/index.js) en un proceso hijo, sin TTY ni shell.
// Captura stdout/stderr y exit code. Construye dist una sola vez bajo demanda.
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIST_CLI = fileURLToPath(new URL("../../dist/cli/index.js", import.meta.url));
const BUILD_LOCK = join(tmpdir(), "neuraz-ds-manager-build.lock");

let built = false;

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function newestSourceMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestSourceMtime(abs));
    } else {
      newest = Math.max(newest, statSync(abs).mtimeMs);
    }
  }
  return newest;
}

function distLooksCurrent(): boolean {
  if (!existsSync(DIST_CLI)) return false;
  return statSync(DIST_CLI).mtimeMs >= newestSourceMtime(join(REPO_ROOT, "src"));
}

function acquireBuildLock(): () => void {
  const started = Date.now();
  for (;;) {
    try {
      mkdirSync(BUILD_LOCK);
      return () => rmSync(BUILD_LOCK, { recursive: true, force: true });
    } catch {
      if (Date.now() - started > 180000) {
        rmSync(BUILD_LOCK, { recursive: true, force: true });
        continue;
      }
      sleep(100);
    }
  }
}

export function ensureBuilt(): void {
  if ((built || distLooksCurrent()) && existsSync(DIST_CLI)) {
    built = true;
    return;
  }
  const release = acquireBuildLock();
  try {
    if (!distLooksCurrent()) {
      execFileSync("npm", ["run", "build"], { cwd: REPO_ROOT, stdio: "ignore" });
    }
    built = true;
  } finally {
    release();
  }
}

export interface BinaryResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Ejecuta `node dist/cli/index.js <args>` en `cwd`. No hereda stdin. Timeout duro. */
export function runBinary(args: string[], cwd: string, timeoutMs = 15000): Promise<BinaryResult> {
  ensureBuilt();
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [DIST_CLI, ...args],
      { cwd, timeout: timeoutMs },
      (err, stdout, stderr) => {
        const code =
          err && typeof (err as { code?: unknown }).code === "number"
            ? ((err as { code: number }).code)
            : err
              ? 1
              : 0;
        resolve({ code, stdout, stderr });
      },
    );
    child.stdin?.end();
  });
}
