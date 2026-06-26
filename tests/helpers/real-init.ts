// Nivel A — Ejecuta initializeDesignSystem con dependencias REALES de infraestructura
// (resolver/clasificador/preparador/validadores/writer) + ScriptedPrompter + RecordingReporter,
// sobre un filesystem real. Interacción sin TTY mediante respuestas programadas.
import type {
  FileSystem,
  IdentityAnswers,
  InitializeDependencies,
  PromptOutcome,
  TransactionResult,
} from "../../src/application/ports.js";
import { initializeDesignSystem } from "../../src/application/initialize-design-system.js";
import { exitCodeForResult } from "../../src/cli/exit-codes.js";
import {
  documentPreparer,
  documentValidators,
  hostRootResolver,
  stateClassifier,
  transactionalWriter,
} from "../../src/infrastructure/initialize-adapters.js";
import { commitTransaction } from "../../src/infrastructure/fs/transactional-writer.js";
import { nodeFileSystem } from "../../src/infrastructure/fs/node-file-system.js";
import { RecordingReporter, ScriptedPrompter, sampleAnswers } from "./in-memory-adapters.js";

export interface RealInitOptions {
  identity?: PromptOutcome<IdentityAnswers>;
  confirm?: PromptOutcome<boolean>;
  /** Sustituye el FileSystem del writer (p. ej. faultyFs) manteniendo commitTransaction real. */
  fileSystem?: FileSystem;
}

export interface RealInitRun {
  result: Awaited<ReturnType<typeof initializeDesignSystem>>;
  exitCode: number;
  prompter: ScriptedPrompter;
  reporter: RecordingReporter;
}

export async function runRealInit(executionDir: string, opts: RealInitOptions = {}): Promise<RealInitRun> {
  const prompter = new ScriptedPrompter(
    opts.identity ?? { kind: "answered", value: sampleAnswers },
    opts.confirm ?? { kind: "answered", value: true },
  );
  const reporter = new RecordingReporter();
  const writer = opts.fileSystem
    ? { commit: (root: string, prepared: readonly { relativePath: string; content: string }[]): Promise<TransactionResult> => commitTransaction(opts.fileSystem!, root, prepared) }
    : transactionalWriter;

  const deps: InitializeDependencies = {
    resolver: hostRootResolver,
    classifier: stateClassifier,
    preparer: documentPreparer,
    validators: documentValidators,
    writer,
    prompter,
    reporter,
  };
  const result = await initializeDesignSystem({ executionDir }, deps);
  return { result, exitCode: exitCodeForResult(result), prompter, reporter };
}

export { nodeFileSystem };

import { createIdentity } from "../../src/domain/identity/design-system-identity.js";
import { prepareFiles } from "../../src/infrastructure/serialization/prepare-files.js";
import type { PreparedFile } from "../../src/application/ports.js";

/** Los tres documentos válidos (serializados) para el `sampleAnswers`. */
export function samplePrepared(): readonly PreparedFile[] {
  const id = createIdentity({
    name: sampleAnswers.name,
    slug: sampleAnswers.slug,
    description: sampleAnswers.description,
    version: sampleAnswers.version,
  });
  if (!id.ok) throw new Error("identidad de muestra inválida");
  return prepareFiles(id.value);
}
