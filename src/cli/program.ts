// T041/T043 — Programa Commander testeable. createProgram registra `neuraz-ds init`; runCli
// parsea (async), traduce el resultado a código de salida y mapea errores del parser:
// help/version → 0, errores de uso → 3 (USAGE_ERROR_EXIT). No llama a process.exit.
import { Command, CommanderError } from "commander";
import type { InitializeDependencies } from "../application/ports.js";
import type { CliIO } from "./io.js";
import { exitCodeForResult, USAGE_ERROR_EXIT } from "./exit-codes.js";
import { runInit } from "./commands/init.js";

export interface ProgramHandlers {
  version: string;
  io: CliIO;
  onInit: () => Promise<number>;
}

export function createProgram(handlers: ProgramHandlers): {
  program: Command;
  getInitCode: () => number | null;
} {
  const state: { initCode: number | null } = { initCode: null };
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
    state.initCode = await handlers.onInit();
  });

  return { program, getInitCode: () => state.initCode };
}

export interface CliRuntime {
  argv: string[];
  cwd: string;
  io: CliIO;
  deps: InitializeDependencies;
  version: string;
}

export async function runCli(runtime: CliRuntime): Promise<number> {
  const { program, getInitCode } = createProgram({
    version: runtime.version,
    io: runtime.io,
    onInit: () => runInit(runtime.cwd, runtime.deps).then(exitCodeForResult),
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

  const code = getInitCode();
  if (code !== null) return code;

  // Sin subcomando: mostrar ayuda y terminar con éxito.
  runtime.io.out(program.helpInformation());
  return 0;
}
