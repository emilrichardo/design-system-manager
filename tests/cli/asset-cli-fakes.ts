// Helper de tests CLI del Asset Manager (007, Checkpoint F): ensambla `AssetCliDependencies` reales
// (store/probes/writer) sobre un rootDir temporal, con reporters sobre buffers. NO es un archivo de test.
import { createAssetStoreReader } from "../../src/infrastructure/assets/asset-store-reader.js";
import { createAssetSetWriter } from "../../src/infrastructure/assets/asset-set-writer.js";
import { AssetsTerminalReporter } from "../../src/infrastructure/reporter/assets-terminal-reporter.js";
import { AssetsJsonReporter } from "../../src/infrastructure/reporter/assets-json-reporter.js";
import { realProbes } from "../integration/assets/asset-store-fixtures.js";
import { bufferIO, type BufferIO } from "../infrastructure/reporter/build-reporter-fixtures.js";
import type { AssetCliDependencies } from "../../src/cli/composition.js";

export interface AssetCliHarness {
  readonly deps: AssetCliDependencies;
  readonly io: BufferIO;
}

export function makeAssetCli(rootDir: string): AssetCliHarness {
  const io = bufferIO();
  const deps: AssetCliDependencies = {
    base: { store: createAssetStoreReader(rootDir), probes: realProbes, writer: createAssetSetWriter(rootDir) },
    probes: realProbes,
    terminal: new AssetsTerminalReporter(io),
    json: new AssetsJsonReporter(io),
  };
  return { deps, io };
}
