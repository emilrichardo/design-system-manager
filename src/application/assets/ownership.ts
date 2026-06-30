// T021 (007) — Clasificación de ownership del asset store (puro). Autoridad = manifest. Manifest ausente
// → `empty` (conjunto vacío válido). Manifest ilegible o no válido → `untrusted-asset-manifest`
// (bloquea). Manifest válido → `trusted`; los nodos desconocidos se PRESERVAN (no bloquean lectura) y un
// path administrado que dejó de ser archivo se reporta como issue.
import { validateAssetManifestV1, type AssetManifestV1 } from "../../domain/assets/asset-manifest.js";
import type { AssetIssue } from "../../domain/assets/asset-outcome.js";
import type { AssetOwnership, AssetStoreObservation } from "./asset-ports.js";

function issue(code: AssetIssue["code"], path: string | null, severity: AssetIssue["severity"], message: string, blocksWrite: boolean): AssetIssue {
  return Object.freeze({ code, path, severity, message, blocksWrite });
}

export interface OwnershipClassification extends AssetOwnership {
  /** Manifest validado cuando el estado es `trusted`/`empty`; `null` si no es confiable. */
  readonly manifest: AssetManifestV1 | null;
}

/** Clasifica el ownership a partir de la observación del store. */
export function classifyAssetOwnership(observation: AssetStoreObservation): OwnershipClassification {
  const m = observation.manifest;
  if (m.state === "absent") {
    return { state: "empty", conflicts: [], manifest: null };
  }
  if (m.state === "unreadable") {
    return {
      state: "untrusted-asset-manifest",
      conflicts: [issue("untrusted-asset-manifest", null, "error", "El manifest de assets no es legible.", true)],
      manifest: null,
    };
  }
  const validation = validateAssetManifestV1(m.value);
  if (!validation.ok) {
    return {
      state: "untrusted-asset-manifest",
      conflicts: [issue("untrusted-asset-manifest", null, "error", `El manifest de assets no es válido: ${validation.reason}.`, true)],
      manifest: null,
    };
  }

  // Manifest válido: trusted. Reportar (sin bloquear lectura) paths administrados que no son archivos.
  const stateByPath = new Map(observation.managedPathStates.map((s) => [s.relativePath, s.state]));
  const conflicts: AssetIssue[] = [];
  for (const record of validation.manifest.assets) {
    const state = stateByPath.get(record.logicalPath) ?? "absent";
    if (state === "absent") {
      conflicts.push(issue("asset-missing", record.logicalPath, "warning", `Asset administrado ausente en disco: ${record.logicalPath}.`, false));
    } else if (state === "symlink" || state === "dir" || state === "other") {
      conflicts.push(issue("owned-by-unknown", record.logicalPath, "error", `El path administrado ${record.logicalPath} no es un archivo regular (${state}).`, true));
    }
  }
  return { state: "trusted", conflicts: Object.freeze(conflicts), manifest: validation.manifest };
}
