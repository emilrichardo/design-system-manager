// Parser determinista de tasks.md (única fuente canónica del estado de tareas).
// Reconoce ítems de checklist `- [ ] T001`, `- [X] T002`, `- [x] T003` y los agrupa por checkpoint
// (encabezados `## Checkpoint <label> — …`). No interpreta texto en español/inglés para el estado:
// el estado lo da exclusivamente el marcador entre corchetes. Detecta duplicados, huecos, orden y
// marcado inconsistente (tarea posterior completada con una anterior pendiente).
import { readFileSync } from "node:fs";
import { AgentError } from "./repo.mjs";

// Solo ítems de checklist al inicio de línea (ignora tablas de trazabilidad y dependencias).
const TASK_RE = /^\s*-\s*\[([ xX])\]\s*(T(\d+))\b(.*)$/;
// El label del checkpoint es el primer token alfanumérico (admite `/` para combos como C/D/E),
// independiente del separador o idioma del título: `## Checkpoint A — …`, `## Checkpoint L: …`.
const CHECKPOINT_RE = /^#{2,}\s*Checkpoint\s+([A-Za-z0-9]+(?:\/[A-Za-z0-9]+)*)\b/i;

const EN_DASH = "–";

/** Formatea un rango de IDs como `T001–T013` (en-dash). */
export function formatRange(firstId, lastId) {
  if (!firstId) return null;
  return lastId && lastId !== firstId ? `${firstId}${EN_DASH}${lastId}` : `${firstId}`;
}

/** Parsea el texto de un tasks.md. Devuelve estructura inmutable de tareas y checkpoints. */
export function parseTasksText(text) {
  const lines = text.split(/\r?\n/);
  /** @type {{id:string,num:number,completed:boolean,lineIndex:number,checkpoint:string|null}[]} */
  const tasks = [];
  /** @type {Map<string,{label:string,taskIds:string[]}>} */
  const checkpointMap = new Map();
  const checkpointOrder = [];
  let currentCheckpoint = null;

  lines.forEach((line, lineIndex) => {
    const cp = CHECKPOINT_RE.exec(line);
    if (cp) {
      currentCheckpoint = cp[1].trim();
      if (!checkpointMap.has(currentCheckpoint)) {
        checkpointMap.set(currentCheckpoint, { label: currentCheckpoint, taskIds: [] });
        checkpointOrder.push(currentCheckpoint);
      }
      return;
    }
    const m = TASK_RE.exec(line);
    if (!m) return;
    const stateChar = m[1];
    const id = m[2];
    const num = Number(m[3]);
    const completed = stateChar === "x" || stateChar === "X";
    const text = (m[4] ?? "").trim();
    tasks.push({ id, num, completed, lineIndex, checkpoint: currentCheckpoint, text });
    if (currentCheckpoint) checkpointMap.get(currentCheckpoint).taskIds.push(id);
  });

  // Duplicados (por id).
  const seen = new Map();
  const duplicates = [];
  for (const t of tasks) {
    seen.set(t.id, (seen.get(t.id) ?? 0) + 1);
  }
  for (const [id, count] of seen) if (count > 1) duplicates.push(id);
  duplicates.sort();

  // Orden numérico en el orden del archivo.
  const outOfOrder = [];
  let prevNum = -Infinity;
  for (const t of tasks) {
    if (t.num < prevNum) outOfOrder.push(t.id);
    prevNum = Math.max(prevNum, t.num);
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const firstPending = tasks.find((t) => !t.completed) ?? null;
  const firstPendingTask = firstPending ? firstPending.id : null;

  // Marcado inconsistente: tras la primera pendiente, no debe haber tareas completadas.
  const inconsistent = [];
  if (firstPending) {
    const fpIndex = tasks.indexOf(firstPending);
    for (let i = fpIndex + 1; i < tasks.length; i += 1) {
      if (tasks[i].completed) inconsistent.push({ completedId: tasks[i].id, pendingBeforeId: firstPendingTask });
    }
  }

  // Rangos por checkpoint (min..max id en orden del archivo).
  const checkpoints = checkpointOrder.map((label) => {
    const entry = checkpointMap.get(label);
    const ids = entry.taskIds;
    const firstId = ids[0] ?? null;
    const lastId = ids[ids.length - 1] ?? null;
    return { label, taskIds: ids, firstId, lastId, range: formatRange(firstId, lastId) };
  });

  return {
    tasks,
    checkpoints,
    totalTasks,
    completedTasks,
    firstPendingTask,
    duplicates,
    outOfOrder,
    inconsistent,
  };
}

/**
 * Marca como completados `[X]` exactamente los IDs dados que estén pendientes `[ ]`.
 * Devuelve { text, changed }. No toca tareas ya completadas ni fuera de la lista.
 */
export function markTasksInText(text, ids) {
  const set = new Set(ids);
  const lines = text.split(/\r?\n/);
  let changed = 0;
  const out = lines.map((line) => {
    const m = TASK_RE.exec(line);
    if (m && set.has(m[2]) && m[1] === " ") {
      changed += 1;
      return line.replace("[ ]", "[X]");
    }
    return line;
  });
  return { text: out.join("\n"), changed };
}

/** Lee y parsea un tasks.md desde disco. */
export function parseTasksFile(tasksPath) {
  let text;
  try {
    text = readFileSync(tasksPath, "utf8");
  } catch (e) {
    throw new AgentError(`No se pudo leer tasks.md: ${tasksPath}`);
  }
  return parseTasksText(text);
}

/** Devuelve el checkpoint que contiene una tarea dada (o null). */
export function checkpointOfTask(parsed, taskId) {
  const t = parsed.tasks.find((x) => x.id === taskId);
  return t ? t.checkpoint : null;
}

/**
 * Resuelve el checkpoint activo y su rango. Si `requested` se da, lo busca (case-insensitive); si no,
 * lo infiere desde la primera tarea pendiente. Lanza AgentError si no puede determinarse.
 */
export function resolveCheckpoint(parsed, requested) {
  if (requested != null && requested !== "") {
    const want = String(requested).trim().toLowerCase();
    const found = parsed.checkpoints.find((c) => c.label.toLowerCase() === want);
    if (!found) {
      const labels = parsed.checkpoints.map((c) => c.label).join(", ") || "(ninguno)";
      throw new AgentError(`Checkpoint no encontrado: ${requested}. Disponibles: ${labels}`);
    }
    return found;
  }
  // Inferir desde la primera pendiente.
  if (parsed.firstPendingTask) {
    const label = checkpointOfTask(parsed, parsed.firstPendingTask);
    if (label) {
      const found = parsed.checkpoints.find((c) => c.label === label);
      if (found) return found;
    }
    throw new AgentError(
      "No se puede inferir el checkpoint de la primera tarea pendiente; especifique --checkpoint.",
    );
  }
  // Todo completo: usar el último checkpoint si existe.
  if (parsed.checkpoints.length > 0) return parsed.checkpoints[parsed.checkpoints.length - 1];
  throw new AgentError("No hay checkpoints ni tareas pendientes para determinar el rango.");
}

/** IDs de tareas dentro de un rango [firstNum..lastNum] inclusive, en orden del archivo. */
export function tasksInCheckpoint(parsed, checkpoint) {
  return parsed.tasks.filter((t) => checkpoint.taskIds.includes(t.id));
}
