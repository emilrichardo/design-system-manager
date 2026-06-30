// Helper de fixtures para pruebas de binario/packaging de 006: crea un host Design System inicializado
// (config + manifest + tokens) en un directorio temporal con nombre controlable (espacios/Unicode).
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { buildTokens } from "../../src/domain/builders/build-tokens.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";

export const VALID_MANIFEST = {
  manifestSchemaVersion: "0.1.0",
  name: "Acme",
  slug: "acme",
  version: "0.1.0",
  tokensDir: "tokens",
  description: "Acme DS",
} as const;

export interface HostProject {
  /** Directorio raíz del host (cwd para ejecutar el binario). */
  readonly dir: string;
  /** Elimina el árbol temporal completo. */
  readonly cleanup: () => Promise<void>;
}

async function writeDoc(root: string, rel: string, content: unknown): Promise<void> {
  const abs = join(root, rel);
  await mkdir(dirname(abs), { recursive: true });
  const text = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
  await writeFile(abs, text, "utf8");
}

/** Escribe un host válido (package.json + config + manifest + tokens) en `dir`. */
export async function writeHost(dir: string, options: { tokens?: unknown; packageJson?: Record<string, unknown> } = {}): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "package.json"), `${JSON.stringify(options.packageJson ?? { name: "host", version: "0.0.0" }, null, 2)}\n`, "utf8");
  await writeDoc(dir, MANAGED_FILES.config, buildConfig());
  await writeDoc(dir, MANAGED_FILES.manifest, VALID_MANIFEST);
  await writeDoc(dir, MANAGED_FILES.tokens, options.tokens ?? buildTokens());
}

/**
 * Crea un host en un subdirectorio con `dirName` (por defecto `host`) dentro de un tmp aislado.
 * Útil para nombres con espacios o Unicode.
 */
export async function makeHostProject(options: { dirName?: string; tokens?: unknown } = {}): Promise<HostProject> {
  const parent = await mkdtemp(join(tmpdir(), "neuraz-ds-host-"));
  const dir = join(parent, options.dirName ?? "host");
  await writeHost(dir, { tokens: options.tokens });
  return { dir, cleanup: () => rm(parent, { recursive: true, force: true }) };
}
