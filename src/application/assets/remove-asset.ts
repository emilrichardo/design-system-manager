// T036 (007) — Caso de uso headless `removeAsset`. Elimina un asset administrado (archivo + entrada del
// manifest) como CONJUNTO transaccional. Rechaza paths no poseídos por el manifest (`not-found`), sin
// tocar el filesystem. Nunca elimina contenido desconocido.
import { ASSET_MANIFEST_FILENAME, ASSET_STORE_ROOT, serializeAssetManifestV1, type AssetManifestV1 } from "../../domain/assets/asset-manifest.js";
import { orderAssets } from "../../domain/assets/asset-order.js";
import type { AssetRecoveryState } from "../../domain/assets/asset-outcome.js";
import { classifyAssetOwnership } from "./ownership.js";
import type { AssetProbesPort, AssetSetWriteResult, AssetSetWriterPort, AssetStorePort, AssetWriteOperationResult } from "./asset-ports.js";

export interface RemoveAssetInput {
  readonly logicalPath: string;
}

export interface RemoveAssetDependencies {
  readonly store: AssetStorePort;
  readonly probes: AssetProbesPort;
  readonly writer: AssetSetWriterPort;
}

const recovery = (r: AssetSetWriteResult): AssetRecoveryState => ({ storeAvailable: r.storeAvailable, backupRelativePath: r.backupRelativePath, recoveryRequired: r.recoveryRequired });

export async function removeAsset(input: RemoveAssetInput, deps: RemoveAssetDependencies): Promise<AssetWriteOperationResult> {
  let observation;
  try {
    observation = await deps.store.observe();
  } catch {
    return { outcome: "read-error", wrote: false, recovery: null, manifestSummary: null, conflicts: [], error: { code: "read-error", message: "No se pudo leer el asset store.", path: null, details: null } };
  }

  const ownership = classifyAssetOwnership(observation);
  if (ownership.state === "untrusted-asset-manifest") {
    return { outcome: "invalid-asset-store", wrote: false, recovery: null, manifestSummary: null, conflicts: ownership.conflicts, error: { code: "invalid-asset-store", message: "El manifest de assets no es confiable.", path: null, details: null } };
  }

  const existing = ownership.manifest?.assets ?? [];
  const target = existing.find((a) => a.logicalPath === input.logicalPath) ?? null;
  if (target === null) {
    // Solo se eliminan assets administrados; un path no poseído por el manifest se rechaza sin tocar nada.
    return { outcome: "not-found", wrote: false, recovery: null, manifestSummary: null, conflicts: [], error: { code: "not-found", message: `Asset no administrado: ${input.logicalPath}.`, path: input.logicalPath, details: null } };
  }

  const manifestV1: AssetManifestV1 = { formatVersion: "1.0.0", assets: orderAssets(existing.filter((a) => a.logicalPath !== input.logicalPath)) };
  const manifestBytes = new TextEncoder().encode(serializeAssetManifestV1(manifestV1));
  const manifestHash = deps.probes.hash(manifestBytes);
  const manifestSummary = { relativePath: ASSET_MANIFEST_FILENAME, contentHash: manifestHash, byteLength: manifestBytes.byteLength };

  const priorAssetHashes: Record<string, string> = {};
  for (const s of observation.managedPathStates) if (s.state === "file" && s.contentHash !== null) priorAssetHashes[s.relativePath] = s.contentHash;

  const result = await deps.writer.write({
    storeRoot: ASSET_STORE_ROOT,
    operation: "remove",
    strategy: "candidate-directory-set-v1",
    writes: [],
    deletes: [input.logicalPath],
    manifest: { bytes: manifestBytes, contentHash: manifestHash, byteLength: manifestBytes.byteLength },
    prior: { manifestHash: observation.manifestHash ?? null, assetHashes: priorAssetHashes },
  });

  const outcome = result.outcome === "unsafe-target" ? "conflict" : result.outcome;
  return {
    outcome: outcome as AssetWriteOperationResult["outcome"],
    wrote: result.wrote,
    recovery: recovery(result),
    manifestSummary: result.wrote ? manifestSummary : null,
    conflicts: result.conflicts,
    error: result.error === null ? null : { code: result.error.code, message: result.error.message, path: null, details: null },
  };
}
