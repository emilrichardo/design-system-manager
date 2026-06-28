// T041/T043/T037 — Programa Commander testeable. createProgram registra `init`, `validate` e
// `inspect`; runCli parsea (async), traduce el resultado a código de salida y mapea errores del
// parser: help/version → 0, errores de uso → 3 (USAGE_ERROR_EXIT). No llama a process.exit.
//
// T019/T021/T023 (003) — `validate`/`inspect` aceptan la opción local booleana `--json` (default
// false; NO en `init`, NO global). La acción lee `options.json` y el handler selecciona el conjunto
// de dependencias (reporter textual o JSON) — un único adapter por ejecución, una sola llamada al
// caso de uso, mismo `exitCodeForOutcome`. En modo JSON, una excepción inesperada se captura en el
// handler (que conoce command + jsonMode) y produce un envelope de error interno en stderr con exit
// 70 (stdout vacío); el modo humano conserva el error interno previo (excepción → entrypoint).
import { Command, CommanderError } from "commander";
import type { InitializeDependencies } from "../application/ports.js";
import type {
  ValidateDesignSystemDependencies,
  InspectDesignSystemDependencies,
} from "../application/analysis-ports.js";
import type { InspectFoundationsDependencies } from "../application/foundations/foundations-ports.js";
import type { CliIO } from "./io.js";
import { exitCodeForResult, exitCodeForOutcome, INTERNAL_ERROR_EXIT, USAGE_ERROR_EXIT } from "./exit-codes.js";
import { writeInternalErrorJson } from "./json-error.js";
import { toFoundationsInternalErrorEnvelope } from "../application/foundations/json/map-internal-error.js";
import { serializeFoundationsJsonV1 } from "../infrastructure/reporter/foundations-json-serializer.js";
import { runInit } from "./commands/init.js";
import { runValidate } from "./commands/validate.js";
import { runInspect } from "./commands/inspect.js";
import { runFoundations } from "./commands/foundations.js";

/** Modo de presentación parseado por Commander para validate/inspect. */
export interface CommandModeOptions {
  readonly json: boolean;
}

export interface ProgramHandlers {
  version: string;
  io: CliIO;
  onInit: () => Promise<number>;
  onValidate: (opts: CommandModeOptions) => Promise<number>;
  onInspect: (opts: CommandModeOptions) => Promise<number>;
  onFoundations: (opts: CommandModeOptions) => Promise<number>;
}

const JSON_FLAG_DESCRIPTION = "Emite el resultado como JSON estructurado.";

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
    .description("Valida el Design System administrado sin modificar archivos.")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  validate.exitOverride();
  validate.action(async (options: { json?: boolean }) => {
    state.code = await handlers.onValidate({ json: options.json === true });
  });

  const inspect = program
    .command("inspect")
    .description("Inspecciona la estructura, tokens y estado del Design System sin modificar archivos.")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  inspect.exitOverride();
  inspect.action(async (options: { json?: boolean }) => {
    state.code = await handlers.onInspect({ json: options.json === true });
  });

  const foundations = program
    .command("foundations")
    .description("Inspecciona las categorías foundation del Design System sin modificar archivos.")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  foundations.exitOverride();
  foundations.action(async (options: { json?: boolean }) => {
    state.code = await handlers.onFoundations({ json: options.json === true });
  });

  return { program, getCode: () => state.code };
}

export interface CliRuntime {
  argv: string[];
  cwd: string;
  io: CliIO;
  deps: InitializeDependencies;
  /** Dependencias de `validate`/`inspect` (modo textual). Opcionales: el binario real siempre las
   *  provee; pruebas centradas en `init` pueden omitirlas (esos comandos no se ejecutan allí). */
  validateDeps?: ValidateDesignSystemDependencies;
  inspectDeps?: InspectDesignSystemDependencies;
  /** Dependencias de `validate`/`inspect` en modo JSON (reporter JSON). Mismas garantías. */
  validateJsonDeps?: ValidateDesignSystemDependencies;
  inspectJsonDeps?: InspectDesignSystemDependencies;
  /** Dependencias de `foundations` en modo textual/JSON. Opcionales para pruebas centradas en 001. */
  foundationsDeps?: InspectFoundationsDependencies;
  foundationsJsonDeps?: InspectFoundationsDependencies;
  version: string;
}

function writeFoundationsInternalErrorJson(io: CliIO): void {
  io.err(serializeFoundationsJsonV1(toFoundationsInternalErrorEnvelope("foundations")));
}

export async function runCli(runtime: CliRuntime): Promise<number> {
  // Ejecuta validate/inspect en el modo elegido. Una sola ejecución del caso de uso; el exit code es
  // el mismo con o sin `--json`. En JSON, una excepción inesperada → envelope de error interno + 70.
  const runValidateMode = async (json: boolean): Promise<number> => {
    const deps = json ? runtime.validateJsonDeps : runtime.validateDeps;
    if (deps === undefined) {
      if (json) writeInternalErrorJson(runtime.io, "validate");
      return INTERNAL_ERROR_EXIT;
    }
    if (!json) return runValidate(runtime.cwd, deps).then((r) => exitCodeForOutcome(r.outcome));
    try {
      const result = await runValidate(runtime.cwd, deps);
      return exitCodeForOutcome(result.outcome);
    } catch {
      writeInternalErrorJson(runtime.io, "validate");
      return INTERNAL_ERROR_EXIT;
    }
  };

  const runInspectMode = async (json: boolean): Promise<number> => {
    const deps = json ? runtime.inspectJsonDeps : runtime.inspectDeps;
    if (deps === undefined) {
      if (json) writeInternalErrorJson(runtime.io, "inspect");
      return INTERNAL_ERROR_EXIT;
    }
    if (!json) return runInspect(runtime.cwd, deps).then((r) => exitCodeForOutcome(r.outcome));
    try {
      const result = await runInspect(runtime.cwd, deps);
      return exitCodeForOutcome(result.outcome);
    } catch {
      writeInternalErrorJson(runtime.io, "inspect");
      return INTERNAL_ERROR_EXIT;
    }
  };

  const runFoundationsMode = async (json: boolean): Promise<number> => {
    const deps = json ? runtime.foundationsJsonDeps : runtime.foundationsDeps;
    if (deps === undefined) {
      if (json) writeFoundationsInternalErrorJson(runtime.io);
      return INTERNAL_ERROR_EXIT;
    }
    if (!json) return runFoundations(runtime.cwd, deps).then((r) => exitCodeForOutcome(r.outcome));
    try {
      const result = await runFoundations(runtime.cwd, deps);
      return exitCodeForOutcome(result.outcome);
    } catch {
      writeFoundationsInternalErrorJson(runtime.io);
      return INTERNAL_ERROR_EXIT;
    }
  };

  const { program, getCode } = createProgram({
    version: runtime.version,
    io: runtime.io,
    onInit: () => runInit(runtime.cwd, runtime.deps).then(exitCodeForResult),
    onValidate: ({ json }) => runValidateMode(json),
    onInspect: ({ json }) => runInspectMode(json),
    onFoundations: ({ json }) => runFoundationsMode(json),
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
