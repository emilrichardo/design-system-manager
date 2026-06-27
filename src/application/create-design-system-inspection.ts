// T032 (helper) — Proyección pura DesignSystemAnalysis → DesignSystemInspection. No muta el análisis,
// no accede al filesystem, no recalcula presencia/estadísticas, no limita paths (conserva todos los
// nodos). Reutiliza el `ValidationReport` canónico (una sola instancia lógica dentro de inspect).
import type { DesignSystemAnalysis } from "../domain/analysis/design-system-analysis.js";
import type {
  DesignSystemInspection,
  FileInspection,
  InspectedIdentity,
  InspectedSchemaVersions,
  TokensInspection,
} from "../domain/analysis/design-system-inspection.js";
import type { InspectedValue } from "../domain/analysis/inspected-value.js";
import { recovered, unavailable, untrusted, valid } from "../domain/analysis/inspected-value.js";
import { MANAGED_FILES } from "../domain/plan/managed-files.js";
import { createValidationReport } from "./create-validation-report.js";

const ORDER: readonly string[] = [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Confianza de un campo string: untrusted si un error del documento apunta a ese campo; si no, hereda. */
function inspectField(
  obj: Record<string, unknown>,
  key: string,
  docTrust: "valid" | "recovered",
  fieldAffected: boolean,
): InspectedValue<string> {
  const v = obj[key];
  if (typeof v !== "string") return unavailable;
  if (fieldAffected) return untrusted(v);
  return docTrust === "valid" ? valid(v) : recovered(v);
}

export function createDesignSystemInspection(analysis: DesignSystemAnalysis): DesignSystemInspection {
  const validation = createValidationReport(analysis);

  // ── Identidad (desde el manifiesto parseado) ────────────────────────────────────────────────
  const mdoc = analysis.documents[MANAGED_FILES.manifest];
  let identity: InspectedIdentity | undefined;
  const mrec = mdoc?.parsed !== undefined ? asRecord(mdoc.parsed) : null;
  if (mdoc !== undefined && mrec !== null && mdoc.trust !== "unavailable") {
    const docTrust = mdoc.trust;
    const affected = (key: string): boolean =>
      analysis.errors.some((e) => e.document === "manifest" && (e.path === `manifest.${key}` || e.path === key));
    const base: { -readonly [K in keyof InspectedIdentity]?: InspectedIdentity[K] } = {
      name: inspectField(mrec, "name", docTrust, affected("name")),
      slug: inspectField(mrec, "slug", docTrust, affected("slug")),
      version: inspectField(mrec, "version", docTrust, affected("version")),
    };
    if (typeof mrec.description === "string") base.description = inspectField(mrec, "description", docTrust, affected("description"));
    identity = base as InspectedIdentity;
  }

  // ── Versiones de schema (config + manifest) ─────────────────────────────────────────────────
  const cdoc = analysis.documents[MANAGED_FILES.config];
  const crec = cdoc?.parsed !== undefined ? asRecord(cdoc.parsed) : null;
  const schema: { -readonly [K in keyof InspectedSchemaVersions]?: InspectedSchemaVersions[K] } = {};
  if (cdoc !== undefined && crec !== null && cdoc.trust !== "unavailable" && typeof crec.configSchemaVersion === "string") {
    schema.config = cdoc.trust === "valid" ? valid(crec.configSchemaVersion) : recovered(crec.configSchemaVersion);
  }
  if (mdoc !== undefined && mrec !== null && mdoc.trust !== "unavailable" && typeof mrec.manifestSchemaVersion === "string") {
    schema.manifest = mdoc.trust === "valid" ? valid(mrec.manifestSchemaVersion) : recovered(mrec.manifestSchemaVersion);
  }
  if (cdoc !== undefined && crec !== null && cdoc.trust !== "unavailable" && typeof crec.formatVersion === "string") {
    schema.formatVersion = cdoc.trust === "valid" ? valid(crec.formatVersion) : recovered(crec.formatVersion);
  }
  const schemaVersions = Object.keys(schema).length > 0 ? (schema as InspectedSchemaVersions) : undefined;

  // ── Archivos (sin tocar el filesystem; desde presencia/documentos) ───────────────────────────
  const present: FileInspection[] = [];
  const missing: string[] = [];
  for (const rel of ORDER) {
    const doc = analysis.documents[rel];
    if (doc !== undefined && doc.exists) {
      present.push({ relativePath: rel, kind: doc.kind, readable: doc.kind === "file" });
    } else {
      missing.push(rel);
    }
  }

  // ── Tokens (sin recorrer de nuevo; conserva todos los nodos) ─────────────────────────────────
  const tdoc = analysis.documents[MANAGED_FILES.tokens];
  let tokens: TokensInspection | undefined;
  if (tdoc !== undefined && tdoc.trust !== "unavailable") {
    tokens = {
      ...analysis.statistics,
      byType: { ...analysis.statistics.byType },
      paths: [...analysis.nodes],
    };
  }

  return {
    host: analysis.host,
    structuralState: analysis.structuralState,
    ...(identity !== undefined ? { identity } : {}),
    ...(schemaVersions !== undefined ? { schemaVersions } : {}),
    files: { expected: [...ORDER], present, missing },
    ...(tokens !== undefined ? { tokens } : {}),
    validation,
    limits: analysis.limits,
  };
}
