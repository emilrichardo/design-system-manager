// T003 (011) — Validador puro de `shadow` (contracts/dtcg-type-support.md). Sin I/O.
// Espeja el shape de `css-renderer.ts::serializeShadow`/`serializeOneShadow` (color/offsetX/offsetY/
// blur/spread/inset) sin importar de infraestructura (la conexión real es checkpoint C, T012).
import type { Issue } from "../../issue.js";
import { isConcreteSrgbColor, issueAt } from "./shape-utils.js";
import { parseDimension, type DimensionValue } from "./dimension.js";

export interface ShadowLayerValue {
  readonly color: unknown;
  readonly offsetX: DimensionValue;
  readonly offsetY: DimensionValue;
  readonly blur: DimensionValue;
  readonly spread: DimensionValue;
  readonly inset: boolean;
}

export type ShadowValue = ShadowLayerValue | readonly ShadowLayerValue[];

export type ShadowParseResult =
  | { readonly ok: true; readonly value: ShadowValue }
  | { readonly ok: false; readonly issue: Issue };

function parseOneShadow(value: unknown, path: string): { readonly ok: true; readonly value: ShadowLayerValue } | { readonly ok: false; readonly issue: Issue } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, issue: issueAt("shadow-shape-invalid", path, `Shadow no es un objeto en "${path}".`) };
  }
  const obj = value as Record<string, unknown>;
  if (!isConcreteSrgbColor(obj.color)) {
    return { ok: false, issue: issueAt("shadow-shape-invalid", path, `shadow.color no es un color sRGB concreto válido en "${path}".`) };
  }
  const offsetX = parseDimension(obj.offsetX, path);
  if (!offsetX.ok) return { ok: false, issue: offsetX.issue };
  const offsetY = parseDimension(obj.offsetY, path);
  if (!offsetY.ok) return { ok: false, issue: offsetY.issue };
  const blur = parseDimension(obj.blur ?? { value: 0, unit: "px" }, path);
  if (!blur.ok) return { ok: false, issue: blur.issue };
  const spread = parseDimension(obj.spread ?? { value: 0, unit: "px" }, path);
  if (!spread.ok) return { ok: false, issue: spread.issue };
  if (obj.inset !== undefined && typeof obj.inset !== "boolean") {
    return { ok: false, issue: issueAt("shadow-shape-invalid", path, `shadow.inset debe ser boolean en "${path}".`) };
  }
  return {
    ok: true,
    value: { color: obj.color, offsetX: offsetX.value, offsetY: offsetY.value, blur: blur.value, spread: spread.value, inset: obj.inset === true },
  };
}

export function parseShadow(value: unknown, path: string): ShadowParseResult {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { ok: false, issue: issueAt("shadow-shape-invalid", path, `shadow array vacío en "${path}".`) };
    }
    const layers: ShadowLayerValue[] = [];
    for (const entry of value) {
      const parsed = parseOneShadow(entry, path);
      if (!parsed.ok) return { ok: false, issue: parsed.issue };
      layers.push(parsed.value);
    }
    return { ok: true, value: layers };
  }
  return parseOneShadow(value, path);
}
