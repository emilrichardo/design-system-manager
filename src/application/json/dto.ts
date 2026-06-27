// T002 (003) — DTO públicos del contrato JSON v1 (SOLO tipos). Transporte explícito, separado del
// dominio: ningún objeto de dominio se serializa directamente (ADR-0011). Reutiliza las uniones de
// literales del dominio (Trust/Severity/StructuralState/… son conceptos estables, no formas de
// objeto). Sin Node/CLI/exit-codes. Política de ausencia: campo estable no disponible → `null`;
// colección vacía → `[]`; record vacío → `{}`; nunca `undefined` (data-model.md §2–§7).
import type { JsonFormatVersion } from "./format-version.js";
import type { Trust } from "../../domain/analysis/inspected-value.js";
import type { Severity } from "../../domain/analysis/analysis-issue.js";
import type { StructuralState } from "../../domain/analysis/structural-state.js";
import type {
  AliasState,
  NodeKind,
  NodeTrust,
  TypeOrigin,
} from "../../domain/analysis/token-node-summary.js";

// ── Enums del contrato ───────────────────────────────────────────────────────────────────────────
/** Comando que produjo el envelope. */
export type JsonCommand = "validate" | "inspect";
/** Outcomes de dominio (proyectados desde `AnalysisOutcome`). */
export type JsonExpectedOutcome =
  | "valid"
  | "complete-invalid"
  | "partial"
  | "not-found"
  | "read-error";
/** Outcome EXCLUSIVO de la capa CLI (no es un outcome de dominio). */
export type JsonInternalOutcome = "internal-error";

// ── DTO atómicos ─────────────────────────────────────────────────────────────────────────────────
/** Valor inspeccionado con confiabilidad. `value` SIEMPRE presente (posible `null`). */
export interface JsonInspectedValueV1<T> {
  readonly value: T | null;
  readonly trust: Trust;
}

/** Issue público estable. `document`/`path` con `null` cuando se desconocen. Sin `context`/stack. */
export interface JsonIssueV1 {
  readonly severity: Severity;
  readonly code: string;
  readonly message: string;
  readonly document: string | null;
  readonly path: string | null;
}

/** Host localizado. `root` absoluto; `designSystemPath` absoluto o `null`. */
export interface JsonHostV1 {
  readonly root: string;
  readonly designSystemPath: string | null;
}

export interface JsonLimitHitV1 {
  readonly limit: string;
  readonly detail: string;
}

export interface JsonLimitsV1 {
  readonly reached: boolean;
  readonly partial: boolean;
  readonly hits: readonly JsonLimitHitV1[];
}

export interface JsonSummaryV1 {
  readonly errors: number;
  readonly warnings: number;
  readonly tokens: number | null;
}

/** Error público (sin path/stack). Usado en `not-found` (reservado, `null` en v1) e `internal-error`. */
export interface JsonErrorV1 {
  readonly code: string;
  readonly message: string;
}

// ── Proyección de validación (compartida por validate-result e inspect.validation) ─────────────────
export interface JsonValidationV1 {
  readonly valid: boolean;
  readonly structuralState: StructuralState;
  readonly checkedDocuments: readonly string[];
  readonly uncheckedDocuments: readonly string[];
  readonly summary: JsonSummaryV1;
  readonly errors: readonly JsonIssueV1[];
  readonly warnings: readonly JsonIssueV1[];
  readonly limits: JsonLimitsV1;
}

// ── Result de validate ─────────────────────────────────────────────────────────────────────────--
export interface JsonValidateResultV1 {
  readonly host: JsonHostV1 | null;
  readonly structuralState: StructuralState;
  readonly valid: boolean;
  readonly checkedDocuments: readonly string[];
  readonly uncheckedDocuments: readonly string[];
  readonly summary: JsonSummaryV1;
  readonly errors: readonly JsonIssueV1[];
  readonly warnings: readonly JsonIssueV1[];
  readonly limits: JsonLimitsV1;
}

