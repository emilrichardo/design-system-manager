// Verificación determinista de estado de tareas + git + (opcional) gates. Devuelve un objeto estable
// con `passed` y una lista de `failures` legibles. No muta nada.
import { REPO_ROOT } from "./repo.mjs";
import { buildStatus } from "./status.mjs";
import { selectGates, runGates } from "./gates.mjs";
import { resolveAllowedGlobs, computeScopeDrift } from "./scope.mjs";
import { isAllowedUntracked } from "./status.mjs";

/**
 * @param {{feature:string, checkpoint?:string, repoRoot?:string, config?:object,
 *          skipTests?:boolean, skipBuild?:boolean, quick?:boolean, runGatesNow?:boolean,
 *          explicitPaths?:string[]}} opts
 */
export function runVerify(opts) {
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const status = buildStatus({ feature: opts.feature, checkpoint: opts.checkpoint, repoRoot, config: opts.config });
  const failures = [];
  const { parsed, checkpoint } = status;

  // ── Estado de tareas ───────────────────────────────────────────────────────────────────────
  for (const id of parsed.duplicates) failures.push(`ID de tarea duplicado: ${id}.`);
  for (const it of parsed.inconsistent) {
    failures.push(`${it.completedId} está marcada pero ${it.pendingBeforeId} sigue pendiente.`);
  }
  for (const id of parsed.outOfOrder) failures.push(`Tarea fuera de orden numérico: ${id}.`);

  // Checks de rango solo si hay un checkpoint activo (feature en progreso). Una feature completa no tiene
  // rango: sus checks de estado se reducen a duplicados/inconsistencias (ya evaluados arriba).
  if (checkpoint) {
    const firstNum = checkpoint.firstId ? Number(checkpoint.firstId.slice(1)) : Infinity;
    const lastNum = checkpoint.lastId ? Number(checkpoint.lastId.slice(1)) : -Infinity;

    // Tareas anteriores al rango deben estar completas.
    for (const t of parsed.tasks) {
      if (t.num < firstNum && !t.completed) failures.push(`Tarea anterior al rango sin completar: ${t.id}.`);
    }
    // Ninguna tarea posterior al rango puede estar iniciada (completada).
    for (const t of parsed.tasks) {
      if (t.num > lastNum && t.completed) failures.push(`Tarea posterior al rango ya iniciada/completada: ${t.id}.`);
    }
    // Primera pendiente esperada: dentro del rango, o el rango ya está completo.
    if (status.firstPendingTask) {
      const fpNum = Number(status.firstPendingTask.slice(1));
      if (fpNum < firstNum || fpNum > lastNum) {
        failures.push(`Primera pendiente ${status.firstPendingTask} fuera del rango ${checkpoint.range}.`);
      }
    }
  }

  // ── Git ──────────────────────────────────────────────────────────────────────────────────────
  // `.agents/…` nunca debe estar staged.
  const agentsStaged = status.git.staged.filter((p) => p.startsWith(".agents/"));
  for (const p of agentsStaged) failures.push(`.agents/… está staged: ${p}.`);

  // Deriva de alcance (solo si hay configuración o paths explícitos; sin política rígida por defecto).
  // Considera cambios staged + modificados + untracked productivos; exime tasks.md y untracked permitido.
  const allowedGlobs = resolveAllowedGlobs({
    config: opts.config,
    feature: opts.feature,
    checkpoint: checkpoint ? checkpoint.label : undefined,
    explicitPaths: opts.explicitPaths,
  });
  const exempt = [status.paths.tasks, ...status.allowedUntracked];
  const changed = [...new Set([...status.git.staged, ...status.git.modified, ...status.git.untracked])].filter(
    (p) => !p.startsWith(".agents/") && !exempt.some((a) => p === a || p.startsWith(a)),
  );
  const drift = computeScopeDrift(changed, allowedGlobs, { alwaysAllow: exempt });
  for (const f of drift) failures.push(`Archivo fuera de alcance: ${f}.`);

  // ── Gates ──────────────────────────────────────────────────────────────────────────────────
  const selection = selectGates({ config: opts.config, skipTests: opts.skipTests, skipBuild: opts.skipBuild, quick: opts.quick });
  let gateResults = [];
  if (opts.runGatesNow !== false) {
    const gateRunner = opts.gateRunner ?? runGates;
    gateResults = gateRunner(selection.run, repoRoot);
    for (const g of gateResults.filter((g) => !g.passed)) failures.push(`Gate falló: npm/${g.key}.`);
  }

  return {
    feature: status.feature,
    completed: status.completed,
    checkpoint: checkpoint ? checkpoint.label : null,
    range: checkpoint ? checkpoint.range : null,
    head: status.head,
    workingTree: status.workingTree,
    passed: failures.length === 0,
    failures,
    gatesRun: selection.run,
    gatesSkipped: selection.skipped,
    gateResults: gateResults.map((g) => ({ key: g.key, passed: g.passed })),
    scopeDrift: drift,
    status,
  };
}
