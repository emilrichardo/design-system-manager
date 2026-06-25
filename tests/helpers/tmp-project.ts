// Helper de pruebas: crea un proyecto npm temporal y aislado (T006).
// Reutilizable por las pruebas de integración de fases posteriores.
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export interface TmpProject {
  /** Ruta absoluta a la raíz del proyecto temporal. */
  dir: string;
  /** Elimina el directorio temporal por completo. */
  cleanup: () => Promise<void>;
}

export interface TmpProjectOptions {
  /** Contenido de package.json. `false` para no crearlo. Por defecto `{}` mínimo. */
  packageJson?: Record<string, unknown> | false;
  /** Crear un marcador `.git/` para simular una raíz Git. Por defecto `false`. */
  withGit?: boolean;
}

/** Crea un directorio temporal aislado con un package.json mínimo (salvo que se desactive). */
export async function createTmpProject(options: TmpProjectOptions = {}): Promise<TmpProject> {
  const { packageJson = {}, withGit = false } = options;
  const dir = await mkdtemp(join(tmpdir(), "neuraz-ds-test-"));

  if (packageJson !== false) {
    await writeFile(join(dir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  }
  if (withGit) {
    await mkdir(join(dir, ".git"), { recursive: true });
  }

  return {
    dir,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/** Crea un directorio (recursivo) relativo a `base`. Devuelve la ruta absoluta. */
export async function ensureDir(base: string, rel: string): Promise<string> {
  const full = join(base, rel);
  await mkdir(full, { recursive: true });
  return full;
}

/** Escribe un archivo (creando directorios padre) relativo a `base`. Devuelve la ruta absoluta. */
export async function writeFileIn(base: string, rel: string, content = ""): Promise<string> {
  const full = join(base, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content, "utf8");
  return full;
}

/** Crea un enlace simbólico relativo a `base` apuntando a `target` (absoluto o relativo). */
export async function symlinkIn(base: string, rel: string, target: string): Promise<string> {
  const full = join(base, rel);
  await mkdir(dirname(full), { recursive: true });
  await symlink(target, full);
  return full;
}

/**
 * Detecta de forma portable si el entorno permite crear symlinks (en Windows puede requerir
 * privilegios). Las pruebas de symlink deben omitirse explícitamente si esto devuelve false.
 */
export function symlinksSupported(): boolean {
  let probeDir: string;
  try {
    probeDir = mkdtempSync(join(tmpdir(), "neuraz-symlink-probe-"));
  } catch {
    return false;
  }
  try {
    symlinkSync(probeDir, join(probeDir, "self-link"));
    return true;
  } catch {
    return false;
  } finally {
    rmSync(probeDir, { recursive: true, force: true });
  }
}
