// T003 (011) — Validador puro de `border` (contracts/dtcg-type-support.md). Sin I/O.
import type { Issue } from "../../issue.js";
import { isAliasReference, isConcreteSrgbColor, issueAt } from "./shape-utils.js";
import { parseDimension, type DimensionValue } from "./dimension.js";
import { parseStrokeStyle, type StrokeStyleValue } from "./stroke-style.js";

export interface BorderValue {
  readonly color: unknown;
  readonly width: DimensionValue | string;
  readonly style: StrokeStyleValue | string;
}

export type BorderParseResult =
  | { readonly ok: true; readonly value: BorderValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseBorder(value: unknown, path: string): BorderParseResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, issue: issueAt("border-shape-invalid", path, `Border no es un objeto en "${path}".`) };
  }
  const obj = value as Record<string, unknown>;
  if (!isConcreteSrgbColor(obj.color) && !isAliasReference(obj.color)) {
    return { ok: false, issue: issueAt("border-shape-invalid", path, `border.color no es un color sRGB concreto válido en "${path}".`) };
  }
  const width = isAliasReference(obj.width) ? { ok: true as const, value: obj.width } : parseDimension(obj.width, path);
  if (!width.ok) return { ok: false, issue: width.issue };
  const style = isAliasReference(obj.style) ? { ok: true as const, value: obj.style } : parseStrokeStyle(obj.style, path);
  if (!style.ok) return { ok: false, issue: style.issue };
  return { ok: true, value: { color: obj.color, width: width.value, style: style.value } };
}
