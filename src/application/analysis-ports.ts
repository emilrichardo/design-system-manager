// Puertos de aplicación de la feature 002 (validate/inspect). SOLO contratos/tipos: sin Node, sin
// infraestructura concreta, sin Commander/Clack/consola, sin exit codes numéricos. La capa de
// aplicación puede importar dominio; el dominio NO importa aplicación.
//
// Separado de `ports.ts` (001) por responsabilidad/mantenibilidad; `FileSystem` se extiende in situ
// en `ports.ts` (T015). La extensión de tipos por documento se reutiliza de `001` cuando aplica.
import type { ManagedDocument } from "../domain/analysis/analysis-issue.js";
import type { AnalysisIssue } from "../domain/analysis/analysis-issue.js";
import type { StructuralState } from "../domain/analysis/structural-state.js";
import type { TokenNodeSummary } from "../domain/analysis/token-node-summary.js";
import type { InspectionStatistics } from "../domain/analysis/inspection-statistics.js";
import type { AnalysisLimitsResult } from "../domain/traversal/limits.js";
import type { AnalysisHost, DesignSystemAnalysis } from "../domain/analysis/design-system-analysis.js";
import type { ValidationReport } from "../domain/analysis/validation-report.js";
import type { DesignSystemInspection } from "../domain/analysis/design-system-inspection.js";
import type {
  DocumentValidators,
  HostError,
  HostInspector,
  HostRootResolver,
  StateClassifier,
} from "./ports.js";

// ── T016 — ManagedDocumentReader (puerto delgado, lectura segura) ──────────────────────────────
// Lee UN documento administrado ya identificado. NO es un segundo filesystem: el adapter concreto
// (T024) compone el `FileSystem` extendido (lstatKind/byteSize/readFile) y el path-guard de `001`.
// No expone Stats/fd/streams/buffers ni métodos de escritura. Errores esperados = resultado
// discriminado (no excepciones).

/** Documentos administrados realmente legibles por el reader. */
export type ReadableManagedDocument = Extract<ManagedDocument, "config" | "manifest" | "tokens">;

/** Petición de lectura segura (entrada explícita, inmutable). */
export interface ManagedDocumentReadRequest {
  /** Raíz anfitriona resuelta. */
  readonly rootDir: string;
  /** Documento administrado solicitado. */
  readonly document: ReadableManagedDocument;
  /** Ruta relativa autorizada dentro de la raíz. */
  readonly relativePath: string;
  /** Presupuesto de tamaño en bytes para este documento (límite duro de lectura). */
  readonly maxBytes: number;
}

/** Motivo de fallo de lectura (flujo normal, NO excepción). */
export type ManagedReadFailure =
  | "absent"
  | "not-regular-file"
  | "too-large"
  | "outside-root"
  | "symlink-external"
  | "invalid-encoding" // bytes UTF-8 inválidos (decodificación estricta, FR-004); distinto de read-failed
  | "read-failed";

/** Resultado de lectura: unión discriminada por `ok`. */
export type ManagedDocumentReadResult =
  | {
      readonly ok: true;
      readonly document: ReadableManagedDocument;
      readonly relativePath: string;
      readonly content: string;
      readonly sizeBytes: number;
    }
  | { readonly ok: false; readonly reason: ManagedReadFailure; readonly message: string };

export interface ManagedDocumentReader {
  /** Lee de forma segura el documento solicitado; nunca escribe ni sigue symlinks externos. */
  read(request: ManagedDocumentReadRequest): Promise<ManagedDocumentReadResult>;
}

// ── T017 — Validador de lectura DTCG amplio (separado del schema de generación de 001) ──────────
// Reconoce los 13 tipos DTCG 2025.10 sin transformar `$value`. Independiente de `DocumentValidators`
// de `001` (que valida config/manifest + el DTCG color-only de generación).
export interface DtcgReadValidator {
  /** Devuelve issues (vacío = sin problemas). NO resuelve/transforma valores. */
  validate(document: unknown): readonly AnalysisIssue[];
}

/**
 * Resultado rico del análisis del documento de tokens (una sola pasada de recorrido). Es la salida
 * estructural que la tubería reutiliza directamente (nodos/estadísticas/issues/límites/validez) sin
 * volver a recorrer. Solo tipos de dominio.
 */
export interface DtcgAnalysisResult {
  readonly valid: boolean;
  readonly nodes: readonly TokenNodeSummary[];
  readonly statistics: InspectionStatistics;
  readonly errors: readonly AnalysisIssue[];
  readonly warnings: readonly AnalysisIssue[];
  readonly limits: AnalysisLimitsResult;
}

/** Puerto: analiza (una vez) un documento de tokens ya parseado y devuelve el resultado rico. */
export interface DtcgAnalyzer {
  analyze(document: unknown): DtcgAnalysisResult;
}

// ── T018 — Tubería compartida de análisis ──────────────────────────────────────────────────────
/** Entrada headless común (la CLI provee `executionDir`; el núcleo no usa process.cwd()). */
export interface AnalyzeDesignSystemInput {
  readonly executionDir: string;
}

