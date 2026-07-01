// Helper de integración real para el Viewer (009, Checkpoint B): construye `ViewerSessionDependencies`
// REALES (snapshot reader de 006, catálogo de presets de 005, asset store de 007, lector de build
// manifest de 006) sobre un host temporal real. NO es un archivo de test.
import { join } from "node:path";
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { createBoundAnalyze } from "../../../src/cli/composition.js";
import { listPresets } from "../../../src/application/presets/list-presets.js";
import { createBundledPresetCatalog } from "../../../src/infrastructure/presets/bundled-preset-catalog.js";
import { listAssets } from "../../../src/application/assets/list-assets.js";
import { inspectAsset } from "../../../src/application/assets/inspect-asset.js";
import { createAssetStoreReader } from "../../../src/infrastructure/assets/asset-store-reader.js";
import { observeBuildOutput } from "../../../src/infrastructure/build-export/output-snapshot-reader.js";
import { createTokenSourceSnapshotReader } from "../../../src/infrastructure/token-mutations/source-snapshot-reader.js";
import { readBrandSource } from "../../../src/infrastructure/brand/brand-source-reader.js";
import { planTokenMutation } from "../../../src/application/token-mutations/plan-token-mutation.js";
import { serializeCandidate } from "../../../src/infrastructure/token-mutations/candidate-serializer.js";
import type { ViewerSessionDependencies } from "../../../src/application/viewer/ports.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";

export async function host(options: { readonly dirName?: string } = {}): Promise<HostProject> {
  return makeHostProject(options);
}

/** Cuenta invocaciones de cada puerto reusado, sin alterar su comportamiento real. */
export interface CallCounts {
  readBuildSnapshot: number;
  listPresets: number;
  listAssets: number;
  readBuildManifest: number;
}

export function realViewerDeps(rootDir: string, counts: CallCounts): ViewerSessionDependencies {
  const snapshotReader = createBuildSnapshotReader();
  const analyze = createBoundAnalyze();
  const assetStore = createAssetStoreReader(rootDir);
  const mutationSnapshot = createTokenSourceSnapshotReader();

  return {
    analyze,
    readBuildSnapshot: {
      read: async (input) => {
        counts.readBuildSnapshot += 1;
        return snapshotReader.read(input);
      },
    },
    listPresets: async () => {
      counts.listPresets += 1;
      return listPresets({ catalog: createBundledPresetCatalog() });
    },
    listAssets: async () => {
      counts.listAssets += 1;
      return listAssets({ store: assetStore });
    },
    inspectAsset: (input) => inspectAsset(input, { store: assetStore }),
    readBuildManifest: async () => {
      counts.readBuildManifest += 1;
      return (await observeBuildOutput(rootDir)).previousManifest;
    },
    readAnalyzedTokenSource: mutationSnapshot,
    planRenameMoveImpact: (command) => planTokenMutation({ executionDir: rootDir }, command, { snapshot: mutationSnapshot, serialize: serializeCandidate }),
    readBrandSource: () => readBrandSource(rootDir),
  };
}

export function newCallCounts(): CallCounts {
  return { readBuildSnapshot: 0, listPresets: 0, listAssets: 0, readBuildManifest: 0 };
}

export const TOKENS_REL = join("design-system", "tokens", "base.tokens.json");
