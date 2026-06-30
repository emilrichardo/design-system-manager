// Cálculo del estado de una feature (compartido por status/brief/verify/handoff).
// No ejecuta gates ni muta nada. Deriva todo de tasks.md + git.
import { REPO_ROOT } from "./repo.mjs";
import { resolveFeature } from "./feature.mjs";
import { parseTasksFile, resolveCheckpoint } from "./tasks.mjs";
import { createGit } from "./git.mjs";
import { loadConfig } from "./config.mjs";

/** Untracked permitido = igual o bajo un prefijo permitido. */
export function isAllowedUntracked(path, allowed) {
  return allowed.some((a) => path === a || path === a.replace(/\/$/, "") || path.startsWith(a));
}

/**
 * Construye el estado. No lanza por problemas de marcado (los expone en `issues`); sí lanza por
 * feature/tasks.md inexistente o checkpoint irresoluble.
 * @param {{feature:string, checkpoint?:string, repoRoot?:string, config?:object}} opts
 */
export function buildStatus(opts) {
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const config = opts.config ?? loadConfig(repoRoot);
  const feature = resolveFeature(opts.feature, repoRoot);
  const parsed = parseTasksFile(feature.tasksPath);
  // Una feature está COMPLETA cuando tiene tareas y ninguna está pendiente. En ese caso no hay
  // checkpoint activo ni rango: no queda trabajo de implementación por hacer.
  const completed = parsed.totalTasks > 0 && parsed.firstPendingTask === null;
  const checkpoint = completed ? null : resolveCheckpoint(parsed, opts.checkpoint);
  const git = createGit(repoRoot);
  const gitStatus = git.status();

  const disallowedUntracked = gitStatus.untracked.filter((u) => !isAllowedUntracked(u, config.allowedUntracked));
  const workingTree =
    gitStatus.staged.length === 0 && gitStatus.modified.length === 0 && disallowedUntracked.length === 0
      ? "clean"
      : "dirty";

  const issues = {
    duplicates: parsed.duplicates,
    outOfOrder: parsed.outOfOrder,
    inconsistent: parsed.inconsistent,
  };
  const hasIssues = parsed.duplicates.length > 0 || parsed.inconsistent.length > 0;

  return {
    feature: feature.name,
    status: completed ? "completed" : "in-progress",
    completed,
    totalTasks: parsed.totalTasks,
    completedTasks: parsed.completedTasks,
    firstPendingTask: parsed.firstPendingTask,
    activeCheckpoint: checkpoint ? checkpoint.label : null,
    checkpointRange: checkpoint ? checkpoint.range : null,
    rangeFirst: checkpoint ? checkpoint.firstId : null,
    rangeLast: checkpoint ? checkpoint.lastId : null,
    tasksInRange: checkpoint ? checkpoint.taskIds : [],
    head: git.shortHead(),
    workingTree,
    allowedUntracked: config.allowedUntracked,
    git: gitStatus,
    disallowedUntracked,
    issues,
    hasIssues,
    paths: { tasks: feature.relTasksPath, featureDir: feature.relFeatureDir },
    parsed,
    checkpoint,
  };
}
