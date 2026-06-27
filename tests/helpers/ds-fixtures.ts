// Helpers de fixtures reales para integración de 002. Crean proyectos temporales del sistema
// (fuera del repo), con contenido controlable. Limpieza vía el array `projects` del test.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { buildTokens } from "../../src/domain/builders/build-tokens.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, type TmpProject } from "./tmp-project.js";

export const VALID_MANIFEST = {
  manifestSchemaVersion: "0.1.0",
  name: "Acme",
  slug: "acme",
  version: "0.1.0",
  tokensDir: "tokens",
  description: "Acme DS",
} as const;

/** Contenido por documento: objeto JSON, cadena cruda (p. ej. JSON roto / bytes), o `false` (omitir). */
export type DocContent = unknown | string | false;

export interface ProjectSpec {
  readonly config?: DocContent;
  readonly manifest?: DocContent;
  readonly tokens?: DocContent;
  readonly packageJson?: Record<string, unknown> | false;
}

async function writeDoc(root: string, rel: string, content: DocContent): Promise<void> {
  if (content === false) return;
  const abs = join(root, rel);
  await mkdir(dirname(abs), { recursive: true });
  const text = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
  await writeFile(abs, text);
}

/**
 * Crea un proyecto temporal con los documentos indicados. Por defecto produce un DS válido completo.
 * Registra el TmpProject en `bag` para limpieza posterior (afterEach).
 */
export async function makeProject(bag: TmpProject[], spec: ProjectSpec = {}): Promise<string> {
  const p = await createTmpProject(spec.packageJson === undefined ? {} : { packageJson: spec.packageJson });
  bag.push(p);
  await writeDoc(p.dir, MANAGED_FILES.config, spec.config ?? buildConfig());
  await writeDoc(p.dir, MANAGED_FILES.manifest, spec.manifest ?? VALID_MANIFEST);
  await writeDoc(p.dir, MANAGED_FILES.tokens, spec.tokens ?? buildTokens());
  return p.dir;
}

/** DS válido canónico (los tres documentos, generación de `init`). */
export async function validProject(bag: TmpProject[]): Promise<string> {
  return makeProject(bag);
}

/** Proyecto vacío (solo package.json) → not-initialized. */
export async function emptyProject(bag: TmpProject[]): Promise<string> {
  return makeProject(bag, { config: false, manifest: false, tokens: false });
}

export const COLOR = { colorSpace: "srgb", components: [0.2, 0.5, 0.9], alpha: 1, hex: "#3b82f6" } as const;
