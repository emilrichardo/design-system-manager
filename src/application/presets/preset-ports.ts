import type {
  PresetApplyResult,
  PresetCatalogEntry,
  PresetEnvelope,
  PresetId,
  PresetInspection,
  PresetValidation,
} from "../../domain/presets/index.js";
import type { PresetApplicationPlan, PresetNotFoundResource } from "../../domain/presets/preset-application-plan.js";
import type { AnalyzeUseCase } from "../analysis-ports.js";
import type {
  AliasState,
  NodeKind,
  NodeTrust,
  TypeOrigin,
} from "../../domain/analysis/token-node-summary.js";
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import type { FoundationIssue } from "../../domain/foundations/foundation-issue.js";
import type { FoundationCategoryRef } from "../../domain/foundations/category-state.js";
import type { FoundationLevel, FoundationLevelSource } from "../../domain/foundations/foundation-level.js";
import type { FoundationTypeCompatibility } from "../../domain/foundations/foundation-type-compatibility.js";
import type { AnalysisLimitsResult } from "../../domain/traversal/limits.js";

/**
 * Vista por token producida por el análisis en memoria del bloque `tokens` de un preset, reutilizando
 * el motor DTCG de `002` y la proyección foundation de `004` (sin segundo analizador). Datos ya
 * resueltos; sin AST/`$value`/Error.
 */
export interface PresetTokenNode {
  readonly path: string;
  readonly category: FoundationCategoryRef;
  readonly declaredType: string | null;
  readonly effectiveType: string | null;
  readonly typeOrigin: TypeOrigin;
  readonly typeSourcePath: string | null;
  readonly kind: NodeKind;
  readonly aliasTarget: string | null;
  readonly aliasState: AliasState;
  readonly trust: NodeTrust;
  readonly level: FoundationLevel;
  readonly levelSource: FoundationLevelSource;
  readonly levelSourcePath: string | null;
  readonly typeCompatibility: FoundationTypeCompatibility;
}

/**
 * Resultado del análisis en memoria del bloque `tokens` de un preset (una pasada DTCG + una pasada de
 * metadata foundation). Producido en infraestructura; consumido por `validatePreset` (aplicación) que
 * lo traduce a `PresetValidationIssue` y reconcilia categorías.
 */
export interface PresetTokenAnalysis {
  readonly nodes: readonly PresetTokenNode[];
  /** Errores estructurales del analizador DTCG de `002` (reutilizados, no re-emitidos por path). */
  readonly errors: readonly AnalysisIssue[];
  readonly warnings: readonly AnalysisIssue[];
  /** Issues de metadata foundation (`foundation-level-invalid`) de la pasada de `004`. */
  readonly foundationIssues: readonly FoundationIssue[];
  readonly limits: AnalysisLimitsResult;
  /** Claves de primer nivel del bloque `tokens` (para distinguir alias externo de interno faltante). */
  readonly topLevelKeys: readonly string[];
}

/** Analiza en memoria el bloque `tokens` ya cargado (sin filesystem, sin host, sin red). */
export type AnalyzePresetTokens = (tokens: unknown) => PresetTokenAnalysis;

/**
 * Carga rica del catálogo: preserva la causa (`invalid-preset`) en vez de degradar a lista vacía.
 * `reason` es un código estable y seguro (sin paths absolutos ni `Error`).
 */
export type CatalogLoadOutcome =
  | { readonly ok: true; readonly entries: readonly PresetCatalogEntry[] }
  | { readonly ok: false; readonly reason: string };

export interface PresetCatalogPort {
  /** Carga rica con causa preservada (usada por `listPresets`). */
  load(): Promise<CatalogLoadOutcome>;
  list(): Promise<readonly PresetCatalogEntry[]>;
  get(id: PresetId): Promise<PresetEnvelope | null>;
}

export interface PresetValidationPort {
  validate(envelope: PresetEnvelope): PresetValidation;
}

export interface PresetListResult {
  readonly outcome: "success" | "invalid-preset";
  readonly presets: readonly PresetCatalogEntry[];
  readonly validation: PresetValidation | null;
}

export interface PresetInspectInput {
  readonly id: PresetId;
}

export type PresetInspectionResult =
  | { readonly outcome: "success"; readonly inspection: PresetInspection }
  | { readonly outcome: "invalid-preset"; readonly inspection: PresetInspection }
  | { readonly outcome: "not-found"; readonly inspection: null };

export interface PresetPlanInput {
  readonly id: PresetId;
  readonly executionDir: string;
}

export type PresetApplicationPlanResult =
  | { readonly outcome: "success" | "unchanged" | "conflict"; readonly plan: PresetApplicationPlan }
  | { readonly outcome: "invalid-preset" | "read-error"; readonly plan: PresetApplicationPlan | null }
  | {
      readonly outcome: "not-found";
      readonly plan: PresetApplicationPlan | null;
      readonly notFoundResource: PresetNotFoundResource;
    };

export interface PresetApplyInput {
  readonly id: PresetId;
  readonly executionDir: string;
}

export interface ListPresetsDependencies {
  readonly catalog: PresetCatalogPort;
}

export interface InspectPresetDependencies {
  readonly catalog: PresetCatalogPort;
  /** Análisis en memoria del bloque `tokens` (una pasada DTCG + una de metadata). */
  readonly analyzeTokens: AnalyzePresetTokens;
}

export interface PlanPresetApplicationDependencies {
  readonly catalog: PresetCatalogPort;
  /** Análisis en memoria del preset (reutilizado por validación y candidatos). */
  readonly analyzeTokens: AnalyzePresetTokens;
  /** Análisis del Design System host (caso de uso enlazado de `002`); una sola invocación. */
  readonly analyzeHost: AnalyzeUseCase;
}

export interface ApplyPresetDependencies {
  readonly catalog: PresetCatalogPort;
}

export type ListPresets = (deps: ListPresetsDependencies) => Promise<PresetListResult>;
export type InspectPreset = (
  input: PresetInspectInput,
  deps: InspectPresetDependencies,
) => Promise<PresetInspectionResult>;
export type PlanPresetApplication = (
  input: PresetPlanInput,
  deps: PlanPresetApplicationDependencies,
) => Promise<PresetApplicationPlanResult>;
export type ApplyPreset = (
  input: PresetApplyInput,
  deps: ApplyPresetDependencies,
) => Promise<PresetApplyResult>;
