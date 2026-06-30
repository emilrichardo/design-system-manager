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
import { Argument, Command, CommanderError } from "commander";
import type { InitializeDependencies } from "../application/ports.js";
import type {
  ValidateDesignSystemDependencies,
  InspectDesignSystemDependencies,
} from "../application/analysis-ports.js";
import type { InspectFoundationsDependencies } from "../application/foundations/foundations-ports.js";
import type { BuildExportCliDependencies, PresetsCliDependencies } from "./composition.js";
import type { CliIO } from "./io.js";
import { exitCodeForBuildExportOutcome, exitCodeForResult, exitCodeForOutcome, exitCodeForPresetOutcome, INTERNAL_ERROR_EXIT, USAGE_ERROR_EXIT } from "./exit-codes.js";
import type { PresetExitOutcome } from "./exit-codes.js";
import { writeInternalErrorJson, writePresetsInternalErrorJson } from "./json-error.js";
import { toFoundationsInternalErrorEnvelope } from "../application/foundations/json/map-internal-error.js";
import { serializeFoundationsJsonV1 } from "../infrastructure/reporter/foundations-json-serializer.js";
import { BuildTerminalReporter } from "../infrastructure/reporter/build-terminal-reporter.js";
import { BuildJsonReporter } from "../infrastructure/reporter/build-json-reporter.js";
import type { BuildFormat } from "../domain/build-export/build-format.js";
import { runInit } from "./commands/init.js";
import { runValidate } from "./commands/validate.js";
import { runInspect } from "./commands/inspect.js";
import { runFoundations } from "./commands/foundations.js";
import { runBuild } from "./commands/build.js";
import { runExport } from "./commands/export.js";
import { runPresetsApply, runPresetsInspect, runPresetsList, runPresetsPlan } from "./commands/presets.js";

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
  onBuild: (opts: CommandModeOptions) => Promise<number>;
  onExport: (format: BuildFormat) => Promise<number>;
  onPresetsList: (opts: CommandModeOptions) => Promise<number>;
  onPresetsInspect: (id: string, opts: CommandModeOptions) => Promise<number>;
  onPresetsPlan: (id: string, opts: CommandModeOptions) => Promise<number>;
  onPresetsApply: (id: string, opts: CommandModeOptions) => Promise<number>;
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

  // T140 (006) — `build` publica todos los formatos como un conjunto a `design-system/build/`. `--json`
  // es local (default false); sin `--output/--input/--formats/--force/--dry-run/--cwd/--clean/--watch/
  // --minify`. Un solo caso de uso por invocación.
  const build = program
    .command("build")
    .description("Compila el Design System a `design-system/build/` (todos los formatos como un conjunto).")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  build.exitOverride();
  build.action(async (options: { json?: boolean }) => {
    state.code = await handlers.onBuild({ json: options.json === true });
  });

  // T141 (006) — `export <format>` emite UN formato a stdout (read-only). Sin `--json` ni otros flags;
  // el formato se restringe a css|json|typescript vía Commander (un valor inválido es error de uso).
  const exportCmd = program
    .command("export")
    .description("Emite un formato del Design System a stdout (sin escribir): css | json | typescript.");
  exportCmd.addArgument(new Argument("<format>", "Formato a exportar.").choices(["css", "json", "typescript"]));
  exportCmd.exitOverride();
  exportCmd.action(async (format: BuildFormat) => {
    state.code = await handlers.onExport(format);
  });

  // T094 (005) — grupo plural `presets` con subcomandos. `--json` es local a cada subcomando (no
  // global); sin `--force`, `--category` ni `--dry-run`. `plan` es preview (no escribe); `apply` escribe.
  const presets = program
    .command("presets")
    .description("Gestiona presets de Design System (catálogo empaquetado, solo lectura salvo `apply`).");
  presets.exitOverride();

  const presetsList = presets
    .command("list")
    .description("Lista los presets disponibles del catálogo empaquetado.")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  presetsList.exitOverride();
  presetsList.action(async (options: { json?: boolean }) => {
    state.code = await handlers.onPresetsList({ json: options.json === true });
  });

  const presetsInspect = presets
    .command("inspect <id>")
    .description("Inspecciona un preset (metadata, tokens, validación) sin escribir.")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  presetsInspect.exitOverride();
  presetsInspect.action(async (id: string, options: { json?: boolean }) => {
    state.code = await handlers.onPresetsInspect(id, { json: options.json === true });
  });

  const presetsPlan = presets
    .command("plan <id>")
    .description("Previsualiza la aplicación de un preset contra el Design System (NO escribe).")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  presetsPlan.exitOverride();
  presetsPlan.action(async (id: string, options: { json?: boolean }) => {
    state.code = await handlers.onPresetsPlan(id, { json: options.json === true });
  });

  const presetsApply = presets
    .command("apply <id>")
    .description("Aplica un preset al Design System mediante escritura atómica (recalcula el plan).")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  presetsApply.exitOverride();
  presetsApply.action(async (id: string, options: { json?: boolean }) => {
    state.code = await handlers.onPresetsApply(id, { json: options.json === true });
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
  /** Dependencias del grupo `presets` (use cases + reporters humano/JSON). Opcional para pruebas de 001. */
  presetsDeps?: PresetsCliDependencies;
  /** Dependencias de `build`/`export` (use cases + reporters humano/JSON/bytes). Opcional para pruebas de 001. */
  buildExportDeps?: BuildExportCliDependencies;
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

  // Build: un solo adapter (reporter humano o JSON) por ejecución; una sola llamada al caso de uso;
  // outcome semántico → exit via `exitCodeForBuildExportOutcome`. Una excepción inesperada se captura
  // aquí (adapter) → `internal-error`/70 con el reporter elegido (stdout intacto en JSON).
  const runBuildMode = async (json: boolean): Promise<number> => {
    const cli = runtime.buildExportDeps;
    const reporter = cli !== undefined ? (json ? cli.buildJson : cli.buildTerminal) : json ? new BuildJsonReporter(runtime.io) : new BuildTerminalReporter(runtime.io);
    if (cli === undefined) {
      reporter.internalError();
      return INTERNAL_ERROR_EXIT;
    }
    try {
      const result = await runBuild(runtime.cwd, cli.build);
      reporter.completed(result);
      return exitCodeForBuildExportOutcome(result.outcome);
    } catch {
      reporter.internalError();
      return INTERNAL_ERROR_EXIT;
    }
  };

  // Export: read-only; éxito → bytes exactos a stdout, error esperado → stderr seguro; exit via la misma
  // tabla. `internal-error` (adapter) → mensaje seguro a stderr, exit 70.
  const runExportMode = async (format: BuildFormat): Promise<number> => {
    const cli = runtime.buildExportDeps;
    if (cli === undefined) {
      runtime.io.err("export: internal-error — An unexpected internal error occurred.\n");
      return INTERNAL_ERROR_EXIT;
    }
    try {
      const result = await runExport(format, runtime.cwd, cli.export);
      cli.exportReporter.completed(result);
      return exitCodeForBuildExportOutcome(result.outcome);
    } catch {
      cli.exportReporter.internalError();
      return INTERNAL_ERROR_EXIT;
    }
  };

  // Presets: un solo adapter (reporter humano o JSON) por ejecución; una sola llamada al caso de uso;
  // outcome semántico → exit via `exitCodeForPresetOutcome`. En JSON, una excepción inesperada produce
  // un envelope de error interno PROPIO de presets en stderr (stdout vacío) con exit 70.
  async function runPresetsMode<R extends { readonly outcome: PresetExitOutcome }>(
    json: boolean,
    command: "preset-list" | "preset-inspect" | "preset-plan" | "preset-apply",
    run: (deps: PresetsCliDependencies) => Promise<R>,
    render: (deps: PresetsCliDependencies, result: R) => void,
  ): Promise<number> {
    const deps = runtime.presetsDeps;
    if (deps === undefined) {
      if (json) writePresetsInternalErrorJson(runtime.io, command);
      return INTERNAL_ERROR_EXIT;
    }
    if (!json) {
      const result = await run(deps);
      render(deps, result);
      return exitCodeForPresetOutcome(result.outcome);
    }
    try {
      const result = await run(deps);
      render(deps, result);
      return exitCodeForPresetOutcome(result.outcome);
    } catch {
      writePresetsInternalErrorJson(runtime.io, command);
      return INTERNAL_ERROR_EXIT;
    }
  }

  const { program, getCode } = createProgram({
    version: runtime.version,
    io: runtime.io,
    onInit: () => runInit(runtime.cwd, runtime.deps).then(exitCodeForResult),
    onValidate: ({ json }) => runValidateMode(json),
    onInspect: ({ json }) => runInspectMode(json),
    onFoundations: ({ json }) => runFoundationsMode(json),
    onBuild: ({ json }) => runBuildMode(json),
    onExport: (format) => runExportMode(format),
    onPresetsList: ({ json }) =>
      runPresetsMode(json, "preset-list", (d) => runPresetsList(d.base), (d, r) => (json ? d.json : d.terminal).listCompleted(r)),
    onPresetsInspect: (id, { json }) =>
      runPresetsMode(json, "preset-inspect", (d) => runPresetsInspect(id, d.base), (d, r) => (json ? d.json : d.terminal).inspectCompleted(r)),
    onPresetsPlan: (id, { json }) =>
      runPresetsMode(json, "preset-plan", (d) => runPresetsPlan(id, runtime.cwd, d.base), (d, r) => (json ? d.json : d.terminal).planCompleted(r)),
    onPresetsApply: (id, { json }) =>
      runPresetsMode(json, "preset-apply", (d) => runPresetsApply(id, runtime.cwd, d.base), (d, r) => (json ? d.json : d.terminal).applyCompleted(r)),
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
