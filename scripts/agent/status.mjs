#!/usr/bin/env node
// agent:status — detecta el estado actual de una feature desde tasks.md (única fuente canónica).
import { parseArgs } from "./lib/args.mjs";
import { buildStatus } from "./lib/status.mjs";
import { loadConfig } from "./lib/config.mjs";
import { AgentError } from "./lib/repo.mjs";
import { mainWrap, printJson, printLine, statusPublic } from "./lib/output.mjs";

const argv = process.argv.slice(2);
const pre = parseArgs(argv);

await mainWrap(
  () => {
    const config = loadConfig();
    const status = buildStatus({ feature: pre.feature, checkpoint: pre.checkpoint, config });

    // status FALLA claramente ante marcado inconsistente o IDs duplicados.
    if (status.hasIssues) {
      const lines = [
        ...status.issues.duplicates.map((id) => `ID duplicado: ${id}`),
        ...status.issues.inconsistent.map((it) => `${it.completedId} marcada con ${it.pendingBeforeId} pendiente`),
      ];
      throw new AgentError(`Estado de tareas inconsistente:\n- ${lines.join("\n- ")}`);
    }

    if (pre.json) {
      printJson(statusPublic(status));
      return 0;
    }
    printLine(`Feature: ${status.feature}`);
    printLine(`Completed: ${status.completedTasks}/${status.totalTasks}`);
    printLine(`First pending: ${status.firstPendingTask ?? "(none)"}`);
    printLine(`Checkpoint: ${status.activeCheckpoint}`);
    printLine(`Range: ${status.checkpointRange ?? "(n/a)"}`);
    printLine(`HEAD: ${status.head}`);
    printLine(`Working tree: ${status.workingTree}`);
    return 0;
  },
  argv,
  { json: pre.json },
);
