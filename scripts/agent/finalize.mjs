#!/usr/bin/env node
// agent:finalize — cierra un checkpoint de forma controlada. Por defecto DRY-RUN (no marca, no stagea,
// no commitea). Con --commit: pre-verifica (gates completos), marca SOLO el rango, re-verifica, hace
// staging quirúrgico (excluye .agents) y crea un único commit con --message. Lógica en lib/finalize.mjs.
import { parseArgs } from "./lib/args.mjs";
import { runFinalize } from "./lib/finalize.mjs";
import { loadConfig } from "./lib/config.mjs";
import { mainWrap, printJson, printLine } from "./lib/output.mjs";

const argv = process.argv.slice(2);
const pre = parseArgs(argv);

await mainWrap(
  () => {
    const config = loadConfig();
    const result = runFinalize({
      feature: pre.feature,
      checkpoint: pre.checkpoint,
      commit: pre.commit,
      message: pre.message,
      config,
      paths: pre.paths,
      quick: pre.quick,
      skipTests: pre.skipTests,
      skipBuild: pre.skipBuild,
    });

    if (result.mode === "dry-run") {
      if (pre.json) {
        printJson({ ...result, note: "Sin --commit no se marca, no se stagea ni se commitea." });
        return 0;
      }
      printLine("DRY-RUN (sin --commit): no se marca, no se hace staging, no se commitea.");
      printLine(`Feature: ${result.feature} — Checkpoint: ${result.checkpoint} (${result.range})`);
      printLine(`Marcaría (${result.wouldMark.length}): ${result.wouldMark.join(", ") || "(ninguna pendiente)"}`);
      printLine(`Staging quirúrgico: ${result.wouldStage.join(", ")}`);
      printLine(`Mensaje: ${result.message ?? "(falta --message; requerido para --commit)"}`);
      return 0;
    }

    // commit mode
    if (!result.committed) {
      if (pre.json) {
        printJson(result);
        return 1;
      }
      printLine(`FAIL — bloqueado en ${result.blocked}. No se commitea (working tree reviewable).`);
      for (const f of result.failures ?? []) printLine(`- ${f}`);
      if (result.blocked === "pre-verify") printLine(`Sugerencia: npm run agent:handoff -- --feature ${result.feature}`);
      return 1;
    }
    if (pre.json) {
      printJson(result);
      return 0;
    }
    printLine(`Checkpoint ${result.checkpoint} cerrado. Commit ${result.head}.`);
    printLine(`Tareas marcadas: ${result.markedTasks} (${result.range}).`);
    printLine(`Primera pendiente: ${result.firstPendingTask ?? "(ninguna)"} — Siguiente checkpoint: ${result.nextCheckpoint ?? "(ninguno)"}`);
    return 0;
  },
  argv,
  { json: pre.json },
);
