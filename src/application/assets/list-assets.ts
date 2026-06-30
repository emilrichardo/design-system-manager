// T019 (007) — Caso de uso headless `listAssets`. Listado determinista desde el manifest. Manifest
// ausente → conjunto vacío válido (`listed`); manifest no confiable → `invalid-asset-store`. Read-only.
import { ASSET_KINDS, type AssetKind } from "../../domain/assets/asset-kind.js";
import { orderAssets } from "../../domain/assets/asset-order.js";
import type { AssetRecord } from "../../domain/assets/asset-record.js";
import { classifyAssetOwnership } from "./ownership.js";
import type { AssetListResult, AssetStorePort, AssetsSummary } from "./asset-ports.js";

const EMPTY_SUMMARY: AssetsSummary = Object.freeze({
  totalAssets: 0,
  byKind: Object.freeze(Object.fromEntries(ASSET_KINDS.map((k) => [k, 0])) as Record<AssetKind, number>),
  totalByteLength: 0,
});

function summarize(assets: readonly AssetRecord[]): AssetsSummary {
  const byKind = Object.fromEntries(ASSET_KINDS.map((k) => [k, 0])) as Record<AssetKind, number>;
  let totalByteLength = 0;
  for (const a of assets) {
    byKind[a.kind] += 1;
    totalByteLength += a.byteLength;
  }
  return Object.freeze({ totalAssets: assets.length, byKind: Object.freeze(byKind), totalByteLength });
}

export interface ListAssetsDependencies {
  readonly store: AssetStorePort;
}

export async function listAssets(deps: ListAssetsDependencies): Promise<AssetListResult> {
  let observation;
  try {
    observation = await deps.store.observe();
  } catch {
    return { outcome: "read-error", assets: [], summary: EMPTY_SUMMARY, conflicts: [], error: { code: "read-error", message: "No se pudo leer el asset store.", path: null, details: null } };
  }

  const ownership = classifyAssetOwnership(observation);
  if (ownership.state === "untrusted-asset-manifest") {
    return {
      outcome: "invalid-asset-store",
      assets: [],
      summary: EMPTY_SUMMARY,
      conflicts: ownership.conflicts,
      error: { code: "invalid-asset-store", message: "El manifest de assets no es confiable.", path: null, details: null },
    };
  }

  const assets = ownership.manifest ? orderAssets(ownership.manifest.assets) : [];
  return { outcome: "listed", assets: Object.freeze(assets), summary: summarize(assets), conflicts: ownership.conflicts, error: null };
}
