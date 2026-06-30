// Helpers de salida y proyecciones públicas estables (sin internals de git/parsed).
import { AgentError } from "./repo.mjs";

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function printLine(text = "") {
  process.stdout.write(`${text}\n`);
}

/** Proyección pública y estable del estado. */
export function statusPublic(status) {
  return {
    feature: status.feature,
    status: status.status,
    totalTasks: status.totalTasks,
    completedTasks: status.completedTasks,
    firstPendingTask: status.firstPendingTask,
    activeCheckpoint: status.activeCheckpoint,
    checkpointRange: status.checkpointRange,
    head: status.head,
    workingTree: status.workingTree,
    allowedUntracked: status.allowedUntracked,
  };
}

/**
 * Envuelve la lógica de un comando: parsea, ejecuta y traduce errores a salida limpia + exit code.
 * `fn(args)` puede devolver un exit code (número) o nada (=> 0).
 */
export async function mainWrap(fn, argv, { json = false } = {}) {
  try {
    const code = await fn(argv);
    process.exitCode = typeof code === "number" ? code : 0;
  } catch (e) {
    const message = e instanceof AgentError ? e.message : `Error inesperado: ${e?.message ?? e}`;
    if (json) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`);
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    process.exitCode = 1;
  }
}
