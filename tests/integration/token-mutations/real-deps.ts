// Helper de integración real para mutaciones de tokens (008, Checkpoint D): dependencias REALES
// (snapshot reader que reusa `002`/`004`/`006`, serializer canónico, writer transaccional single-file)
// sobre un proyecto temporal inicializado por `init`. NO es un archivo de test.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTokenSourceSnapshotReader } from "../../../src/infrastructure/token-mutations/source-snapshot-reader.js";
import { serializeCandidate } from "../../../src/infrastructure/token-mutations/candidate-serializer.js";
import { createTokenSourceWriter } from "../../../src/infrastructure/token-mutations/token-source-writer.js";
import type { ApplyTokenMutationDependencies } from "../../../src/application/token-mutations/apply-token-mutation.js";
import type { PlanTokenMutationDependencies } from "../../../src/application/token-mutations/plan-token-mutation.js";
import type { WriterFileSystem } from "../../../src/infrastructure/build-export/artifact-set-writer.js";
import { runRealInit } from "../../helpers/real-init.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";

export const TOKENS_REL = "design-system/tokens/base.tokens.json";

export function realPlanDeps(): PlanTokenMutationDependencies {
  return { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate };
}

/** `fs` inyectable para fault injection (reusa el seam `WriterFileSystem` de `006`). */
export function realApplyDeps(fs?: WriterFileSystem): ApplyTokenMutationDependencies {
  return { ...realPlanDeps(), createWriter: (rootDir: string) => createTokenSourceWriter(rootDir, fs) };
}

/** Crea un proyecto temporal real inicializado (mismo fixture que `001-ds-init`). */
export async function seedInitializedProject(): Promise<TmpProject> {
  const project = await createTmpProject();
  const run = await runRealInit(project.dir);
  if (run.result.status !== "created") throw new Error(`init falló al sembrar el fixture: ${run.result.status}`);
  return project;
}

export async function readTokens(project: TmpProject): Promise<unknown> {
  return JSON.parse(await readFile(join(project.dir, TOKENS_REL), "utf8")) as unknown;
}

export async function writeTokens(project: TmpProject, doc: unknown): Promise<void> {
  await writeFile(join(project.dir, TOKENS_REL), `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}
