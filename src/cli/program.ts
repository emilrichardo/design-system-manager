// T041/T043/T037 — Programa Commander testeable. createProgram registra `init`, `validate` e
// `inspect`; runCli parsea (async), traduce el resultado a código de salida y mapea errores del
// parser: help/version → 0, errores de uso → 3 (USAGE_ERROR_EXIT). No llama a process.exit.
import { Command, CommanderError } from "commander";
import type { InitializeDependencies } from "../application/ports.js";
import type {
  ValidateDesignSystemDependencies,
  InspectDesignSystemDependencies,
} from "../application/analysis-ports.js";
import type { CliIO } from "./io.js";
import { exitCodeForResult, exitCodeForOutcome, INTERNAL_ERROR_EXIT, USAGE_ERROR_EXIT } from "./exit-codes.js";
import { runInit } from "./commands/init.js";
import { runValidate } from "./commands/validate.js";
import { runInspect } from "./commands/inspect.js";

export interface ProgramHandlers {
  version: string;
  io: CliIO;
  onInit: () => Promise<number>;
  onValidate: () => Promise<number>;
  onInspect: () => Promise<number>;
}

export function createProgram(handlers: ProgramHandlers): {
  program: Command;
  getCode: () => number | null;
} {
  const state: { code: number | null } = { code: null };
  const program = new Command();
  program
    .name("neuraz-ds")
    .description("Gestor local de Design Systems (Neuraz).")
    .version(handlers.version, "-v, --version", "Muestra la versión");
  program.configureOutput({
    writeOut: (s) => handlers.io.out(s),
    writeErr: (s) => handlers.io.err(s),
  });
  program.exitOverride();

  const init = program
    .command("init")
    .description("Inicializa un Design System local en el proyecto anfitrión.");
  init.exitOverride();
  init.action(async () => {
    state.code = await handlers.onInit();
  });

  const validate = program
    .command("validate")
    .description("Valida el Design System administrado sin modificar archivos.");
  validate.exitOverride();
  validate.action(async () => {
    state.code = await handlers.onValidate();
  });

  const inspect = program
    .command("inspect")
    .description("Inspecciona la estructura, tokens y estado del Design System sin modificar archivos.");
  inspect.exitOverride();
  inspect.action(async () => {
    state.code = await handlers.onInspect();
  });

  return { program, getCode: () => state.code };
}

export interface CliRuntime {
  argv: string[];
  cwd: string;
  io: CliIO;
  deps: InitializeDependencies;
  /** Dependencias de `validate`/`inspect`. Opcionales: el binario real siempre las provee; pruebas
   *  centradas en `init` pueden omitirlas (esos comandos no se ejecutan allí). */
  validateDeps?: ValidateDesignSystemDependencies;
  inspectDeps?: InspectDesignSystemDependencies;
  version: string;
}

export async function runCli(runtime: CliRuntime): Promise<number> {
  const { program, getCode } = createProgram({
    version: runtime.version,
    io: runtime.io,
    onInit: () => runInit(runtime.cwd, runtime.deps).then(exitCodeForResult),
    onValidate: () =>
      runtime.validateDeps === undefined
        ? Promise.resolve(INTERNAL_ERROR_EXIT)
        : runValidate(runtime.cwd, runtime.validateDeps).then((r) => exitCodeForOutcome(r.outcome)),
    onInspect: () =>
      runtime.inspectDeps === undefined
        ? Promise.resolve(INTERNAL_ERROR_EXIT)
        : runInspect(runtime.cwd, runtime.inspectDeps).then((r) => exitCodeForOutcome(r.outcome)),
  });

  try {
    await program.parseAsync(runtime.argv, { from: "node" });
  } catch (e) {
    if (e instanceof CommanderError) {
      // Ayuda y versión: salida exitosa. Errores de uso del parser: código 3.
      if (
        e.code === "commander.helpDisplayed" ||
        e.code === "commander.help" ||
        e.code === "commander.version"
      ) {
        return 0;
      }
      return USAGE_ERROR_EXIT;
    }
    throw e; // excepción inesperada → la maneja el entrypoint
  }

  const code = getCode();
  if (code !== null) return code;

  // Sin subcomando: mostrar ayuda y terminar con éxito.
  runtime.io.out(program.helpInformation());
  return 0;
}
