// T003 (011) — Validador puro de `typography` (contracts/dtcg-type-support.md). Sin I/O.
// Subset composable: `fontFamily`/`fontSize` obligatorios; `fontWeight`/`lineHeight`/`letterSpacing`
// opcionales (ausentes -> null), per contract "subset composable".
import type { Issue } from "../../issue.js";
import { isFiniteNumber, issueAt } from "./shape-utils.js";
import { parseDimension, type DimensionValue } from "./dimension.js";
import { parseFontFamily, type FontFamilyValue } from "./font-family.js";
import { parseFontWeight, type FontWeightValue } from "./font-weight.js";

export interface TypographyValue {
  readonly fontFamily: FontFamilyValue;
  readonly fontSize: DimensionValue;
  readonly fontWeight: FontWeightValue | null;
  readonly lineHeight: number | null;
  readonly letterSpacing: DimensionValue | null;
}

export type TypographyParseResult =
  | { readonly ok: true; readonly value: TypographyValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseTypography(value: unknown, path: string): TypographyParseResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, issue: issueAt("typography-shape-invalid", path, `Typography no es un objeto en "${path}".`) };
  }
  const obj = value as Record<string, unknown>;
  const fontFamily = parseFontFamily(obj.fontFamily, path);
  if (!fontFamily.ok) return { ok: false, issue: fontFamily.issue };
  const fontSize = parseDimension(obj.fontSize, path);
  if (!fontSize.ok) return { ok: false, issue: fontSize.issue };

  let fontWeight: FontWeightValue | null = null;
  if (obj.fontWeight !== undefined) {
    const parsed = parseFontWeight(obj.fontWeight, path);
    if (!parsed.ok) return { ok: false, issue: parsed.issue };
    fontWeight = parsed.value;
  }

  let lineHeight: number | null = null;
  if (obj.lineHeight !== undefined) {
    if (!isFiniteNumber(obj.lineHeight)) {
      return { ok: false, issue: issueAt("typography-shape-invalid", path, `typography.lineHeight no es un número finito en "${path}".`) };
    }
    lineHeight = obj.lineHeight;
  }

  let letterSpacing: DimensionValue | null = null;
  if (obj.letterSpacing !== undefined) {
    const parsed = parseDimension(obj.letterSpacing, path);
    if (!parsed.ok) return { ok: false, issue: parsed.issue };
    letterSpacing = parsed.value;
  }

  return { ok: true, value: { fontFamily: fontFamily.value, fontSize: fontSize.value, fontWeight, lineHeight, letterSpacing } };
}
