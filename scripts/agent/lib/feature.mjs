// Resolución segura del directorio de una feature Speckit y su tasks.md.
// Rechaza traversal, separadores de ruta, nombres vacíos y symlinks que escapan de specs/.
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { REPO_ROOT, AgentError } from "./repo.mjs";

const FEATURE_RE = /^[0-9A-Za-z][0-9A-Za-z._-]*$/;

/** Valida el nombre de feature; lanza AgentError ante traversal o caracteres inseguros. */
export function validateFeatureName(name) {
  if (typeof name !== "string" || name.length === 0) {
    throw new AgentError("Falta --feature (nombre de la feature Speckit).");
  }
  if (name.includes("..") || name.includes("/") || name.includes("\\") || name.includes("\0")) {
    throw new AgentError(`Nombre de feature inseguro: ${name}`);
  }
  if (!FEATURE_RE.test(name)) {
    throw new AgentError(`Nombre de feature inválido: ${name} (use [A-Za-z0-9._-]).`);
  }
  return name;
}

/**
 * Resuelve { featureDir, tasksPath } dentro de specs/. Garantiza contención: el path real no puede
 * escapar de specs/ vía symlink. tasks.md debe existir como archivo regular (no symlink, no dir).
 */
export function resolveFeature(name, repoRoot = REPO_ROOT) {
  validateFeatureName(name);
  const specsDir = join(repoRoot, "specs");
  const featureDir = join(specsDir, name);

  if (!existsSync(featureDir)) {
    throw new AgentError(`La feature no existe: specs/${name}`);
  }
  // Contención: el path real del featureDir debe seguir bajo specs/.
  const realFeature = realpathSync(featureDir);
  const realSpecs = realpathSync(specsDir);
  if (realFeature !== realSpecs && !realFeature.startsWith(realSpecs + sep)) {
    throw new AgentError(`La feature escapa de specs/: ${name}`);
  }

  const tasksPath = join(featureDir, "tasks.md");
  if (!existsSync(tasksPath)) {
    throw new AgentError(`No existe tasks.md para specs/${name}`);
  }
  const st = lstatSync(tasksPath);
  if (st.isSymbolicLink()) {
    throw new AgentError(`tasks.md no puede ser un symlink: specs/${name}/tasks.md`);
  }
  if (!st.isFile()) {
    throw new AgentError(`tasks.md no es un archivo regular: specs/${name}/tasks.md`);
  }
  // Defensa adicional: el path real del tasks.md sigue bajo el featureDir real.
  const realTasks = realpathSync(tasksPath);
  if (!realTasks.startsWith(realFeature + sep)) {
    throw new AgentError(`tasks.md escapa del directorio de la feature: ${name}`);
  }
  return { name, featureDir, tasksPath, relTasksPath: `specs/${name}/tasks.md`, relFeatureDir: `specs/${name}` };
}

/** Resuelve un path relativo asegurando que queda dentro del repo (anti-traversal). */
export function resolveInsideRepo(relPath, repoRoot = REPO_ROOT) {
  const abs = resolve(repoRoot, relPath);
  if (abs !== repoRoot && !abs.startsWith(repoRoot + sep)) {
    throw new AgentError(`Path fuera del repositorio: ${relPath}`);
  }
  return abs;
}