// ── Result de inspect ──────────────────────────────────────────────────────────────────────────--
export interface JsonFileInspectionV1 {
  readonly relativePath: string;
  readonly kind: string;
  readonly sizeBytes: number | null;
  readonly readable: boolean;
}

export interface JsonTokenNodeV1 {
  readonly path: string;
  readonly declaredType: string | null;
  readonly effectiveType: string | null;
  readonly typeOrigin: TypeOrigin;
  readonly typeSourcePath: string | null;
  readonly kind: NodeKind;
  readonly aliasTarget: string | null;
  readonly aliasState: AliasState;
  readonly description: string | null;
  readonly depth: number;
  readonly trust: NodeTrust;
}

export interface JsonIdentityV1 {
  readonly name: JsonInspectedValueV1<string>;
  readonly slug: JsonInspectedValueV1<string>;
  readonly version: JsonInspectedValueV1<string>;
  readonly description: JsonInspectedValueV1<string>;
}

export interface JsonSchemaVersionsV1 {
  readonly config: JsonInspectedValueV1<string>;
  readonly manifest: JsonInspectedValueV1<string>;
  readonly formatVersion: JsonInspectedValueV1<string>;
}

export interface JsonFilesV1 {
  readonly expected: readonly string[];
  readonly present: readonly JsonFileInspectionV1[];
  readonly missing: readonly string[];
}

export interface JsonTokensV1 {
  readonly total: number;
  readonly groups: number;
  readonly concreteValues: number;
  readonly aliases: number;
  readonly byType: Readonly<Record<string, number>>;
  readonly maxDepth: number;
  readonly aliasIssues: number;
  readonly paths: readonly JsonTokenNodeV1[];
}

export interface JsonInspectResultV1 {
  readonly host: JsonHostV1 | null;
  readonly structuralState: StructuralState;
  readonly identity: JsonIdentityV1 | null;
  readonly schemaVersions: JsonSchemaVersionsV1 | null;
  readonly files: JsonFilesV1;
  readonly tokens: JsonTokensV1 | null;
  readonly validation: JsonValidationV1;
  readonly limits: JsonLimitsV1;
}

// ── Envelopes (unión discriminada por `outcome`) ──────────────────────────────────────────────────
// Orden canónico de claves: formatVersion, command, outcome, result, [error].
export type JsonValidateEnvelopeV1 =
  | {
      readonly formatVersion: JsonFormatVersion;
      readonly command: "validate";
      readonly outcome: "valid" | "complete-invalid" | "partial" | "read-error";
      readonly result: JsonValidateResultV1;
    }
  | {
      readonly formatVersion: JsonFormatVersion;
      readonly command: "validate";
      readonly outcome: "not-found";
      readonly result: null;
      readonly error: JsonErrorV1 | null;
    };

export type JsonInspectEnvelopeV1 =
  | {
      readonly formatVersion: JsonFormatVersion;
      readonly command: "inspect";
      readonly outcome: "valid" | "complete-invalid" | "partial" | "read-error";
      readonly result: JsonInspectResultV1;
    }
  | {
      readonly formatVersion: JsonFormatVersion;
      readonly command: "inspect";
      readonly outcome: "not-found";
      readonly result: null;
      readonly error: JsonErrorV1 | null;
    };

/** Envelope de error interno. EXCLUSIVO de la capa CLI; nunca en los outcomes headless. */
export interface JsonInternalErrorEnvelopeV1 {
  readonly formatVersion: JsonFormatVersion;
  readonly command: JsonCommand;
  readonly outcome: JsonInternalOutcome;
  readonly result: null;
  readonly error: JsonErrorV1;
}

/** Cualquier envelope JSON v1 producible por la CLI. */
export type JsonEnvelopeV1 =
  | JsonValidateEnvelopeV1
  | JsonInspectEnvelopeV1
  | JsonInternalErrorEnvelopeV1;
