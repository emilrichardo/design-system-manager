// Núcleo de agent:finalize, testeable contra repos temporales. Por defecto DRY-RUN. Con `commit:true`
// pre-verifica, marca SOLO el rango, re-verifica, hace staging quirúrgico (excluye .agents) y commitea.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, AgentError } from "./repo.mjs";
import { buildStatus } from "./status.mjs";
import { runVerify } from "./verify.mjs";
import { loadConfig } from "./config.mjs";
import { markTasksInText } from "./tasks.mjs";
import { createGit } from "./git.mjs";
import { resolveAllowedGlobs, computeScopeDrift } from "./scope.mjs";

/** Archivos a stagear: cambios en alcance, excluyendo .agents, + tasks.md. */
export function filesToStage(status, allowedGlobs) {
  const changed = [...new Set([...status.git.modified, ...status.git.untracked])].filter((p) => !p.startsWith(".agents/"));
  let inScope = changed;
  if (allowedGlobs !== null) {
    const drift = new Set(computeScopeDrift(changed, allowedGlobs, { alwaysAllow: [status.paths.tasks] }));
    inScope = changed.filter((p) => !drift.has(p));
  }
  const set = new Set(inScope);
  set.add(status.paths.tasks);
  return [...set];
}

/**
 * @param {{feature:string, checkpoint?:string, commit?:boolean, message?:string, repoRoot?:string,
 *          config?:object, paths?:string[], quick?:boolean, skipTests?:boolean, skipBuild?:boolean,
 *          gateRunner?:Function}} opts
 */
export function runFinalize(opts) {
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const config = opts.config ?? loadConfig(repoRoot);
  const explicitPaths = opts.paths && opts.paths.length > 0 ? opts.paths : undefined;
  const status = buildStatus({ feature: opts.feature, checkpoint: opts.checkpoint, repoRoot, config });

  // Feature completa: rechazar SIN tocar tasks.md, staging, commits ni working tree (antes de cualquier
  // mutación). Aplica tanto a dry-run como a --commit.
  if (status.completed) {
    throw new AgentError(`Feature ${status.feature} is already complete; finalize is not applicable.`);
  }

  const allowedGlobs = resolveAllowedGlobs({ config, feature: opts.feature, checkpoint: status.activeCheckpoint, explicitPaths });
  const rangeIds = status.checkpoint.taskIds;
  const pendingInRange = status.parsed.tasks.filter((t) => rangeIds.includes(t.id) && !t.completed).map((t) => t.id);
  const wouldStage = filesToStage(status, allowedGlobs);

  if (!opts.commit) {
    return {
      mode: "dry-run",
      feature: status.feature,
      checkpoint: status.activeCheckpoint,
      range: status.checkpointRange,
      wouldMark: pendingInRange,
      wouldStage,
      message: opts.message ?? null,
    };
  }

  // ── COMMIT ───────────────────────────────────────────────────────────────────────────────────
  if (opts.quick || opts.skipTests || opts.skipBuild) {
    throw new AgentError("El cierre con --commit no permite gates omitidos (--quick/--skip-*).");
  }
  if (!opts.message || String(opts.message).trim() === "") {
    throw new AgentError("--commit requiere --message.");
  }

  const verifyOpts = { feature: opts.feature, checkpoint: opts.checkpoint, repoRoot, config, explicitPaths };
  if (opts.gateRunner) verifyOpts.gateRunner = opts.gateRunner;

  const pre = runVerify(verifyOpts);
  if (!pre.passed) {
    return { mode: "commit", committed: false, blocked: "pre-verify", failures: pre.failures, feature: status.feature, checkpoint: status.activeCheckpoint };
  }

  const productive = wouldStage.filter((p) => p !== status.paths.tasks);
  if (productive.length === 0 && pendingInRange.length > 0) {
    throw new AgentError("No hay cambios productivos en el working tree para cerrar el checkpoint.");
  }

  // Marcar SOLO el rango.
  const tasksAbs = join(repoRoot, status.paths.tasks);
  const original = readFileSync(tasksAbs, "utf8");
  const { text: marked, changed } = markTasksInText(original, rangeIds);
  writeFileSync(tasksAbs, marked, "utf8");

  // Re-verificar el estado (sin re-ejecutar gates).
  const post = runVerify({ ...verifyOpts, runGatesNow: false });
  if (!post.passed) {
    return { mode: "commit", committed: false, blocked: "post-verify", failures: post.failures, markedTasks: changed, feature: status.feature, checkpoint: status.activeCheckpoint };
  }

  // Staging quirúrgico + commit.
  const git = createGit(repoRoot);
  const after1 = buildStatus({ feature: opts.feature, checkpoint: opts.checkpoint, repoRoot, config });
  const stageNow = filesToStage(after1, allowedGlobs).filter((p) => !p.startsWith(".agents/"));
  git.addExplicit(stageNow);
  git.commit(opts.message);

  const after = buildStatus({ feature: opts.feature, checkpoint: opts.checkpoint, repoRoot, config });
  const nextCp = after.parsed.checkpoints.find((c) => {
    const firstNum = c.firstId ? Number(c.firstId.slice(1)) : Infinity;
    return firstNum > Number(status.rangeLast.slice(1));
  });
  return {
    mode: "commit",
    committed: true,
    feature: after.feature,
    checkpoint: status.activeCheckpoint,
    range: status.checkpointRange,
    markedTasks: changed,
    stagedFiles: stageNow,
    head: after.head,
    firstPendingTask: after.firstPendingTask,
    nextCheckpoint: nextCp ? nextCp.label : null,
  };
}
