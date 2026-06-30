// T035 (007) — Caso de uso headless `applyAssetImport`. Recalcula el plan, escribe SOLO los candidatos
// `add` (SVG saneado, licencia exacta suministrada) y el manifest nuevo como CONJUNTO transaccional. Si
// el plan contiene candidatos `blocked`, no publica nada y reporta `conflict` (todo o nada). Idempotente.
import { ASSET_MANIFEST_FILENAME, ASSET_STORE_ROOT, serializeAssetManifestV1, type AssetManifestV1 } from "../../domain/assets/asset-manifest.js";
import { orderAssets } from "../../domain/assets/asset-order.js";
import type { AssetRecord } from "../../domain/assets/asset-record.js";
import type { AssetIssue, AssetRecoveryState } from "../../domain/assets/asset-outcome.js";
import { classifyAssetOwnership } from "./ownership.js";
import { decideUnchanged } from "./idempotency.js";
import { planAssetImport, type PlanAssetImportInput } from "./plan-asset-import.js";
import type {
  AssetProbesPort,
  AssetSetWriteResult,
  AssetSetWriterPort,
  AssetStorePort,
  AssetWriteFile,
  AssetWriteOperationResult,
} from "./asset-ports.js";

export interface ApplyAssetImportDependencies {
  readonly store: AssetStorePort;
  readonly probes: AssetProbesPort;
  readonly writer: AssetSetWriterPort;
}

const recovery = (r: AssetSetWriteResult): AssetRecoveryState => ({ storeAvailable: r.storeAvailable, backupRelativePath: r.backupRelativePath, recoveryRequired: r.recoveryRequired });

function mapWriterResult(r: AssetSetWriteResult, manifestSummary: AssetWriteOperationResult["manifestSummary"]): AssetWriteOperationResult {
  const outcome = r.outcome === "unsafe-target" ? "conflict" : r.outcome;
  return {
    outcome: outcome as AssetWriteOperationResult["outcome"],
    wrote: r.wrote,
    recovery: recovery(r),
    manifestSummary: r.wrote ? manifestSummary : null,
    conflicts: r.conflicts,
    error: r.error === null ? null : { code: r.error.code, message: r.error.message, path: null, details: null },
  };
}

export async function applyAssetImport(input: PlanAssetImportInput, deps: ApplyAssetImportDependencies): Promise<AssetWriteOperationResult> {
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

  const plan = await planAssetImport(input, { store: deps.store, probes: deps.probes });
  if (plan.outcome !== "planned" || plan.plan === null) {
    return { outcome: plan.outcome === "read-error" ? "read-error" : "invalid-asset-store", wrote: false, recovery: null, manifestSummary: null, conflicts: plan.conflicts, error: plan.error };
  }

  // Todo o nada: si hay candidatos bloqueados, no se publica nada.
  const blocked = plan.plan.candidates.filter((c) => c.verdict === "blocked");
  if (blocked.length > 0) {
    const conflicts: AssetIssue[] = blocked.flatMap((c) => c.issues.filter((i) => i.blocksWrite));
    return { outcome: "conflict", wrote: false, recovery: null, manifestSummary: null, conflicts, error: { code: "conflict", message: "El plan contiene candidatos bloqueados; no se publica nada.", path: null, details: null } };
  }

  // Construir writes y nuevo manifest desde los candidatos `add` (alineados por índice con las fuentes).
  const recordByPath = new Map<string, AssetRecord>(ownership.manifest ? ownership.manifest.assets.map((a) => [a.logicalPath, a]) : []);
  const writes: AssetWriteFile[] = [];
  plan.plan.candidates.forEach((candidate, i) => {
    if (candidate.verdict !== "add" || candidate.destinationPath === null || candidate.kind === null || candidate.mimeType === null) return;
    const source = input.sources[i];
    if (source === undefined) return;
    const effective = candidate.mimeType === "image/svg+xml" ? deps.probes.sanitizeSvg(source.bytes).bytes ?? source.bytes : source.bytes;
    writes.push({ logicalPath: candidate.destinationPath, bytes: effective, contentHash: candidate.contentHash, byteLength: candidate.byteLength });
    recordByPath.set(candidate.destinationPath, {
      logicalPath: candidate.destinationPath,
      kind: candidate.kind,
      mimeType: candidate.mimeType,
      byteLength: candidate.byteLength,
      contentHash: candidate.contentHash,
      dimensions: candidate.dimensions,
      provenance: { kind: "local-import", sourceRef: source.sourceRef },
      license: candidate.license,
    });
  });

  const manifestV1: AssetManifestV1 = { formatVersion: "1.0.0", assets: orderAssets([...recordByPath.values()]) };
  const manifestBytes = new TextEncoder().encode(serializeAssetManifestV1(manifestV1));
  const manifestHash = deps.probes.hash(manifestBytes);
  const manifestSummary = { relativePath: ASSET_MANIFEST_FILENAME, contentHash: manifestHash, byteLength: manifestBytes.byteLength };

  const priorAssetHashes: Record<string, string> = {};
  for (const s of observation.managedPathStates) if (s.state === "file" && s.contentHash !== null) priorAssetHashes[s.relativePath] = s.contentHash;
  const priorManifestHash = observation.manifestHash ?? null;

  const idempotency = decideUnchanged({
    priorManifestHash,
    desiredManifestHash: manifestHash,
    writes: writes.map((w) => ({ logicalPath: w.logicalPath, contentHash: w.contentHash })),
    deletes: [],
    onDisk: observation.managedPathStates,
  });
  if (idempotency.unchanged) {
    return { outcome: "unchanged", wrote: false, recovery: null, manifestSummary, conflicts: [], error: null };
  }

  const result = await deps.writer.write({
    storeRoot: ASSET_STORE_ROOT,
    operation: "apply",
    strategy: "candidate-directory-set-v1",
    writes,
    deletes: [],
    manifest: { bytes: manifestBytes, contentHash: manifestHash, byteLength: manifestBytes.byteLength },
    prior: { manifestHash: priorManifestHash, assetHashes: priorAssetHashes },
  });
  return mapWriterResult(result, manifestSummary);
}
