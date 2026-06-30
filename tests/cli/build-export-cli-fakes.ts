// Helpers de tests CLI de build/export (006, Checkpoint L): ensambla `BuildExportCliDependencies` con
// fakes contables (writer/inspector) y reporters sobre buffers. NO es un archivo de test.
import { fakeSnapshotReader, buildDeps, countingInspector, countingWriter, EMPTY_INSPECTION, PUBLISHED_WRITE } from "../application/build-export/build-export-fakes.js";
import { createBuildProjection } from "../../src/application/build-export/create-build-projection.js";
import { rendererFor } from "../../src/infrastructure/build-export/renderers.js";
import { BuildTerminalReporter } from "../../src/infrastructure/reporter/build-terminal-reporter.js";
import { BuildJsonReporter } from "../../src/infrastructure/reporter/build-json-reporter.js";
import { ExportReporter } from "../../src/infrastructure/reporter/export-error-reporter.js";
import type { BuildExportCliDependencies } from "../../src/cli/composition.js";
import type { BuildDesignSystemDependencies } from "../../src/application/build-export/build-design-system.js";
import type { AnalyzedSourceSnapshot, ArtifactSetWriteResult, BuildOutputInspection, SourceSnapshotResult } from "../../src/application/build-export/build-ports.js";
import type { CountingInspector, CountingWriter } from "../application/build-export/build-export-fakes.js";
import { bufferExportOutput, bufferIO, type BufferExportOutput, type BufferIO } from "../infrastructure/reporter/build-reporter-fixtures.js";

export interface MakeBuildExportCliOptions {
  readonly writeResult?: ArtifactSetWriteResult;
  readonly inspection?: BuildOutputInspection;
  /** Sobrescribe dependencias del caso de uso `build` (snapshotReader, createProjection, renderers, …). */
  readonly buildOverrides?: Partial<BuildDesignSystemDependencies> & { renderers?: BuildDesignSystemDependencies["renderers"] };
  /** Resultado del snapshot reader que ve `export` (por defecto el snapshot listo dado). */
  readonly exportSnapshotResult?: SourceSnapshotResult;
}

export interface BuildExportCliHarness {
  readonly deps: BuildExportCliDependencies;
  readonly io: BufferIO;
  readonly exportOut: BufferExportOutput;
  readonly writer: CountingWriter;
  readonly inspector: CountingInspector;
}

export function makeBuildExportCli(snapshot: AnalyzedSourceSnapshot, options: MakeBuildExportCliOptions = {}): BuildExportCliHarness {
  const io = bufferIO();
  const exportOut = bufferExportOutput();
  const writer = countingWriter(options.writeResult ?? PUBLISHED_WRITE);
  const inspector = countingInspector(options.inspection ?? EMPTY_INSPECTION);
  const build = buildDeps(snapshot, { writer, outputInspector: inspector, ...options.buildOverrides });
  const deps: BuildExportCliDependencies = {
    build,
    export: {
      snapshotReader: fakeSnapshotReader(options.exportSnapshotResult ?? { outcome: "ready", snapshot }),
      createProjection: createBuildProjection,
      rendererFor,
    },
    buildTerminal: new BuildTerminalReporter(io),
    buildJson: new BuildJsonReporter(io),
    exportReporter: new ExportReporter(exportOut),
  };
  return { deps, io, exportOut, writer, inspector };
}
