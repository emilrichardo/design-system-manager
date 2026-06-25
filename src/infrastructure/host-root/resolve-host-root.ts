// T018 — Resolución de la raíz anfitriona (ADR-0002, FR-001c–001g).
// Algoritmo: realpath del cwd → ascenso al package.json más cercano (tope: raíz Git si existe)
// → su directorio es la raíz anfitriona y el límite autorizado de escritura.
import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import type { HostError, HostRoot, HostRootResolution } from "../../application/ports.js";
import { verifyPackageJson } from "./require-package-json.js";

function fail(code: HostError["code"], message: string, path: string): HostRootResolution {
  return { ok: false, error: { code, message, path } };
}

function isRegularFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Raíz Git más cercana (directorio que contiene `.git`), o null. Tope superior de búsqueda. */
function findGitRoot(start: string): string | null {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Directorio del package.json más cercano, sin superar la raíz Git (inclusive). */
function findNearestPackageJsonDir(start: string, gitRoot: string | null): string | null {
  let dir = start;
  for (;;) {
    if (isRegularFile(join(dir, "package.json"))) return dir;
    if (gitRoot !== null && dir === gitRoot) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** ¿Hay un package.json ancestro (estrictamente arriba) dentro del gitRoot? → monorepo. */
function hasAncestorPackageJson(pkgDir: string, gitRoot: string | null): boolean {
  if (pkgDir === gitRoot) return false;
  let dir = dirname(pkgDir);
  for (;;) {
    if (isRegularFile(join(dir, "package.json"))) return true;
    if (gitRoot !== null && dir === gitRoot) return false;
    const parent = dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

export function resolveHostRoot(executionDir: string): HostRootResolution {
  let execReal: string;
  try {
    execReal = realpathSync(executionDir);
  } catch {
    return fail("execution-dir-missing", `El directorio de ejecución no existe: ${executionDir}`, executionDir);
  }
  try {
    if (!statSync(execReal).isDirectory()) {
      return fail("not-a-directory", `El directorio de ejecución no es un directorio: ${executionDir}`, executionDir);
    }
  } catch {
    return fail("not-a-directory", `El directorio de ejecución no es un directorio: ${executionDir}`, executionDir);
  }

  const gitRootDir = findGitRoot(execReal);
  const pkgDir = findNearestPackageJsonDir(execReal, gitRootDir);
  if (pkgDir === null) {
    return fail("package-json-missing", "No se encontró package.json en el proyecto anfitrión.", execReal);
  }

  const packageJsonPath = join(pkgDir, "package.json");
  const verify = verifyPackageJson(packageJsonPath);
  if (!verify.ok) return { ok: false, error: verify.error };

  const hostRoot: HostRoot = {
    executionDir: execReal,
    rootDir: pkgDir,
    packageJsonPath,
    gitRootDir,
    writeBoundary: pkgDir,
    isMonorepoChild: hasAncestorPackageJson(pkgDir, gitRootDir),
  };
  return { ok: true, hostRoot };
}
