#!/usr/bin/env node
// agent:verify — valida de forma determinista estado de tareas + git + gates. PASS/FAIL + JSON estable.
import { parseArgs } from "./lib/args.mjs";
import { runVerify } from "./lib/verify.mjs";
import { loadConfig } from "./lib/config.mjs";
import { mainWrap, printJson, printLine } from "./lib/output.mjs";

const argv = process.argv.slice(2);
const pre = parseArgs(argv);

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

    if (pre.json) {
      printJson({
        feature: result.feature,
        checkpoint: result.checkpoint,
        range: result.range,
        head: result.head,
        workingTree: result.workingTree,
        passed: result.passed,
        failures: result.failures,
        gatesRun: result.gatesRun,
        gatesSkipped: result.gatesSkipped,
        gateResults: result.gateResults,
        scopeDrift: result.scopeDrift,
      });
      return result.passed ? 0 : 1;
    }

    if (result.gatesSkipped.length > 0) {
      printLine(`Gates omitidos: ${result.gatesSkipped.map((g) => `${g.key} (${g.reason})`).join(", ")}`);
    }
    if (result.passed) {
      printLine("PASS");
      return 0;
    }
    printLine("FAIL");
    printLine("");
    for (const f of result.failures) printLine(`- ${f}`);
    return 1;
  },
  argv,
  { json: pre.json },
);
