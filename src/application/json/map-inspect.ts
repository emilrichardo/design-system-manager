// T011 (003) — Mapper puro `InspectDesignSystemResult` → `JsonInspectEnvelopeV1`. Recibe la
// inspección YA calculada por `inspectDesignSystem`; NO analiza, NO resuelve host, NO lee fs, NO
// recalcula estadísticas, NO resuelve aliases/tipos, NO reordena, NO escribe streams. Conserva TODOS
// los token paths: **no** conoce `MAX_INSPECT_TERMINAL_TOKEN_ROWS` (esa cota es solo del reporter
// textual). `not-found` → `result: null`, `error: null`. Switch exhaustivo (ADR-0011/0013).
import type { InspectDesignSystemResult } from "../analysis-ports.js";
import type {
  DesignSystemInspection,
  InspectedFiles,
  InspectedIdentity,
  InspectedSchemaVersions,
  TokensInspection,
} from "../../domain/analysis/design-system-inspection.js";
import type { TokenNodeSummary } from "../../domain/analysis/token-node-summary.js";
import { JSON_FORMAT_VERSION } from "./format-version.js";
import type {
  JsonFilesV1,
  JsonIdentityV1,
  JsonInspectEnvelopeV1,
  JsonInspectResultV1,
  JsonSchemaVersionsV1,
  JsonTokenNodeV1,
  JsonTokensV1,
} from "./dto.js";
import { toJsonHost, toJsonLimits } from "./map-common.js";
import { toJsonInspectedValue } from "./map-inspected-value.js";
import { toJsonValidation } from "./map-validation.js";

// ── Helpers internos puros (no exportados; no forman parte de la API pública) ──────────────────────

function mapIdentity(identity: InspectedIdentity | undefined): JsonIdentityV1 | null {
  if (identity === undefined) return null;
  return {
    name: toJsonInspectedValue(identity.name),
    slug: toJsonInspectedValue(identity.slug),
    version: toJsonInspectedValue(identity.version),
    description: toJsonInspectedValue(identity.description),
  };
}

function mapSchemaVersions(
  schemaVersions: InspectedSchemaVersions | undefined,
): JsonSchemaVersionsV1 | null {
  if (schemaVersions === undefined) return null;
  return {
    config: toJsonInspectedValue(schemaVersions.config),
    manifest: toJsonInspectedValue(schemaVersions.manifest),
    formatVersion: toJsonInspectedValue(schemaVersions.formatVersion),
  };
}

function mapFiles(files: InspectedFiles): JsonFilesV1 {
  return {
    expected: [...files.expected],
    present: files.present.map((file) => ({
      relativePath: file.relativePath,
      kind: file.kind,
      sizeBytes: file.sizeBytes ?? null, // deuda conocida: el pipeline no propaga el tamaño (v1 → null)
      readable: file.readable,
    })),
    missing: [...files.missing],
  };
}

function mapTokenNode(node: TokenNodeSummary): JsonTokenNodeV1 {
  return {
    path: node.path,
    declaredType: node.declaredType,
    effectiveType: node.effectiveType,
    typeOrigin: node.typeOrigin,
    typeSourcePath: node.typeSourcePath,
    kind: node.kind,
    aliasTarget: node.aliasTarget,
    aliasState: node.aliasState,
    description: node.description,
    depth: node.depth,
    trust: node.trust,
  };
}

function mapTokens(tokens: TokensInspection | undefined): JsonTokensV1 | null {
  if (tokens === undefined) return null;
  return {
    total: tokens.total,
    groups: tokens.groups,
    concreteValues: tokens.concreteValues,
    aliases: tokens.aliases,
    byType: { ...tokens.byType },
    maxDepth: tokens.maxDepth,
    aliasIssues: tokens.aliasIssues,
    paths: tokens.paths.map(mapTokenNode), // TODOS los nodos; sin cota de presentación
  };
}

function mapInspectionResult(
  host: JsonInspectResultV1["host"],
  inspection: DesignSystemInspection,
): JsonInspectResultV1 {
  return {
    host,
    structuralState: inspection.structuralState,
    identity: mapIdentity(inspection.identity),
    schemaVersions: mapSchemaVersions(inspection.schemaVersions),
    files: mapFiles(inspection.files),
    tokens: mapTokens(inspection.tokens),
    validation: toJsonValidation(inspection.validation),
    limits: toJsonLimits(inspection.limits),
  };
}

/** Proyecta el resultado público de inspect al envelope JSON v1. */
export function toJsonInspectEnvelope(
  result: InspectDesignSystemResult,
): JsonInspectEnvelopeV1 {
  switch (result.outcome) {
    case "valid":
    case "complete-invalid":
    case "partial":
    case "read-error":
      return {
        formatVersion: JSON_FORMAT_VERSION,
        command: "inspect",
        outcome: result.outcome,
        result: mapInspectionResult(toJsonHost(result.host), result.inspection),
      };
    case "not-found":
      return {
        formatVersion: JSON_FORMAT_VERSION,
        command: "inspect",
        outcome: "not-found",
        result: null,
        error: null, // `hostError` reservado, no poblado en v1
      };
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
