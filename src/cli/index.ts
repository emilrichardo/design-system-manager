#!/usr/bin/env node
// Entrypoint del binario `neuraz-ds`. Pequeño: compone dependencias reales, ejecuta el programa,
// aplica process.exitCode y maneja solo errores de frontera (excepciones inesperadas → 70).
import {
  createBoundAnalyze,
  createFoundationsDependencies,
  createFoundationsJsonDependencies,
  createInspectDependencies,
  createInspectJsonDependencies,
  createRealDependencies,
  createValidateDependencies,
  createValidateJsonDependencies,
} from "./composition.js";
import { INTERNAL_ERROR_EXIT } from "./exit-codes.js";
import { processIO } from "./io.js";
import { runCli } from "./program.js";
import { installSignalHandlers } from "./signals.js";
import { readCliVersion } from "./version.js";

const removeSignals = installSignalHandlers(process, () => {
  // No abortar abruptamente: solo marcar cancelación; la transacción finaliza o hace rollback.
  process.exitCode = 1;
});

try {
  const io = processIO;
  const analyze = createBoundAnalyze();
  const code = await runCli({
    argv: process.argv,
    cwd: process.cwd(),
    io,
    deps: createRealDependencies(io),
    validateDeps: createValidateDependencies(io, analyze),
    inspectDeps: createInspectDependencies(io, analyze),
    validateJsonDeps: createValidateJsonDependencies(io, analyze),
    inspectJsonDeps: createInspectJsonDependencies(io, analyze),
    foundationsDeps: createFoundationsDependencies(io, analyze),
    foundationsJsonDeps: createFoundationsJsonDependencies(io, analyze),
    version: readCliVersion(),
  });
  process.exitCode = code;
} catch (e) {
  processIO.err(`Error interno: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = INTERNAL_ERROR_EXIT;
} finally {
  removeSignals();
}
