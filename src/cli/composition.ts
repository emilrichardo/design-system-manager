// Composition root de la CLI: ensambla los casos de uso con adapters reales de infraestructura.
// Sin contenedor de DI, sin singletons mutables. Una sola factory de análisis enlazada para 002.
import type { InitializeDependencies } from "../application/ports.js";
import type {
  AnalyzeDesignSystemInput,
  AnalyzeUseCase,
  InspectDesignSystemDependencies,
  ValidateDesignSystemDependencies,
} from "../application/analysis-ports.js";
import type { InspectFoundationsDependencies } from "../application/foundations/foundations-ports.js";
import { analyzeExistingDesignSystem } from "../application/analyze-existing-design-system.js";
import {
  documentPreparer,
  documentValidators,
  hostRootResolver,
  stateClassifier,
  transactionalWriter,
} from "../infrastructure/initialize-adapters.js";
import { nodeFileSystem } from "../infrastructure/fs/node-file-system.js";
import { inspectPresence } from "../infrastructure/host-root/inspect-presence.js";
import { createManagedDocumentReader } from "../infrastructure/analysis/managed-document-reader.js";
import { createDtcgAnalyzer } from "../infrastructure/analysis/dtcg-read-validator.js";
import { ClackPrompter } from "../infrastructure/prompts/clack-prompter.js";
import { TerminalReporter } from "../infrastructure/reporter/terminal-reporter.js";
import { ValidateTerminalReporter } from "../infrastructure/reporter/validate-terminal-reporter.js";
import { InspectTerminalReporter } from "../infrastructure/reporter/inspect-terminal-reporter.js";
import { ValidateJsonReporter } from "../infrastructure/reporter/validate-json-reporter.js";
import { InspectJsonReporter } from "../infrastructure/reporter/inspect-json-reporter.js";
import { FoundationsTerminalReporter } from "../infrastructure/reporter/foundations-terminal-reporter.js";
import { FoundationsJsonReporter } from "../infrastructure/reporter/foundations-json-reporter.js";
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

/**
 * Tubería de análisis ENLAZADA a sus adapters reales (un único reader y un único analyzer por
 * ejecución). Compartida por `validate` e `inspect`: no hay doble lectura/parseo/recorrido.
 */
export function createBoundAnalyze(): AnalyzeUseCase {
  const documentReader = createManagedDocumentReader({ fileSystem: nodeFileSystem });
  const dtcgAnalyzer = createDtcgAnalyzer();
  return (input: AnalyzeDesignSystemInput) =>
    analyzeExistingDesignSystem(input, {
      hostRootResolver,
      presenceInspector: { inspectPresence },
      documentReader,
      documentValidators,
      dtcgAnalyzer,
    });
}

export function createValidateDependencies(io: CliIO, analyze: AnalyzeUseCase): ValidateDesignSystemDependencies {
  return { analyze, reporter: new ValidateTerminalReporter(io) };
}

export function createInspectDependencies(io: CliIO, analyze: AnalyzeUseCase): InspectDesignSystemDependencies {
  return { analyze, reporter: new InspectTerminalReporter(io) };
}

// Feature 003 — variantes de presentación JSON. Mismo `analyze` enlazado (sin segundo análisis):
// solo cambia el reporter (un único adapter activo por ejecución).
export function createValidateJsonDependencies(io: CliIO, analyze: AnalyzeUseCase): ValidateDesignSystemDependencies {
  return { analyze, reporter: new ValidateJsonReporter(io) };
}

export function createInspectJsonDependencies(io: CliIO, analyze: AnalyzeUseCase): InspectDesignSystemDependencies {
  return { analyze, reporter: new InspectJsonReporter(io) };
}

// Feature 004 - foundations reutiliza la misma tuberia de analisis enlazada; solo cambia el reporter.
export function createFoundationsDependencies(io: CliIO, analyze: AnalyzeUseCase): InspectFoundationsDependencies {
  return { analyze, reporter: new FoundationsTerminalReporter(io) };
}

export function createFoundationsJsonDependencies(io: CliIO, analyze: AnalyzeUseCase): InspectFoundationsDependencies {
  return { analyze, reporter: new FoundationsJsonReporter(io) };
}
