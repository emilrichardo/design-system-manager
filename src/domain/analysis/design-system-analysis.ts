// T014 — DesignSystemAnalysis: modelo interno común del que se DERIVAN ValidationReport y
// DesignSystemInspection (una sola tubería, sin divergencia). Solo modelo: NO contiene FileSystem,
// funciones de lectura, Commander, texto CLI ni exit codes. Dominio puro.
import type { AnalysisIssue } from "./analysis-issue.js";
import type { FileKind } from "./file-kind.js";
import type { StructuralState } from "./structural-state.js";
import type { TokenNodeSummary } from "./token-node-summary.js";
import type { InspectionStatistics } from "./inspection-statistics.js";
import type { AnalysisLimitsResult } from "../traversal/limits.js";

/** Confiabilidad de un documento parseado. */
export type DocumentTrust = "valid" | "recovered" | "unavailable";

/** Documento administrado leído/parseado de forma segura (el parseo real llega en Fase 6). */
export interface ParsedDocument {
  readonly relativePath: string;
  readonly exists: boolean;
  readonly kind: FileKind;
  /** Contenido parseado cuando fue posible; `undefined` si no se pudo. */
  readonly parsed?: unknown;
  readonly trust: DocumentTrust;
  readonly issues: readonly AnalysisIssue[];
}

export interface AnalysisHost {
  readonly root: string;
  readonly designSystemPath: string | null;
}

/** Presencia administrada (resumen reutilizable de `001`). */
export interface PresenceSummary {
  readonly present: readonly string[];
  readonly missing: readonly string[];
}

export interface DesignSystemAnalysis {
  readonly host: AnalysisHost;
  readonly presence: PresenceSummary;
  readonly structuralState: StructuralState;
  /** Documentos administrados por ruta relativa. */
  readonly documents: Readonly<Record<string, ParsedDocument>>;
  readonly nodes: readonly TokenNodeSummary[];
  readonly statistics: InspectionStatistics;
  readonly errors: readonly AnalysisIssue[];
  readonly warnings: readonly AnalysisIssue[];
  readonly limits: AnalysisLimitsResult;
  /** Sin errores invalidantes y análisis completo. */
  readonly valid: boolean;
}