/** Dependencias explícitas de la tubería (sin contenedor DI, sin implementaciones concretas). */
export interface AnalyzeDesignSystemDependencies {
  readonly hostRootResolver: HostRootResolver;
  readonly presenceInspector: HostInspector;
  readonly stateClassifier: StateClassifier;
  readonly documentReader: ManagedDocumentReader;
  /** Validadores de `001` (config/manifest). La tubería NO usa su `validateDtcg` (color-only). */
  readonly documentValidators: DocumentValidators;
  /** Analizador DTCG de lectura amplio de `002` (UNA sola pasada de recorrido → resultado rico). */
  readonly dtcgAnalyzer: DtcgAnalyzer;
}

/**
 * Tubería ÚNICA: resuelve host → presencia → lectura → parseo → validación → recorrido → análisis.
 * Produce `DesignSystemAnalysis` (modelo común); NO produce texto ni exit codes. `validate` e
 * `inspect` reutilizan EXACTAMENTE este análisis (la diferencia es la proyección/presentación).
 */
export type AnalyzeExistingDesignSystem = (
  input: AnalyzeDesignSystemInput,
  deps: AnalyzeDesignSystemDependencies,
) => Promise<DesignSystemAnalysis>;

// ── T019 — Puertos de presentación (reciben modelos estructurados; no imprimen) ─────────────────
// Sin stdout/stderr/ANSI/colores/cota-200/tablas. Reciben datos semánticos, no `report(string)`.

export interface ValidationReporter {
  hostResolved(host: AnalysisHost): void | Promise<void>;
  structuralStateDetected(state: StructuralState): void | Promise<void>;
  validated(report: ValidationReport): void | Promise<void>;
  completed(result: ValidateDesignSystemResult): void | Promise<void>;
}

export interface InspectionReporter {
  hostResolved(host: AnalysisHost): void | Promise<void>;
  structuralStateDetected(state: StructuralState): void | Promise<void>;
  inspected(inspection: DesignSystemInspection): void | Promise<void>;
  completed(result: InspectDesignSystemResult): void | Promise<void>;
}

// ── T020 — Casos de uso públicos: entradas, resultados (unión discriminada) y dependencias ───────
// Estados SEMÁNTICOS (no códigos numéricos). El mapeo a exit codes vive en CLI (ADR-0006, fase 8).
// La inspección recuperable se entrega incluso en `complete-invalid`/`partial`.

export type AnalysisOutcome =
  | "valid"
  | "complete-invalid"
  | "partial"
  | "not-found"
  | "read-error";

export type ValidateDesignSystemResult =
  | { readonly outcome: "valid"; readonly host: AnalysisHost; readonly report: ValidationReport }
  | { readonly outcome: "complete-invalid"; readonly host: AnalysisHost; readonly report: ValidationReport }
  | { readonly outcome: "partial"; readonly host: AnalysisHost; readonly report: ValidationReport }
  | {
      readonly outcome: "not-found";
      readonly host: AnalysisHost | null;
      readonly report: ValidationReport | null;
      readonly hostError: HostError | null;
    }
  | { readonly outcome: "read-error"; readonly host: AnalysisHost; readonly report: ValidationReport };

export type InspectDesignSystemResult =
  | { readonly outcome: "valid"; readonly host: AnalysisHost; readonly inspection: DesignSystemInspection }
  | {
      readonly outcome: "complete-invalid";
      readonly host: AnalysisHost;
      readonly inspection: DesignSystemInspection;
    }
  | { readonly outcome: "partial"; readonly host: AnalysisHost; readonly inspection: DesignSystemInspection }
  | {
      readonly outcome: "not-found";
      readonly host: AnalysisHost | null;
      readonly inspection: DesignSystemInspection | null;
      readonly hostError: HostError | null;
    }
  | { readonly outcome: "read-error"; readonly host: AnalysisHost; readonly inspection: DesignSystemInspection };

/**
 * Análisis **ya enlazado** a sus dependencias (la composición cierra `AnalyzeDesignSystemDependencies`).
 * Los casos de uso lo invocan con un único argumento `(input)`; no resuelven host ni leen por su cuenta.
 */
export type AnalyzeUseCase = (input: AnalyzeDesignSystemInput) => Promise<DesignSystemAnalysis>;

export interface ValidateDesignSystemDependencies {
  readonly analyze: AnalyzeUseCase;
  readonly reporter: ValidationReporter;
}

export interface InspectDesignSystemDependencies {
  readonly analyze: AnalyzeUseCase;
  readonly reporter: InspectionReporter;
}

export type ValidateDesignSystem = (
  input: AnalyzeDesignSystemInput,
  deps: ValidateDesignSystemDependencies,
) => Promise<ValidateDesignSystemResult>;

export type InspectDesignSystem = (
  input: AnalyzeDesignSystemInput,
  deps: InspectDesignSystemDependencies,
) => Promise<InspectDesignSystemResult>;
