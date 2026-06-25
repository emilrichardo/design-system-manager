// Helper de pruebas: crea un proyecto npm temporal y aislado (T006).
// Reutilizable por las pruebas de integración de fases posteriores.
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
