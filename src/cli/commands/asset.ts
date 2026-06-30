// T044 (007) — Acciones del comando `asset` (adapter delgado). Delegan en los casos de uso headless del
// Asset Manager. La lectura de bytes de las fuentes locales y la derivación de kind/destino son
// responsabilidad de la CLI (capa adapter); el resto vive en aplicación/dominio.
import { readFile } from "node:fs/promises";
import { basename, isAbsolute, resolve } from "node:path";
import type { AssetKind } from "../../domain/assets/asset-kind.js";
import { listAssets } from "../../application/assets/list-assets.js";
import { inspectAsset } from "../../application/assets/inspect-asset.js";
import { planAssetImport } from "../../application/assets/plan-asset-import.js";
import { applyAssetImport } from "../../application/assets/apply-asset-import.js";
import { removeAsset } from "../../application/assets/remove-asset.js";
import type {
  AssetInspectResult,
  AssetListResult,
  AssetPlanResult,
  AssetProbesPort,
  AssetSetWriterPort,
  AssetStorePort,
  AssetWriteOperationResult,
  ImportSource,
} from "../../application/assets/asset-ports.js";

export interface AssetUseCaseDependencies {
  readonly store: AssetStorePort;
  readonly probes: AssetProbesPort;
  readonly writer: AssetSetWriterPort;
}

const DEST_DIR: Readonly<Record<AssetKind, string>> = { font: "fonts", logo: "logos", svg: "svg", icon: "icons", image: "images" };

/** Deriva kind/destino desde el MIME detectado (font→font, svg→svg, raster→image). */
function deriveKind(probes: AssetProbesPort, bytes: Uint8Array): AssetKind {
  const mime = probes.detectMime(bytes);
  if (mime === null) return "image"; // el plan lo bloqueará como unsupported-mime
  if (mime.startsWith("font/")) return "font";
  if (mime === "image/svg+xml") return "svg";
  return "image";
}

/** Lee las fuentes locales y construye `ImportSource[]` (bytes + kind + destino lógico seguro). */
export async function readImportSources(filePaths: readonly string[], cwd: string, probes: AssetProbesPort, license?: { identifier?: string | null; notice?: string | null }): Promise<ImportSource[]> {
  const sources: ImportSource[] = [];
  for (const p of filePaths) {
    const abs = isAbsolute(p) ? p : resolve(cwd, p);
    const bytes = new Uint8Array(await readFile(abs));
    const kind = deriveKind(probes, bytes);
    const name = basename(p);
    const source: ImportSource = { sourceRef: name, bytes, kind, destinationPath: `${DEST_DIR[kind]}/${name}` };
    sources.push(license ? { ...source, license } : source);
  }
  return sources;
}

export function runAssetList(deps: AssetUseCaseDependencies): Promise<AssetListResult> {
  return listAssets({ store: deps.store });
}

export function runAssetInspect(logicalPath: string, deps: AssetUseCaseDependencies): Promise<AssetInspectResult> {
  return inspectAsset({ logicalPath }, { store: deps.store });
}

export function runAssetImportPlan(sources: readonly ImportSource[], deps: AssetUseCaseDependencies): Promise<AssetPlanResult> {
  return planAssetImport({ sources }, { store: deps.store, probes: deps.probes });
}

export function runAssetImportApply(sources: readonly ImportSource[], deps: AssetUseCaseDependencies): Promise<AssetWriteOperationResult> {
  return applyAssetImport({ sources }, { store: deps.store, probes: deps.probes, writer: deps.writer });
}

export function runAssetRemove(logicalPath: string, deps: AssetUseCaseDependencies): Promise<AssetWriteOperationResult> {
  return removeAsset({ logicalPath }, { store: deps.store, probes: deps.probes, writer: deps.writer });
}
