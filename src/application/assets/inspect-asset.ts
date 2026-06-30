// T020 (007) — Caso de uso headless `inspectAsset`. Inspección por logicalPath. Manifest no confiable →
// `invalid-asset-store`; path no administrado → `not-found`. Incluye dimensiones/provenance/license y el
// estado de ownership del path. Read-only.
import { classifyAssetOwnership } from "./ownership.js";
import type { AssetInspectResult, AssetStorePort, ManagedPathState } from "./asset-ports.js";

export interface InspectAssetInput {
  readonly logicalPath: string;
}

export interface InspectAssetDependencies {
  readonly store: AssetStorePort;
}

export async function inspectAsset(input: InspectAssetInput, deps: InspectAssetDependencies): Promise<AssetInspectResult> {
  let observation;
  try {
    observation = await deps.store.observe();
  } catch {
    return { outcome: "read-error", inspection: null, conflicts: [], error: { code: "read-error", message: "No se pudo leer el asset store.", path: null, details: null } };
  }

  const ownership = classifyAssetOwnership(observation);
  if (ownership.state === "untrusted-asset-manifest") {
    return { outcome: "invalid-asset-store", inspection: null, conflicts: ownership.conflicts, error: { code: "invalid-asset-store", message: "El manifest de assets no es confiable.", path: null, details: null } };
  }

  const record = ownership.manifest?.assets.find((a) => a.logicalPath === input.logicalPath) ?? null;
  if (record === null) {
    return { outcome: "not-found", inspection: null, conflicts: [], error: { code: "not-found", message: `Asset no administrado: ${input.logicalPath}.`, path: input.logicalPath, details: null } };
  }

  const pathState: ManagedPathState = observation.managedPathStates.find((s) => s.relativePath === record.logicalPath)?.state ?? "absent";
  const issues = ownership.conflicts.filter((c) => c.path === record.logicalPath);
  return { outcome: "inspected", inspection: { record, pathState, issues: Object.freeze(issues) }, conflicts: [], error: null };
}
