// T013 — DesignSystemInspection: vista descriptiva canónica (contracts/design-system-inspection.
// contract.md; ADR-0007). INCLUYE el ValidationReport. Confiabilidad por sección/valor. Sin texto de
// terminal, sin ANSI, sin cota de 200 (eso es del reporter, Fase 8), sin exit codes. Dominio puro.
import type { InspectedValue } from "./inspected-value.js";
import type { FileKind } from "./file-kind.js";
import type { StructuralState } from "./structural-state.js";
import type { TokenNodeSummary } from "./token-node-summary.js";
import type { InspectionStatistics } from "./inspection-statistics.js";
import type { ValidationReport } from "./validation-report.js";
import type { AnalysisLimitsResult } from "../traversal/limits.js";

/** Archivo administrado inspeccionado. */
export interface FileInspection {
  readonly relativePath: string;
  readonly kind: FileKind;
  readonly sizeBytes?: number;
  readonly readable: boolean;
}

/** Identidad inspeccionada, con confiabilidad por campo. */
export interface InspectedIdentity {
  readonly name?: InspectedValue<string>;
  readonly slug?: InspectedValue<string>;
  readonly version?: InspectedValue<string>;
  readonly description?: InspectedValue<string>;
}

/** Versiones de schema inspeccionadas, con confiabilidad por campo. */
export interface InspectedSchemaVersions {
  readonly config?: InspectedValue<string>;
  readonly manifest?: InspectedValue<string>;
  readonly formatVersion?: InspectedValue<string>;
}

export interface InspectedFiles {
  readonly expected: readonly string[];
  readonly present: readonly FileInspection[];
  readonly missing: readonly string[];
}

/** Bloque de tokens: estadísticas + las rutas/nodos (el modelo conserva TODOS los nodos). */
export interface TokensInspection extends InspectionStatistics {
  readonly paths: readonly TokenNodeSummary[];
}

export interface InspectionHost {
  readonly root: string;
  readonly designSystemPath: string | null;
}

export interface DesignSystemInspection {
  readonly host: InspectionHost;
  readonly structuralState: StructuralState;
  readonly identity?: InspectedIdentity;
  readonly schemaVersions?: InspectedSchemaVersions;
  readonly files: InspectedFiles;
  readonly tokens?: TokensInspection;
  /** `inspect` INCLUYE la validación, no la sustituye. */
  readonly validation: ValidationReport;
  readonly limits: AnalysisLimitsResult;
}
