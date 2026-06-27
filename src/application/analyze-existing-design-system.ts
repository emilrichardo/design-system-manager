// T029/T030 — Tubería compartida de análisis (ÚNICO productor de DesignSystemAnalysis). Capa de
// aplicación: orquesta puertos, NO usa node:fs/path/Commander/Clack/consola/exit codes y NO escribe.
// Una sola pasada: 1 resolución de host, 1 presencia, ≤1 lectura/parseo por documento, 1 recorrido
// DTCG. Reutiliza puertos de `001` (resolver, presencia, validadores config/manifest) y de `002`
// (ManagedDocumentReader, DtcgAnalyzer). La proyección a ValidationReport/Inspection es Fase 7.
import type { Issue } from "../domain/issue.js";
import type { AnalysisIssue, ManagedDocument } from "../domain/analysis/analysis-issue.js";
import { analysisError, analysisWarning } from "../domain/analysis/analysis-issue.js";
import type { StructuralState } from "../domain/analysis/structural-state.js";
import type { FileKind } from "../domain/analysis/file-kind.js";
import type { TokenNodeSummary } from "../domain/analysis/token-node-summary.js";
import type { InspectionStatistics } from "../domain/analysis/inspection-statistics.js";
import { emptyStatistics } from "../domain/analysis/inspection-statistics.js";
import type { AnalysisLimitHit, AnalysisLimitsResult } from "../domain/traversal/limits.js";
import { ANALYSIS_LIMITS, analysisLimitsResult } from "../domain/traversal/limits.js";
import type { DesignSystemAnalysis, DocumentTrust, ParsedDocument } from "../domain/analysis/design-system-analysis.js";
import { DESIGN_SYSTEM_DIR, MANAGED_FILES, TOKENS_DIR } from "../domain/plan/managed-files.js";
import type {
  AnalyzeDesignSystemDependencies,
  AnalyzeDesignSystemInput,
  ManagedDocumentReadResult,
  ReadableManagedDocument,
} from "./analysis-ports.js";

/** Límites combinados (recorrido + bytes). Inyectables en tests; por defecto ANALYSIS_LIMITS. */
export type PipelineLimits = typeof ANALYSIS_LIMITS;

const DOC_ORDER: readonly ReadableManagedDocument[] = ["config", "manifest", "tokens"];
const REL: Readonly<Record<ReadableManagedDocument, string>> = {
  config: MANAGED_FILES.config,
  manifest: MANAGED_FILES.manifest,
  tokens: MANAGED_FILES.tokens,
};

function toAnalysisIssue(issue: Issue, document: ManagedDocument): AnalysisIssue {
  return analysisError(issue.code, issue.message, issue.path === undefined ? { document } : { document, path: issue.path });
}

const READ_FAIL_CODE: Record<Exclude<ManagedDocumentReadResult, { ok: true }>["reason"], string> = {
  absent: "read-absent",
  "not-regular-file": "read-not-regular-file",
  "too-large": "limit-file-size-exceeded",
  "outside-root": "read-outside-root",
  "symlink-external": "read-symlink-external",
  "invalid-encoding": "read-invalid-encoding",
  "read-failed": "read-failed",
};

/**
 * Productor canónico del análisis. `limits` es inyectable para tests (presupuesto de bytes y límites
 * de recorrido); en producción usa ANALYSIS_LIMITS.
 */
