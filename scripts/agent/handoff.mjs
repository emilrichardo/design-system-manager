#!/usr/bin/env node
// agent:handoff — genera .agent-handoff.json y .agent-handoff.md para continuar con otro agente sin
// repetir el prompt. Incluye estado de tareas, git, gates ejecutados y siguiente comando recomendado.
// `generatedAt` se incluye (el handoff NO es un artifact determinista del Core).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "./lib/args.mjs";
import { runVerify } from "./lib/verify.mjs";
import { loadConfig } from "./lib/config.mjs";
import { REPO_ROOT } from "./lib/repo.mjs";
import { buildHandoff, handoffMarkdown } from "./lib/handoff.mjs";
import { mainWrap, printJson, printLine } from "./lib/output.mjs";

const argv = process.argv.slice(2);
const pre = parseArgs(argv);

function nowIso() {
  return new Date().toISOString();
}

await mainWrap(
  () => {
    const config = loadConfig();
    const result = runVerify({
      feature: pre.feature,
      checkpoint: pre.checkpoint,
      config,
      skipTests: pre.skipTests,
      skipBuild: pre.skipBuild,
      quick: pre.quick,
      explicitPaths: pre.paths.length > 0 ? pre.paths : undefined,
    });
    const handoff = buildHandoff(result, nowIso());
    const md = handoffMarkdown(handoff);

    writeFileSync(join(REPO_ROOT, ".agent-handoff.json"), `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
    writeFileSync(join(REPO_ROOT, ".agent-handoff.md"), `${md}\n`, "utf8");

    if (pre.json) {
      printJson(handoff);
      return 0;
    }
    printLine(`Handoff generado: .agent-handoff.json / .agent-handoff.md`);
    printLine(`Estado: ${result.passed ? "PASS" : "FAIL"} — siguiente: ${handoff.nextRecommendedCommand}`);
    return 0;
  },
  argv,
  { json: pre.json },
);
