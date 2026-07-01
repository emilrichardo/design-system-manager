// T003 (011) — Validador puro de `typography` (contracts/dtcg-type-support.md). Sin I/O.
// Subset composable: `fontFamily`/`fontSize` obligatorios; `fontWeight`/`lineHeight`/`letterSpacing`
// opcionales (ausentes -> null), per contract "subset composable".
import type { Issue } from "../../issue.js";
import { isAliasReference, isFiniteNumber, issueAt } from "./shape-utils.js";
import { parseDimension, type DimensionValue } from "./dimension.js";
import { parseFontFamily, type FontFamilyValue } from "./font-family.js";
import { parseFontWeight, type FontWeightValue } from "./font-weight.js";

export interface TypographyValue {
  readonly fontFamily: FontFamilyValue | string;
  readonly fontSize: DimensionValue | string;
  readonly fontWeight: FontWeightValue | string | null;
  readonly lineHeight: number | string | null;
  readonly letterSpacing: DimensionValue | string | null;
}

export type TypographyParseResult =
  | { readonly ok: true; readonly value: TypographyValue }
  | { readonly ok: false; readonly issue: Issue };

export function parseTypography(value: unknown, path: string): TypographyParseResult {
  if (value === null || typeof value !== "object") {
    return { ok: false, issue: issueAt("typography-shape-invalid", path, `Typography no es un objeto en "${path}".`) };
  }
  const obj = value as Record<string, unknown>;
  const fontFamily = isAliasReference(obj.fontFamily) ? { ok: true as const, value: obj.fontFamily } : parseFontFamily(obj.fontFamily, path);
  if (!fontFamily.ok) return { ok: false, issue: fontFamily.issue };
  const fontSize = isAliasReference(obj.fontSize) ? { ok: true as const, value: obj.fontSize } : parseDimension(obj.fontSize, path);
  if (!fontSize.ok) return { ok: false, issue: fontSize.issue };

  let fontWeight: FontWeightValue | string | null = null;
  if (obj.fontWeight !== undefined) {
    const parsed = isAliasReference(obj.fontWeight) ? { ok: true as const, value: obj.fontWeight } : parseFontWeight(obj.fontWeight, path);
    if (!parsed.ok) return { ok: false, issue: parsed.issue };
    fontWeight = parsed.value;
  }

  let lineHeight: number | string | null = null;
  if (obj.lineHeight !== undefined) {
    if (isAliasReference(obj.lineHeight)) {
      lineHeight = obj.lineHeight;
    } else if (!isFiniteNumber(obj.lineHeight)) {
      return { ok: false, issue: issueAt("typography-shape-invalid", path, `typography.lineHeight no es un número finito en "${path}".`) };
    } else {
      lineHeight = obj.lineHeight;
    }
  }

  let letterSpacing: DimensionValue | string | null = null;
  if (obj.letterSpacing !== undefined) {
    const parsed = isAliasReference(obj.letterSpacing) ? { ok: true as const, value: obj.letterSpacing } : parseDimension(obj.letterSpacing, path);
    if (!parsed.ok) return { ok: false, issue: parsed.issue };
    letterSpacing = parsed.value;
  }

  return { ok: true, value: { fontFamily: fontFamily.value, fontSize: fontSize.value, fontWeight, lineHeight, letterSpacing } };
}
