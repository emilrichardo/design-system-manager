// T013 — Estados previos de inicialización (data-model §estados). Solo modela; no inspecciona FS.
import type { Issue } from "../issue.js";
import type { Result } from "../errors.js";
import { err, ok } from "../errors.js";

export type PreviousStateKind = "none" | "complete-valid" | "partial" | "complete-invalid";

/** No existen artefactos administrados; la inicialización puede continuar. */
export interface NoneState {
  readonly kind: "none";
}
/** Inicialización completa y válida; resultado futuro `unchanged`. */
export interface CompleteValidState {
  readonly kind: "complete-valid";
  readonly designSystemDir: string;
}
/** Artefactos presentes pero estructura incompleta; resultado futuro `conflict`. Sin reparación. */
export interface PartialState {
  readonly kind: "partial";
  readonly present: readonly string[];
  readonly missing: readonly string[];
}
/** Estructura completa pero documentos inválidos; resultado futuro `failed/validation`. */
export interface CompleteInvalidState {
  readonly kind: "complete-invalid";
  readonly errors: readonly Issue[];
}

export type PreviousState =
  | NoneState
  | CompleteValidState
  | PartialState
  | CompleteInvalidState;

export const noneState: NoneState = { kind: "none" };

export function completeValidState(designSystemDir: string): CompleteValidState {
  return { kind: "complete-valid", designSystemDir };
}

/** `partial` debe enumerar archivos presentes y/o ausentes; combinación vacía es incoherente. */
export function createPartialState(
  present: readonly string[],
  missing: readonly string[],
): Result<PartialState> {
  if (present.length === 0 && missing.length === 0) {
    return err(
      "incoherent-state",
      "Un estado 'partial' debe enumerar archivos presentes y/o ausentes.",
    );
  }
  return ok({ kind: "partial", present, missing });
}

/** `complete-invalid` debe incluir al menos un error de validación. */
export function createCompleteInvalidState(
  errors: readonly Issue[],
): Result<CompleteInvalidState> {
  if (errors.length === 0) {
    return err(
      "incoherent-state",
      "Un estado 'complete-invalid' debe incluir al menos un error de validación.",
    );
  }
  return ok({ kind: "complete-invalid", errors });
}

/** Resultado semántico esperado por una fase posterior. NO es un exit code. */
export type ExpectedOutcome = "created" | "unchanged" | "conflict" | "failed-validation";

export function expectedOutcome(state: PreviousState): ExpectedOutcome {
  switch (state.kind) {
    case "none":
      return "created";
    case "complete-valid":
      return "unchanged";
    case "partial":
      return "conflict";
    case "complete-invalid":
      return "failed-validation";
  }
}
