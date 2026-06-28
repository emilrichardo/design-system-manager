// T006 (004) — Tipos del resultado público de foundations (capa de aplicación; SOLO tipos). Modelos
// JSON-safe derivados del análisis único de 002; sin AST/`$extensions`/Error/Map. Reutilizan modelos
// de dominio (002 + foundations) y el patrón de unión discriminada de validate/inspect, sin
// modificarlos. La proyección/cálculo llega en checkpoints posteriores.
import type { AnalysisHost } from "../../domain/analysis/design-system-analysis.js";
import type { DesignSystemAnalysis } from "../../domain/analysis/design-system-analysis.js";
import type { StructuralState } from "../../domain/analysis/structural-state.js";
import type { AnalysisLimitsResult } from "../../domain/traversal/limits.js";
import type {
  AliasState,
  NodeKind,
  NodeTrust,
  TypeOrigin,
} from "../../domain/analysis/token-node-summary.js";
import type {
  FoundationCategoryId,
  FoundationCategoryDefinition,
  ValidationDepth,
} from "../../domain/foundations/foundation-category.js";
import type { FoundationCategoryRef, FoundationCategoryState } from "../../domain/foundations/category-state.js";
import type { FoundationLevel, FoundationLevelSource } from "../../domain/foundations/foundation-level.js";
import type { FoundationIssue } from "../../domain/foundations/foundation-issue.js";
import type { AnalysisOutcome, AnalyzeDesignSystemInput, AnalyzeUseCase } from "../analysis-ports.js";
import type { HostError } from "../ports.js";
import type { FoundationMetadataProjection } from "./metadata-pass.js";

/** Vista foundation de un token (datos reutilizados del análisis; sin contenido arbitrario). */
export interface FoundationTokenInspection {
  readonly path: string;
  readonly category: FoundationCategoryRef;
  readonly level: FoundationLevel;
  readonly levelSource: FoundationLevelSource;
  readonly levelSourcePath: string | null;
  readonly declaredType: string | null;
  readonly effectiveType: string | null;
  readonly typeOrigin: TypeOrigin;
  readonly typeSourcePath: string | null;
  readonly kind: NodeKind;
  readonly aliasTarget: string | null;
  readonly aliasState: AliasState;
  readonly trust: NodeTrust;
}

/** Conteos por nivel dentro de una categoría. */
export interface FoundationLevelCounts {
  readonly total: number;
  readonly primitive: number;
  readonly semantic: number;
  readonly unclassified: number;
}

/** Inspección de una categoría (siempre presente, incluso `absent`). */
export interface FoundationCategoryInspection {
  readonly id: FoundationCategoryId;
  readonly definition: FoundationCategoryDefinition;
  readonly state: FoundationCategoryState;
  readonly validationDepth: ValidationDepth;
  readonly counts: FoundationLevelCounts;
  readonly tokens: readonly FoundationTokenInspection[];
  readonly issues: readonly FoundationIssue[];
}

/** Resumen agregado de la inspección foundation. */
export interface FoundationsSummary {
  readonly categories: {
    readonly absent: number;
    readonly partial: number;
    readonly complete: number;
    readonly invalid: number;
  };
  readonly tokens: {
    readonly total: number;
    readonly primitive: number;
    readonly semantic: number;
    readonly unclassified: number;
    readonly unresolved: number;
  };
  readonly errors: number;
  readonly warnings: number;
}

/** Vista de validación foundation (distinta del partial estructural via `structuralState`). */
export interface FoundationsValidation {
  readonly valid: boolean;
  readonly errors: readonly FoundationIssue[];
  readonly warnings: readonly FoundationIssue[];
  readonly limits: AnalysisLimitsResult;
}

/** Inspección foundation completa (recuperable en estados inválidos/parciales). */
export interface FoundationsInspection {
  readonly host: AnalysisHost;
  readonly structuralState: StructuralState;
  readonly categories: readonly FoundationCategoryInspection[];
  readonly unresolved: readonly FoundationTokenInspection[];
  readonly summary: FoundationsSummary;
  readonly validation: FoundationsValidation;
  readonly limits: AnalysisLimitsResult;
}

/** Resultado público del caso de uso headless (unión discriminada por `outcome`, patrón de 002). */
export type FoundationsResult =
  | { readonly outcome: "valid"; readonly host: AnalysisHost; readonly inspection: FoundationsInspection }
  | { readonly outcome: "complete-invalid"; readonly host: AnalysisHost; readonly inspection: FoundationsInspection }
  | { readonly outcome: "partial"; readonly host: AnalysisHost; readonly inspection: FoundationsInspection }
  | { readonly outcome: "read-error"; readonly host: AnalysisHost; readonly inspection: FoundationsInspection }
  | {
      readonly outcome: "not-found";
      readonly host: AnalysisHost | null;
      readonly inspection: null;
      readonly hostError: HostError | null;
    };

/** Reporter headless mínimo; la presentación decide formato/streams fuera de aplicación. */
export interface FoundationsReporter {
  completed(result: FoundationsResult): void | Promise<void>;
}

export type ProjectFoundationMetadataUseCase = (parsed: unknown) => FoundationMetadataProjection;
export type ProjectFoundationsUseCase = (
  analysis: DesignSystemAnalysis,
  metadata: FoundationMetadataProjection,
) => FoundationsInspection;
export type ClassifyFoundationsOutcomeUseCase = (
  analysis: DesignSystemAnalysis,
  inspection: FoundationsInspection | null,
) => AnalysisOutcome;

export interface InspectFoundationsDependencies {
  readonly analyze: AnalyzeUseCase;
  readonly reporter: FoundationsReporter;
  readonly projectMetadata?: ProjectFoundationMetadataUseCase;
  readonly projectInspection?: ProjectFoundationsUseCase;
  readonly classifyOutcome?: ClassifyFoundationsOutcomeUseCase;
}

export type InspectFoundations = (
  input: AnalyzeDesignSystemInput,
  deps: InspectFoundationsDependencies,
) => Promise<FoundationsResult>;
