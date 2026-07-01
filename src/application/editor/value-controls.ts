// T017 (010) — Modelos headless de controles por tipo. Validan inputs visuales y producen operaciones
// 008; no leen archivos, no conocen DOM y no ejecutan apply.
import type { DtcgValue, TokenMutationOperationV1 } from "../../domain/token-mutations/operation.js";
import type { ViewerTokenV1 } from "../viewer/token.js";
import { createEditorDraftForOperation, type EditorCommandDraftV1 } from "./command-draft.js";

export type EditorValueTypeV1 = "color" | "number" | "dimension" | "fontFamily" | "fontWeight" | "duration" | "cubicBezier" | "string" | "boolean";

export const SUPPORTED_EDITOR_VALUE_TYPES: readonly EditorValueTypeV1[] = [
  "color",
  "number",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "string",
  "boolean",
] as const;

export type EditorValueControlStateV1 = "editable" | "read-only-alias" | "unsupported" | "composite";

export interface EditorValueControlV1 {
  readonly tokenPath: string;
  readonly type: EditorValueTypeV1 | null;
  readonly declaredType: string | null;
  readonly effectiveType: string | null;
  readonly state: EditorValueControlStateV1;
  readonly value: DtcgValue;
  readonly message: string | null;
}

export type EditorValueInputV1 =
  | { readonly type: "color"; readonly value: string }
  | { readonly type: "number"; readonly value: string | number }
  | { readonly type: "dimension"; readonly value: string | number; readonly unit: string }
  | { readonly type: "fontFamily"; readonly value: string }
  | { readonly type: "fontWeight"; readonly value: string | number }
  | { readonly type: "duration"; readonly value: string | number; readonly unit: "ms" | "s" }
  | { readonly type: "cubicBezier"; readonly x1: string | number; readonly y1: string | number; readonly x2: string | number; readonly y2: string | number }
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "boolean"; readonly value: boolean };

export type EditorValueParseResultV1 =
  | { readonly ok: true; readonly value: DtcgValue }
  | { readonly ok: false; readonly code: string; readonly message: string };

const DIMENSION_UNITS = new Set(["px", "rem", "em", "%"]);
const DURATION_UNITS = new Set(["ms", "s"]);
const COMPOSITE_TYPES = new Set(["typography", "border", "shadow", "transition", "gradient"]);

export function isSupportedEditorValueType(value: unknown): value is EditorValueTypeV1 {
  return typeof value === "string" && (SUPPORTED_EDITOR_VALUE_TYPES as readonly string[]).includes(value);
}

function parseNumber(value: string | number): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedType(token: ViewerTokenV1): string | null {
  return token.effectiveType ?? token.declaredType;
}

export function createEditorValueControl(token: ViewerTokenV1): EditorValueControlV1 {
  const rawType = normalizedType(token);
  const type = isSupportedEditorValueType(rawType) ? rawType : null;
  const isAlias = token.immediateAliasTarget !== null;
  const state: EditorValueControlStateV1 = isAlias ? "read-only-alias" : type !== null ? "editable" : rawType !== null && COMPOSITE_TYPES.has(rawType) ? "composite" : "unsupported";
  const message =
    state === "editable"
      ? null
      : state === "read-only-alias"
        ? "Alias tokens use the alias controls before direct value edits."
        : state === "composite"
          ? "Composite token values are read-only in this checkpoint."
          : "This token type is not supported by the visual editor yet.";

  return Object.freeze({
    tokenPath: token.path,
    type,
    declaredType: token.declaredType,
    effectiveType: token.effectiveType,
    state,
    value: token.declaredValue,
    message,
  });
}

export function parseEditorValueInput(input: EditorValueInputV1): EditorValueParseResultV1 {
  switch (input.type) {
    case "color":
      return input.value.trim().length > 0 ? { ok: true, value: input.value.trim() } : { ok: false, code: "empty-color", message: "Color value is required." };
    case "number": {
      const number = parseNumber(input.value);
      return number === null ? { ok: false, code: "invalid-number", message: "Enter a finite number." } : { ok: true, value: number };
    }
    case "dimension": {
      const number = parseNumber(input.value);
      if (number === null) return { ok: false, code: "invalid-dimension", message: "Enter a finite dimension value." };
      if (!DIMENSION_UNITS.has(input.unit)) return { ok: false, code: "invalid-unit", message: "Choose a supported dimension unit." };
      return { ok: true, value: { value: number, unit: input.unit } };
    }
    case "fontFamily":
      return input.value.trim().length > 0 ? { ok: true, value: input.value.trim() } : { ok: false, code: "empty-font-family", message: "Font family is required." };
    case "fontWeight": {
      const numeric = parseNumber(input.value);
      if (numeric !== null) return { ok: true, value: numeric };
      return typeof input.value === "string" && input.value.trim().length > 0
        ? { ok: true, value: input.value.trim() }
        : { ok: false, code: "invalid-font-weight", message: "Font weight is required." };
    }
    case "duration": {
      const number = parseNumber(input.value);
      if (number === null || number < 0) return { ok: false, code: "invalid-duration", message: "Enter a non-negative duration." };
      if (!DURATION_UNITS.has(input.unit)) return { ok: false, code: "invalid-duration-unit", message: "Choose ms or s." };
      return { ok: true, value: { value: number, unit: input.unit } };
    }
    case "cubicBezier": {
      const x1 = parseNumber(input.x1);
      const y1 = parseNumber(input.y1);
      const x2 = parseNumber(input.x2);
      const y2 = parseNumber(input.y2);
      return x1 !== null && y1 !== null && x2 !== null && y2 !== null && [x1, y1, x2, y2].every((point) => point >= 0 && point <= 1)
        ? { ok: true, value: [x1, y1, x2, y2] as const }
        : { ok: false, code: "invalid-cubic-bezier", message: "Cubic bezier points must be numbers between 0 and 1." };
    }
    case "string":
      return { ok: true, value: input.value };
    case "boolean":
      return { ok: true, value: input.value };
    default: {
      const exhaustive: never = input;
      return exhaustive;
    }
  }
}

export function draftUpdateValueFromControl(path: string, input: EditorValueInputV1): EditorCommandDraftV1 {
  const parsed = parseEditorValueInput(input);
  if (!parsed.ok) {
    return createEditorDraftForOperation({ kind: "update-value", path, value: null }, { selectedTokenPath: path, controlErrors: [{ field: "value", code: parsed.code, message: parsed.message }] });
  }
  return createEditorDraftForOperation({ kind: "update-value", path, value: parsed.value }, { selectedTokenPath: path });
}

export function draftForEditorOperation(operation: TokenMutationOperationV1, selectedTokenPath: string | null = "path" in operation ? operation.path : null): EditorCommandDraftV1 {
  return createEditorDraftForOperation(operation, { selectedTokenPath });
}
