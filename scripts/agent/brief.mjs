#!/usr/bin/env node
// agent:brief — genera un prompt BREVE para el agente (Codex/Claude). Referencia las fuentes por path,
// no las copia. Incluye las tareas exactas del rango, gates, fuera de alcance y reglas de commit.
import { writeFileSync } from "node:fs";
import { parseArgs } from "./lib/args.mjs";
import { buildStatus } from "./lib/status.mjs";
import { loadConfig } from "./lib/config.mjs";
import { resolveInsideRepo } from "./lib/feature.mjs";
import { buildBrief } from "./lib/brief.mjs";
import { AgentError } from "./lib/repo.mjs";
import { mainWrap, printJson, printLine } from "./lib/output.mjs";

const argv = process.argv.slice(2);
const pre = parseArgs(argv);

await mainWrap(
  () => {
    const config = loadConfig();
    const status = buildStatus({ feature: pre.feature, checkpoint: pre.checkpoint, config });

    // Feature completa: no hay trabajo de implementación. Se rechaza incluso con --checkpoint (no existe
    // aún un flag de inspección histórica).
    if (status.completed) {
      throw new AgentError(`Feature ${status.feature} is already complete; no implementation brief can be generated.`);
    }

    const brief = buildBrief(status);

    if (pre.output) {
      const abs = resolveInsideRepo(pre.output);
      writeFileSync(abs, `${brief}\n`, "utf8");
    }
    if (pre.json) {
      printJson({
        feature: status.feature,
        checkpoint: status.activeCheckpoint,
        range: status.checkpointRange,
        head: status.head,
        brief,
      });
      return 0;
    }
    if (!pre.output) printLine(brief);
    else printLine(`Brief escrito en ${pre.output}`);
    return 0;
  },
  argv,
  { json: pre.json },
);
