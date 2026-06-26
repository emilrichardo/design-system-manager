// Composition root de la CLI: ensambla el caso de uso con adapters reales de infraestructura
// + ClackPrompter + TerminalReporter. Sin contenedor de DI, sin singletons mutables.
import type { InitializeDependencies } from "../application/ports.js";
import {
  documentPreparer,
  documentValidators,
  hostRootResolver,
  stateClassifier,
  transactionalWriter,
} from "../infrastructure/initialize-adapters.js";
import { ClackPrompter } from "../infrastructure/prompts/clack-prompter.js";
import { TerminalReporter } from "../infrastructure/reporter/terminal-reporter.js";
import type { CliIO } from "./io.js";

export function createRealDependencies(io: CliIO): InitializeDependencies {
  return {
    resolver: hostRootResolver,
    classifier: stateClassifier,
    preparer: documentPreparer,
    validators: documentValidators,
    writer: transactionalWriter,
    prompter: new ClackPrompter(),
    reporter: new TerminalReporter(io),
  };
}