export async function analyzeExistingDesignSystem(
  input: AnalyzeDesignSystemInput,
  deps: AnalyzeDesignSystemDependencies,
  limits: PipelineLimits = ANALYSIS_LIMITS,
): Promise<DesignSystemAnalysis> {
  const errors: AnalysisIssue[] = [];
  const warnings: AnalysisIssue[] = [];
  const hits: AnalysisLimitHit[] = [];
  const hitKinds = new Set<string>();
  let issuesCapped = false;

  const recordHit = (limit: AnalysisLimitHit["limit"], detail: string): void => {
    if (!hitKinds.has(limit)) {
      hitKinds.add(limit);
      hits.push({ limit, detail });
    }
  };
  const pushError = (issue: AnalysisIssue): void => {
    if (issuesCapped) return;
    if (errors.length + warnings.length >= limits.maxIssues - 1) {
      errors.push(analysisError("limit-issues-exceeded", `Se alcanzó el máximo de ${limits.maxIssues} issues.`, { document: "structure" }));
      recordHit("issues", `> ${limits.maxIssues}`);
      issuesCapped = true;
      return;
    }
    errors.push(issue);
  };
  const pushWarning = (issue: AnalysisIssue): void => {
    if (issuesCapped) return;
    if (errors.length + warnings.length >= limits.maxIssues - 1) {
      errors.push(analysisError("limit-issues-exceeded", `Se alcanzó el máximo de ${limits.maxIssues} issues.`, { document: "structure" }));
      recordHit("issues", `> ${limits.maxIssues}`);
      issuesCapped = true;
      return;
    }
    warnings.push(issue);
  };

  // ── 1. Host ──────────────────────────────────────────────────────────────────────────────────
  const resolution = deps.hostRootResolver.resolve(input.executionDir);
  if (!resolution.ok) {
    pushError(analysisError(`host-${resolution.error.code}`, resolution.error.message, { document: "host", ...(resolution.error.path !== undefined ? { path: resolution.error.path } : {}) }));
    return {
      host: { root: input.executionDir, designSystemPath: null },
      presence: { present: [], missing: [REL.config, REL.manifest, REL.tokens] },
      structuralState: "not-initialized",
      documents: {},
      nodes: [],
      statistics: emptyStatistics,
      errors,
      warnings,
      limits: analysisLimitsResult(hits),
      valid: false,
    };
  }
  const rootDir = resolution.hostRoot.rootDir;

  // ── 2. Presencia (solo metadata; sin leer contenido) ─────────────────────────────────────────
  const presence = deps.presenceInspector.inspectPresence(rootDir);
  const kindByRel = new Map<string, FileKind>();
  for (const d of presence.details) kindByRel.set(d.path, d.kind);
  const isPresent = (rel: string): boolean => presence.present.includes(rel);

  // ── 3-13. Documentos: lectura segura + presupuesto + parseo + validación + tokens ────────────
  const documents: Record<string, ParsedDocument> = {};
  const parsed: Partial<Record<ReadableManagedDocument, unknown>> = {};
  const checked = new Set<ReadableManagedDocument>();
  let remainingBytes = limits.maxTotalBytes;
  let nodes: readonly TokenNodeSummary[] = [];
  let statistics: InspectionStatistics = emptyStatistics;

  for (const doc of DOC_ORDER) {
    const rel = REL[doc];
    const kind = kindByRel.get(rel) ?? "absent";

    if (!isPresent(rel)) {
      documents[rel] = { relativePath: rel, exists: false, kind, trust: "unavailable", issues: [] };
      continue; // ausente: no se intenta leer
    }

    // Presupuesto total: documento solicitado con el restante seguro.
    if (remainingBytes <= 0) {
      recordHit("total-size", `> ${limits.maxTotalBytes}`);
      const issue = analysisError("limit-total-size-exceeded", `Presupuesto total de bytes agotado al leer ${rel}.`, { document: doc, path: rel });
      pushError(issue);
      documents[rel] = { relativePath: rel, exists: true, kind, trust: "unavailable", issues: [issue] };
      continue;
    }
    const maxBytes = Math.min(limits.maxFileBytes, remainingBytes);
    const result = await deps.documentReader.read({ rootDir, document: doc, relativePath: rel, maxBytes });

    if (!result.ok) {
      const code = result.reason === "too-large" && maxBytes < limits.maxFileBytes ? "limit-total-size-exceeded" : READ_FAIL_CODE[result.reason];
      if (code === "limit-total-size-exceeded") recordHit("total-size", `> ${limits.maxTotalBytes}`);
      if (result.reason === "too-large" && code === "limit-file-size-exceeded") recordHit("file-size", `> ${limits.maxFileBytes}`);
      const issue = analysisError(code, result.message, { document: doc, path: rel });
      pushError(issue);
      documents[rel] = { relativePath: rel, exists: true, kind, trust: "unavailable", issues: [issue] };
      continue;
    }

    remainingBytes -= result.sizeBytes;

    // Parseo JSON seguro: exactamente uno por documento leído.
    let value: unknown;
    try {
      value = JSON.parse(result.content);
    } catch {
      const issue = analysisError("json-parse-error", `JSON inválido en ${rel}.`, { document: doc, path: rel });
      pushError(issue);
      documents[rel] = { relativePath: rel, exists: true, kind, trust: "unavailable", issues: [issue] };
      continue; // leído pero no validable
    }

    parsed[doc] = value;
    checked.add(doc);

    // Validación específica del documento.
    const docIssues: AnalysisIssue[] = [];
    if (doc === "config") {
      for (const i of deps.documentValidators.validateConfig(value)) docIssues.push(toAnalysisIssue(i, "config"));
    } else if (doc === "manifest") {
      for (const i of deps.documentValidators.validateManifest(value)) docIssues.push(toAnalysisIssue(i, "manifest"));
    } else {
      // tokens: UNA sola pasada de análisis (sin re-recorrer).
      const analysis = deps.dtcgAnalyzer.analyze(value);
      nodes = analysis.nodes;
      statistics = analysis.statistics;
      for (const e of analysis.errors) {
        if (e.code === "limit-issues-exceeded") continue; // el tope global lo gestiona la tubería
        docIssues.push(e);
      }
      for (const h of analysis.limits.hits) recordHit(h.limit, h.detail);
      analysis.warnings.forEach((w) => pushWarning(w));
    }

    for (const i of docIssues) pushError(i);
    const trust: DocumentTrust = docIssues.length === 0 ? "valid" : "recovered";
    documents[rel] = { relativePath: rel, exists: true, kind, parsed: value, trust, issues: docIssues };
  }

  // ── 14. Coherencia entre documentos (T030) ───────────────────────────────────────────────────
  for (const issue of crossDocumentCoherence(parsed.config, parsed.manifest, checked)) pushError(issue);

  // ── 20. Estado estructural final ────────────────────────────────────────────────────────────
  // checked/unchecked se derivan en la proyección a ValidationReport (Fase 7) desde `documents`
  // (trust !== "unavailable" ⇒ checked), evitando duplicar listas en el modelo de análisis.
  const limitsResult = analysisLimitsResult(hits);
  const allRegularFiles = presence.details.every((d) => !d.present || d.kind === "file");
  let structuralState: StructuralState;
  if (presence.nonePresent) structuralState = "not-initialized";
  else if (!presence.allPresent || !allRegularFiles) structuralState = "partial";
  else structuralState = errors.length === 0 && !limitsResult.partial ? "complete-valid" : "complete-invalid";

  const designSystemPath = isPresent(REL.manifest) || isPresent(REL.tokens) ? `${rootDir}/${DESIGN_SYSTEM_DIR}` : null;

  return {
    host: { root: rootDir, designSystemPath },
    presence: { present: [...presence.present], missing: [...presence.missing] },
    structuralState,
    documents,
    nodes,
    statistics,
    errors,
    warnings,
    limits: limitsResult,
    valid: structuralState === "complete-valid",
  };
}

/** Coherencia cruzada config↔manifest. Solo emite si los documentos relevantes fueron parseados. */
function crossDocumentCoherence(
  config: unknown,
  manifest: unknown,
  checked: ReadonlySet<ReadableManagedDocument>,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  if (checked.has("config") && config !== null && typeof config === "object") {
    const cfg = config as Record<string, unknown>;
    if ("designSystemDir" in cfg && cfg.designSystemDir !== DESIGN_SYSTEM_DIR) {
      issues.push(analysisError("coherence-design-system-dir", `config.designSystemDir no coincide con la ubicación administrada "${DESIGN_SYSTEM_DIR}".`, { document: "config", path: "designSystemDir" }));
    }
  }
  if (checked.has("manifest") && manifest !== null && typeof manifest === "object") {
    const mf = manifest as Record<string, unknown>;
    if ("tokensDir" in mf && typeof mf.tokensDir === "string" && mf.tokensDir !== TOKENS_DIR) {
      issues.push(analysisError("coherence-tokens-dir", `manifest.tokensDir "${String(mf.tokensDir)}" no coincide con "${TOKENS_DIR}".`, { document: "manifest", path: "tokensDir" }));
    }
  }
  return issues;
}
