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
import type { ApplyPresetDependencies } from "../application/presets/preset-ports.js";
import { createBundledPresetCatalog } from "../infrastructure/presets/bundled-preset-catalog.js";
import { analyzePresetTokens } from "../infrastructure/presets/preset-token-analyzer.js";
import { createPresetTargetReader, createSingleFileAtomicWriter } from "../infrastructure/fs/single-file-atomic-writer.js";
import { PresetsTerminalReporter } from "../infrastructure/reporter/presets-terminal-reporter.js";
import { PresetsJsonReporter } from "../infrastructure/reporter/presets-json-reporter.js";
import type { BuildDesignSystemDependencies } from "../application/build-export/build-design-system.js";
import type { ExportDesignSystemArtifactDependencies } from "../application/build-export/export-design-system-artifact.js";
import { createBuildProjection } from "../application/build-export/create-build-projection.js";
import { buildBuildManifest } from "../application/build-export/manifest-builder.js";
import { classifyBuildOwnership } from "../application/build-export/ownership.js";
import { createBuildSnapshotReader } from "../infrastructure/build-export/snapshot-reader.js";
import { createBuildOutputInspector } from "../infrastructure/build-export/output-snapshot-reader.js";
import { createArtifactSetWriter } from "../infrastructure/build-export/artifact-set-writer.js";
import { createArtifactRenderers, rendererFor } from "../infrastructure/build-export/renderers.js";
import { serializeBuildManifestV1 } from "../infrastructure/build-export/json-renderer.js";
import { sha256Hex } from "../infrastructure/build-export/hash.js";
import { BuildTerminalReporter } from "../infrastructure/reporter/build-terminal-reporter.js";
import { BuildJsonReporter } from "../infrastructure/reporter/build-json-reporter.js";
import { ExportReporter, type ExportOutput } from "../infrastructure/reporter/export-error-reporter.js";
import { resolveHostRoot } from "../infrastructure/host-root/resolve-host-root.js";
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

// Feature 005 — presets. `base` es el superconjunto de dependencias de los casos de uso (list/inspect/
// plan/apply); cada caso de uso toma estructuralmente el subconjunto que necesita. El catálogo
// empaquetado, el target reader y el writer atómico se resuelven vía `import.meta.url` (sin cwd). El
// host se analiza con el MISMO `analyze` enlazado de `002`. Reporters humano y JSON construidos con io;
// el comando selecciona uno por ejecución (un único adapter activo).
export interface PresetsCliDependencies {
  readonly base: ApplyPresetDependencies;
  readonly terminal: PresetsTerminalReporter;
  readonly json: PresetsJsonReporter;
}

export function createPresetsDependencies(io: CliIO, analyze: AnalyzeUseCase): PresetsCliDependencies {
  return {
    base: {
      catalog: createBundledPresetCatalog(),
      analyzeTokens: analyzePresetTokens,
      analyzeHost: analyze,
      targetReader: createPresetTargetReader(),
      writer: createSingleFileAtomicWriter(),
    },
    terminal: new PresetsTerminalReporter(io),
    json: new PresetsJsonReporter(io),
  };
}

// Feature 006 — build/export. `build` publica el conjunto completo a `design-system/build/` con writer
// transaccional; `export` es read-only (solo bytes a stdout). El output dir, el inspector y el writer se
// anclan a la raíz del host resuelta desde `cwd` (no al cwd directo); si no se resuelve, el caso de uso
// devuelve `not-found` antes de tocar inspector/writer. Un único reporter activo por ejecución.
export interface BuildExportCliDependencies {
  readonly build: BuildDesignSystemDependencies;
  readonly export: ExportDesignSystemArtifactDependencies;
  readonly buildTerminal: BuildTerminalReporter;
  readonly buildJson: BuildJsonReporter;
  readonly exportReporter: ExportReporter;
}

export function createBuildExportDependencies(io: CliIO, exportOutput: ExportOutput, cwd: string): BuildExportCliDependencies {
  const resolution = resolveHostRoot(cwd);
  const rootDir = resolution.ok ? resolution.hostRoot.rootDir : cwd;
  const snapshotReader = createBuildSnapshotReader();
  return {
    build: {
      snapshotReader,
      createProjection: createBuildProjection,
      renderers: createArtifactRenderers(),
      buildManifest: buildBuildManifest,
      serializeManifest: serializeBuildManifestV1,
      hashBytes: sha256Hex,
      outputInspector: createBuildOutputInspector(rootDir),
      classifyOwnership: classifyBuildOwnership,
      writer: createArtifactSetWriter(rootDir),
    },
    export: {
      snapshotReader,
      createProjection: createBuildProjection,
      rendererFor,
    },
    buildTerminal: new BuildTerminalReporter(io),
    buildJson: new BuildJsonReporter(io),
    exportReporter: new ExportReporter(exportOutput),
  };
}
