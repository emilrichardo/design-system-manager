// Composición de los puertos de aplicación con las implementaciones reales de infraestructura.
// La CLI (Fase 7) añade los puertos de interacción (Prompter/Reporter). Aquí no hay terminal.
import type {
  DocumentPreparer,
  HostRootResolver,
  StateClassifier,
  TransactionalWriter,
} from "../application/ports.js";
import { resolveHostRoot } from "./host-root/resolve-host-root.js";
import { classifyState } from "./host-root/classify-state.js";
import { prepareFiles } from "./serialization/prepare-files.js";
import { commitTransaction } from "./fs/transactional-writer.js";
import { nodeFileSystem } from "./fs/node-file-system.js";
import { documentValidators } from "./validation/schema-validators.js";

export const hostRootResolver: HostRootResolver = { resolve: resolveHostRoot };
export const stateClassifier: StateClassifier = { classify: classifyState };
export const documentPreparer: DocumentPreparer = { prepare: prepareFiles };
export const transactionalWriter: TransactionalWriter = {
  commit: (rootDir, prepared) => commitTransaction(nodeFileSystem, rootDir, prepared),
};

export { documentValidators };
