// T022 (007) — DTO público y mappers de `AssetJsonEnvelopeV1`. Contrato INDEPENDIENTE del envelope de
// `003` (no lo extiende ni lo modifica). Solo datos seguros y paths lógicos; null policy estricta.
import type { AssetIssue, AssetOutcome, SafeAssetError } from "../../../domain/assets/asset-outcome.js";
import type { AssetRecord } from "../../../domain/assets/asset-record.js";
import type { AssetInspectResult, AssetListResult, AssetPlanResult, AssetsSummary, ImportCandidate } from "../asset-ports.js";

export const ASSET_JSON_FORMAT_VERSION = "1.0.0";

export type AssetJsonCommand = "asset-list" | "asset-inspect" | "asset-plan";
export type AssetJsonOutcome = AssetOutcome | "internal-error";

export interface AssetJsonIssueV1 {
  readonly code: string;
  readonly path: string | null;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly blocksWrite: boolean;
}

export interface AssetJsonRecordV1 {
  readonly logicalPath: string;
  readonly kind: string;
  readonly mimeType: string;
  readonly byteLength: number;
  readonly contentHash: string;
  readonly dimensions: { readonly width: number | null; readonly height: number | null; readonly unit: string | null } | null;
  readonly provenance: { readonly kind: string; readonly sourceRef: string };
  readonly license: { readonly status: string; readonly identifier: string | null; readonly notice: string | null };
}

export interface AssetJsonEnvelopeV1 {
  readonly formatVersion: typeof ASSET_JSON_FORMAT_VERSION;
  readonly command: AssetJsonCommand;
  readonly outcome: AssetJsonOutcome;
  readonly result: Readonly<Record<string, unknown>> | null;
  readonly error: { readonly code: string; readonly message: string; readonly path: string | null } | null;
}

function mapRecord(r: AssetRecord): AssetJsonRecordV1 {
  return {
    logicalPath: r.logicalPath,
    kind: r.kind,
    mimeType: r.mimeType,
    byteLength: r.byteLength,
    contentHash: r.contentHash,
    dimensions: r.dimensions === null ? null : { width: r.dimensions.width, height: r.dimensions.height, unit: r.dimensions.unit },
    provenance: { kind: r.provenance.kind, sourceRef: r.provenance.sourceRef },
    license: { status: r.license.status, identifier: r.license.identifier, notice: r.license.notice },
  };
}

function mapIssue(i: AssetIssue): AssetJsonIssueV1 {
  return { code: i.code, path: i.path, severity: i.severity, message: i.message, blocksWrite: i.blocksWrite };
}

function mapError(e: SafeAssetError | null): AssetJsonEnvelopeV1["error"] {
  return e === null ? null : { code: e.code, message: e.message, path: e.path };
}

function mapSummary(s: AssetsSummary): Record<string, unknown> {
  return { totalAssets: s.totalAssets, byKind: s.byKind, totalByteLength: s.totalByteLength };
}

export function mapListResultToJsonEnvelope(result: AssetListResult): AssetJsonEnvelopeV1 {
  return {
    formatVersion: ASSET_JSON_FORMAT_VERSION,
    command: "asset-list",
    outcome: result.outcome,
    result:
      result.outcome === "listed"
        ? { assets: result.assets.map(mapRecord), summary: mapSummary(result.summary), conflicts: result.conflicts.map(mapIssue) }
        : null,
    error: mapError(result.error),
  };
}

export function mapInspectResultToJsonEnvelope(result: AssetInspectResult): AssetJsonEnvelopeV1 {
  return {
    formatVersion: ASSET_JSON_FORMAT_VERSION,
    command: "asset-inspect",
    outcome: result.outcome,
    result:
      result.outcome === "inspected" && result.inspection !== null
        ? { record: mapRecord(result.inspection.record), pathState: result.inspection.pathState, issues: result.inspection.issues.map(mapIssue) }
        : null,
    error: mapError(result.error),
  };
}

function mapCandidate(c: ImportCandidate): Record<string, unknown> {
  return {
    sourceRef: c.sourceRef,
    kind: c.kind,
    destinationPath: c.destinationPath,
    mimeType: c.mimeType,
    byteLength: c.byteLength,
    contentHash: c.contentHash,
    dimensions: c.dimensions,
    verdict: c.verdict,
    duplicateOf: c.duplicateOf,
    license: { status: c.license.status, identifier: c.license.identifier, notice: c.license.notice },
    validation: c.validation,
    sanitization: c.sanitization,
    issues: c.issues.map(mapIssue),
  };
}

export function mapPlanResultToJsonEnvelope(result: AssetPlanResult): AssetJsonEnvelopeV1 {
  return {
    formatVersion: ASSET_JSON_FORMAT_VERSION,
    command: "asset-plan",
    outcome: result.outcome,
    result: result.outcome === "planned" && result.plan !== null ? { candidates: result.plan.candidates.map(mapCandidate), summary: result.plan.summary } : null,
    error: mapError(result.error),
  };
}

export function assetInternalErrorEnvelope(command: AssetJsonCommand): AssetJsonEnvelopeV1 {
  return {
    formatVersion: ASSET_JSON_FORMAT_VERSION,
    command,
    outcome: "internal-error",
    result: null,
    error: { code: "internal-error", message: "An unexpected internal error occurred.", path: null },
  };
}
