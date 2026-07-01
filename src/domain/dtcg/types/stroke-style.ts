// T003 (011) — Validador puro de `strokeStyle` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { issueAt } from "./shape-utils.js";
import { parseDimension, type DimensionValue } from "./dimension.js";

export const STROKE_STYLE_KEYWORDS = ["solid", "dashed", "dotted", "double", "groove", "ridge", "outset", "inset"] as const;
export type StrokeStyleKeyword = (typeof STROKE_STYLE_KEYWORDS)[number];
export const STROKE_LINE_CAPS = ["round", "butt", "square"] as const;
export type StrokeLineCap = (typeof STROKE_LINE_CAPS)[number];

export interface StrokeStyleObject {
  readonly dashArray: readonly DimensionValue[];
  readonly lineCap: StrokeLineCap;
}

export type StrokeStyleValue = StrokeStyleKeyword | StrokeStyleObject;

export type StrokeStyleParseResult =
  | { readonly ok: true; readonly value: StrokeStyleValue }
  | { readonly ok: false; readonly issue: Issue };

const KEYWORD_SET: ReadonlySet<string> = new Set(STROKE_STYLE_KEYWORDS);
const LINE_CAP_SET: ReadonlySet<string> = new Set(STROKE_LINE_CAPS);

export function parseStrokeStyle(value: unknown, path: string): StrokeStyleParseResult {
  if (typeof value === "string") {
    if (!KEYWORD_SET.has(value)) {
      return { ok: false, issue: issueAt("stroke-style-shape-invalid", path, `strokeStyle inválido en "${path}": "${value}" no es un keyword reconocido.`) };
    }
    return { ok: true, value: value as StrokeStyleKeyword };
  }
  if (value === null || typeof value !== "object") {
    return { ok: false, issue: issueAt("stroke-style-shape-invalid", path, `strokeStyle inválido en "${path}": debe ser un keyword o un objeto {dashArray, lineCap}.`) };
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.dashArray) || obj.dashArray.length === 0) {
    return { ok: false, issue: issueAt("stroke-style-shape-invalid", path, `strokeStyle.dashArray inválido en "${path}": debe ser un array no vacío de dimension.`) };
  }
  const dashArray: DimensionValue[] = [];
  for (const entry of obj.dashArray) {
    const parsed = parseDimension(entry, path);
    if (!parsed.ok) return { ok: false, issue: parsed.issue };
    dashArray.push(parsed.value);
  }
  if (typeof obj.lineCap !== "string" || !LINE_CAP_SET.has(obj.lineCap)) {
    return { ok: false, issue: issueAt("stroke-style-shape-invalid", path, `strokeStyle.lineCap inválido en "${path}".`) };
  }
  return { ok: true, value: { dashArray, lineCap: obj.lineCap as StrokeLineCap } };
}
