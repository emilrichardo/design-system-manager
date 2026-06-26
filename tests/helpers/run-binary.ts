// Nivel C — Ejecuta el binario compilado (dist/cli/index.js) en un proceso hijo, sin TTY ni shell.
// Captura stdout/stderr y exit code. Construye dist una sola vez bajo demanda.
import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIST_CLI = fileURLToPath(new URL("../../dist/cli/index.js", import.meta.url));

let built = false;
export function ensureBuilt(): void {
  if (built && existsSync(DIST_CLI)) return;
  execFileSync("npm", ["run", "build"], { cwd: REPO_ROOT, stdio: "ignore" });
  built = true;
}

export interface BinaryResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Ejecuta `node dist/cli/index.js <args>` en `cwd`. No hereda stdin. Timeout duro. */
export function runBinary(args: string[], cwd: string, timeoutMs = 15000): Promise<BinaryResult> {
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
