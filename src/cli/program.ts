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
import type { AssetCliDependencies, BuildExportCliDependencies, PresetsCliDependencies, TokenCliDependencies } from "./composition.js";
import type { ViewerSessionDependencies } from "../application/viewer/ports.js";
import type { CliIO } from "./io.js";
import {
  exitCodeForAssetOutcome,
  exitCodeForBuildExportOutcome,
  exitCodeForResult,
  exitCodeForOutcome,
  exitCodeForPresetOutcome,
  exitCodeForTokenMutationOutcome,
  exitCodeForViewerState,
  INTERNAL_ERROR_EXIT,
  USAGE_ERROR_EXIT,
} from "./exit-codes.js";
import type { PresetExitOutcome } from "./exit-codes.js";
import { writeInternalErrorJson, writePresetsInternalErrorJson, writeTokenMutationInternalErrorJson } from "./json-error.js";
import { toFoundationsInternalErrorEnvelope } from "../application/foundations/json/map-internal-error.js";
import { serializeFoundationsJsonV1 } from "../infrastructure/reporter/foundations-json-serializer.js";
import { BuildTerminalReporter } from "../infrastructure/reporter/build-terminal-reporter.js";
import { BuildJsonReporter } from "../infrastructure/reporter/build-json-reporter.js";
import type { BuildFormat } from "../domain/build-export/build-format.js";
import type { TokenMutationCommandV1 } from "../domain/token-mutations/command.js";
import type { TokenMutationResultV1 } from "../domain/token-mutations/result.js";
import { runInit } from "./commands/init.js";
import { runValidate } from "./commands/validate.js";
import { runInspect } from "./commands/inspect.js";
import { runFoundations } from "./commands/foundations.js";
import { runBuild } from "./commands/build.js";
import { runExport } from "./commands/export.js";
import { readImportSources, runAssetImportApply, runAssetImportPlan, runAssetInspect, runAssetList, runAssetRemove } from "./commands/asset.js";
import { runPresetsApply, runPresetsInspect, runPresetsList, runPresetsPlan } from "./commands/presets.js";
import {
  parseValueFlag,
  readTokenMutationCommandFile,
  runTokenApply,
  runTokenPlan,
  singleOperationCommand,
  TokenCommandFileError,
} from "./commands/token.js";
import { runViewServer, runViewSession, type EditorServerDependencies } from "./commands/view.js";
import { toViewerSessionJsonEnvelope } from "../application/viewer/json/map-viewer.js";

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
  onAssetList: (opts: CommandModeOptions) => Promise<number>;
  onAssetInspect: (logicalPath: string, opts: CommandModeOptions) => Promise<number>;
  onAssetImportPlan: (sources: readonly string[], opts: CommandModeOptions) => Promise<number>;
  onAssetImportApply: (sources: readonly string[], opts: { readonly license?: string }) => Promise<number>;
  onAssetRemove: (logicalPath: string) => Promise<number>;
  onPresetsList: (opts: CommandModeOptions) => Promise<number>;
  onPresetsInspect: (id: string, opts: CommandModeOptions) => Promise<number>;
  onPresetsPlan: (id: string, opts: CommandModeOptions) => Promise<number>;
  onPresetsApply: (id: string, opts: CommandModeOptions) => Promise<number>;
  onTokenPlan: (file: string, opts: CommandModeOptions) => Promise<number>;
  onTokenApply: (file: string, opts: CommandModeOptions) => Promise<number>;
  onTokenCreate: (path: string, opts: { readonly type: string; readonly value: string }) => Promise<number>;
  onTokenUpdate: (path: string, value: string) => Promise<number>;
  onTokenRename: (path: string, newName: string) => Promise<number>;
  onTokenMove: (path: string, newParent: string) => Promise<number>;
  onTokenRemove: (path: string) => Promise<number>;
  onView: (opts: { readonly port?: number; readonly json: boolean }) => Promise<number>;
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

  // T044 (007) — grupo `asset`: list/inspect/import(plan|apply)/remove. `--json` local en read/plan;
  // `import apply` acepta `--license`. Assets separados de tokens. Sin flags fuera de alcance.
  const asset = program.command("asset").description("Administra assets locales (fonts, logos, SVG, icons, images) separados de los tokens.");
  asset.exitOverride();

  const assetList = asset.command("list").description("Lista los assets administrados.").option("--json", JSON_FLAG_DESCRIPTION, false);
  assetList.exitOverride();
  assetList.action(async (options: { json?: boolean }) => {
    state.code = await handlers.onAssetList({ json: options.json === true });
  });

  const assetInspect = asset.command("inspect <path>").description("Inspecciona un asset administrado por su path lógico.").option("--json", JSON_FLAG_DESCRIPTION, false);
  assetInspect.exitOverride();
  assetInspect.action(async (path: string, options: { json?: boolean }) => {
    state.code = await handlers.onAssetInspect(path, { json: options.json === true });
  });

  const assetImport = asset.command("import").description("Importa assets locales: `plan` (preview) o `apply` (escribe).");
  assetImport.exitOverride();

  const assetPlan = assetImport.command("plan <sources...>").description("Previsualiza la importación (NO escribe).").option("--json", JSON_FLAG_DESCRIPTION, false);
  assetPlan.exitOverride();
  assetPlan.action(async (sources: string[], options: { json?: boolean }) => {
    state.code = await handlers.onAssetImportPlan(sources, { json: options.json === true });
  });

  const assetApply = assetImport.command("apply <sources...>").description("Aplica la importación (escritura transaccional).").option("--license <id>", "Identificador de licencia explícito del asset.");
  assetApply.exitOverride();
  assetApply.action(async (sources: string[], options: { license?: string }) => {
    state.code = await handlers.onAssetImportApply(sources, options.license === undefined ? {} : { license: options.license });
  });

  const assetRemove = asset.command("remove <path>").description("Elimina un asset administrado (transaccional, ownership-bound).");
  assetRemove.exitOverride();
  assetRemove.action(async (path: string) => {
    state.code = await handlers.onAssetRemove(path);
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

  // T037 (008) — grupo `token`: `plan`/`apply` (archivo declarativo `--file`, `--json` local) +
  // shorthands `create/update/rename/move/remove` (una sola operación, escritura directa; sin `--json`,
  // sin `--force`). Mutan exclusivamente `design-system/tokens/base.tokens.json`.
  const token = program
    .command("token")
    .description("Aplica mutaciones estructuradas y seguras sobre design-system/tokens/base.tokens.json.");
  token.exitOverride();

  const tokenPlan = token
    .command("plan")
    .description("Previsualiza una mutación desde un archivo de comando declarativo (NO escribe).")
    .requiredOption("--file <path>", "Archivo TokenMutationCommandV1 (JSON).")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  tokenPlan.exitOverride();
  tokenPlan.action(async (options: { file: string; json?: boolean }) => {
    state.code = await handlers.onTokenPlan(options.file, { json: options.json === true });
  });

  const tokenApply = token
    .command("apply")
    .description("Aplica una mutación desde un archivo de comando declarativo (escritura transaccional).")
    .requiredOption("--file <path>", "Archivo TokenMutationCommandV1 (JSON).")
    .option("--json", JSON_FLAG_DESCRIPTION, false);
  tokenApply.exitOverride();
  tokenApply.action(async (options: { file: string; json?: boolean }) => {
    state.code = await handlers.onTokenApply(options.file, { json: options.json === true });
  });

  const tokenCreate = token
    .command("create <path>")
    .description("Crea un token (shorthand de una operación; escribe directamente).")
    .requiredOption("--type <type>", "Tipo DTCG declarado del token.")
    .requiredOption("--value <value>", "Valor DTCG (JSON o literal).");
  tokenCreate.exitOverride();
  tokenCreate.action(async (path: string, options: { type: string; value: string }) => {
    state.code = await handlers.onTokenCreate(path, options);
  });

  const tokenUpdate = token
    .command("update <path>")
    .description("Actualiza el valor de un token (shorthand; escribe directamente).")
    .requiredOption("--value <value>", "Nuevo valor DTCG (JSON o literal).");
  tokenUpdate.exitOverride();
  tokenUpdate.action(async (path: string, options: { value: string }) => {
    state.code = await handlers.onTokenUpdate(path, options.value);
  });

  const tokenRename = token
    .command("rename <path> <newName>")
    .description("Renombra un token (shorthand); reescribe toda referencia afectada.");
  tokenRename.exitOverride();
  tokenRename.action(async (path: string, newName: string) => {
    state.code = await handlers.onTokenRename(path, newName);
  });

  const tokenMove = token
    .command("move <path> <newParent>")
    .description("Mueve un token a otro grupo (shorthand); reescribe toda referencia afectada.");
  tokenMove.exitOverride();
  tokenMove.action(async (path: string, newParent: string) => {
    state.code = await handlers.onTokenMove(path, newParent);
  });

  const tokenRemove = token
    .command("remove <path>")
    .description("Elimina un token (shorthand); bloquea si tiene dependientes.");
  tokenRemove.exitOverride();
  tokenRemove.action(async (path: string) => {
    state.code = await handlers.onTokenRemove(path);
  });

  // T023 (009) — `view`: sin `--json`, arranca el servidor local de solo lectura (nunca abre navegador);
  // con `--json`, imprime la sesión (`ViewerJsonEnvelopeV1`) sin abrir servidor. Sin flags fuera de alcance.
  const view = program
    .command("view")
    .description("Abre el Design System Viewer local (solo lectura).")
    .option("--port <n>", "Puerto local (por defecto: efímero, asignado por el SO).")
    .option("--json", "Imprime la sesión como JSON sin abrir servidor.", false);
  view.exitOverride();
  view.action(async (options: { port?: string; json?: boolean }) => {
    const json = options.json === true;
    state.code = options.port === undefined ? await handlers.onView({ json }) : await handlers.onView({ port: Number(options.port), json });
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
  /** Dependencias del grupo `asset` (use cases + reporters humano/JSON). Opcional para pruebas de 001. */
  assetDeps?: AssetCliDependencies;
  /** Dependencias del grupo `token` (casos de uso headless + reporters humano/JSON). Opcional para pruebas de 001. */
  tokenDeps?: TokenCliDependencies;
  /** Dependencias de `view` (sesión headless del Viewer sobre `002`–`008`). Opcional para pruebas de 001. */
  viewDeps?: ViewerSessionDependencies;
  /** Dependencias del modo Editor de `view` (010). Opcional: sin ellas, `view` sigue siendo solo-lectura. */
  editorServerDeps?: EditorServerDependencies;
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

  // Asset Manager: un solo adapter (reporter humano o JSON) por ejecución; una sola llamada al caso de
  // uso; outcome → exit via `exitCodeForAssetOutcome`. `internal-error` (adapter) → 70.
  // read/plan tienen variante JSON; apply/remove son solo humanos (escrituras).
  async function runAssetOp(
    command: "asset-list" | "asset-inspect" | "asset-plan",
    json: boolean,
    run: (deps: AssetCliDependencies) => Promise<{ readonly outcome: string }>,
    renderHuman: (deps: AssetCliDependencies, result: never) => void,
    renderJson: (deps: AssetCliDependencies, result: never) => void,
  ): Promise<number> {
    const deps = runtime.assetDeps;
    if (deps === undefined) {
      runtime.io.err("Asset: internal-error — An unexpected internal error occurred.\n");
      return INTERNAL_ERROR_EXIT;
    }
    try {
      const result = await run(deps);
      (json ? renderJson : renderHuman)(deps, result as never);
      return exitCodeForAssetOutcome(result.outcome as Parameters<typeof exitCodeForAssetOutcome>[0]);
    } catch {
      if (json) deps.json.internalError(command);
      else deps.terminal.internalError();
      return INTERNAL_ERROR_EXIT;
    }
  }

  async function runAssetWrite(run: (deps: AssetCliDependencies) => Promise<{ readonly outcome: string }>): Promise<number> {
    const deps = runtime.assetDeps;
    if (deps === undefined) {
      runtime.io.err("Asset: internal-error — An unexpected internal error occurred.\n");
      return INTERNAL_ERROR_EXIT;
    }
    try {
      const result = await run(deps);
      deps.terminal.writeCompleted(result as never);
      return exitCodeForAssetOutcome(result.outcome as Parameters<typeof exitCodeForAssetOutcome>[0]);
    } catch {
      deps.terminal.internalError();
      return INTERNAL_ERROR_EXIT;
    }
  }

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

  // Token mutations: un solo adapter (reporter humano o JSON) por ejecución; una sola llamada al caso de
  // uso headless (`plan`/`apply` ya reciben el `TokenMutationCommandV1` armado); outcome → exit via
  // `exitCodeForTokenMutationOutcome`. `internal-error` (adapter) → 70 con reporter propio; un error de
  // FORMA del `--file` (no-JSON, forma inesperada) es un error de uso (exit 3), nunca `internal-error`.
  async function runTokenReadMode(
    file: string,
    json: boolean,
    command: "token-plan" | "token-apply",
    run: (deps: TokenCliDependencies, cmd: TokenMutationCommandV1) => Promise<TokenMutationResultV1>,
    render: (deps: TokenCliDependencies, result: TokenMutationResultV1) => void,
  ): Promise<number> {
    const deps = runtime.tokenDeps;
    if (deps === undefined) {
      if (json) writeTokenMutationInternalErrorJson(runtime.io, command);
      else runtime.io.err("token: internal-error — Ocurrió un error interno.\n");
      return INTERNAL_ERROR_EXIT;
    }
    let mutationCommand: TokenMutationCommandV1;
    try {
      mutationCommand = await readTokenMutationCommandFile(file, runtime.cwd);
    } catch (e) {
      const message = e instanceof TokenCommandFileError ? e.message : "No se pudo leer el archivo de comando.";
      runtime.io.err(`token ${command === "token-plan" ? "plan" : "apply"}: ${message}\n`);
      return USAGE_ERROR_EXIT;
    }
    try {
      const result = await run(deps, mutationCommand);
      render(deps, result);
      return exitCodeForTokenMutationOutcome(result.outcome);
    } catch {
      if (json) deps.json.internalError(command);
      else deps.terminal.internalError();
      return INTERNAL_ERROR_EXIT;
    }
  }

  async function runTokenShorthand(op: Parameters<typeof singleOperationCommand>[0]): Promise<number> {
    const deps = runtime.tokenDeps;
    if (deps === undefined) {
      runtime.io.err("token: internal-error — Ocurrió un error interno.\n");
      return INTERNAL_ERROR_EXIT;
    }
    try {
      const result = await runTokenApply(runtime.cwd, singleOperationCommand(op), deps.apply);
      deps.terminal.applyCompleted(result);
      return exitCodeForTokenMutationOutcome(result.outcome);
    } catch {
      deps.terminal.internalError();
      return INTERNAL_ERROR_EXIT;
    }
  }

  // Viewer: `--json` es de solo lectura (una sola sesión, sin servidor); sin `--json`, arranca el
  // servidor local (nunca abre navegador). Una excepción inesperada → `internal-error`/70.
  async function runViewMode(opts: { readonly port?: number; readonly json: boolean }): Promise<number> {
    const deps = runtime.viewDeps;
    if (deps === undefined) {
      if (opts.json) runtime.io.err(`${JSON.stringify({ formatVersion: "1.0.0", section: "session", state: "internal-error", data: null }, null, 2)}\n`);
      else runtime.io.err("view: internal-error — Ocurrió un error interno.\n");
      return INTERNAL_ERROR_EXIT;
    }
    if (opts.json) {
      try {
        const session = await runViewSession(runtime.cwd, deps);
        runtime.io.out(`${JSON.stringify(toViewerSessionJsonEnvelope(session), null, 2)}\n`);
        return exitCodeForViewerState(session.state);
      } catch {
        runtime.io.err(`${JSON.stringify({ formatVersion: "1.0.0", section: "session", state: "internal-error", data: null }, null, 2)}\n`);
        return INTERNAL_ERROR_EXIT;
      }
    }
    try {
      const handle = await runViewServer(runtime.cwd, deps, opts.port, runtime.editorServerDeps);
      runtime.io.out(`Viewer listening at http://127.0.0.1:${handle.port}/\n`);
      return 0;
    } catch {
      runtime.io.err("view: internal-error — Ocurrió un error interno.\n");
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
    onAssetList: ({ json }) =>
      runAssetOp("asset-list", json, (d) => runAssetList(d.base), (d, r) => d.terminal.listCompleted(r), (d, r) => d.json.listCompleted(r)),
    onAssetInspect: (path, { json }) =>
      runAssetOp("asset-inspect", json, (d) => runAssetInspect(path, d.base), (d, r) => d.terminal.inspectCompleted(r), (d, r) => d.json.inspectCompleted(r)),
    onAssetImportPlan: (sources, { json }) =>
      runAssetOp(
        "asset-plan",
        json,
        async (d) => runAssetImportPlan(await readImportSources(sources, runtime.cwd, d.probes), d.base),
        (d, r) => d.terminal.planCompleted(r),
        (d, r) => d.json.planCompleted(r),
      ),
    onAssetImportApply: (sources, { license }) =>
      runAssetWrite(async (d) => runAssetImportApply(await readImportSources(sources, runtime.cwd, d.probes, license === undefined ? undefined : { identifier: license }), d.base)),
    onAssetRemove: (path) => runAssetWrite((d) => runAssetRemove(path, d.base)),
    onPresetsList: ({ json }) =>
      runPresetsMode(json, "preset-list", (d) => runPresetsList(d.base), (d, r) => (json ? d.json : d.terminal).listCompleted(r)),
    onPresetsInspect: (id, { json }) =>
      runPresetsMode(json, "preset-inspect", (d) => runPresetsInspect(id, d.base), (d, r) => (json ? d.json : d.terminal).inspectCompleted(r)),
    onPresetsPlan: (id, { json }) =>
      runPresetsMode(json, "preset-plan", (d) => runPresetsPlan(id, runtime.cwd, d.base), (d, r) => (json ? d.json : d.terminal).planCompleted(r)),
    onPresetsApply: (id, { json }) =>
      runPresetsMode(json, "preset-apply", (d) => runPresetsApply(id, runtime.cwd, d.base), (d, r) => (json ? d.json : d.terminal).applyCompleted(r)),
    onTokenPlan: (file, { json }) =>
      runTokenReadMode(file, json, "token-plan", (d, cmd) => runTokenPlan(runtime.cwd, cmd, d.plan), (d, r) => (json ? d.json : d.terminal).planCompleted(r)),
    onTokenApply: (file, { json }) =>
      runTokenReadMode(file, json, "token-apply", (d, cmd) => runTokenApply(runtime.cwd, cmd, d.apply), (d, r) => (json ? d.json : d.terminal).applyCompleted(r)),
    onTokenCreate: (path, { type, value }) => runTokenShorthand({ kind: "create-token", path, type, value: parseValueFlag(value) }),
    onTokenUpdate: (path, value) => runTokenShorthand({ kind: "update-value", path, value: parseValueFlag(value) }),
    onTokenRename: (path, newName) => runTokenShorthand({ kind: "rename-token", path, newName }),
    onTokenMove: (path, newParent) => runTokenShorthand({ kind: "move-token", path, newParent }),
    onTokenRemove: (path) => runTokenShorthand({ kind: "remove-token", path }),
    onView: (opts) => runViewMode(opts),
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
