// T003 (011) — Superficie pública de los validadores de tipo DTCG profundo (12 tipos no-color).
// `color` ya tiene validación profunda propia (002); estos módulos son insumo para checkpoint C
// (T012), que conecta `validate`/`inspect` a ellos. Nadie los invoca aún desde infraestructura.
export * from "./shape-utils.js";

export type { DimensionUnit, DimensionValue, DimensionParseResult } from "./dimension.js";
export { DIMENSION_UNITS, isDimensionUnit, parseDimension } from "./dimension.js";

export type { DurationUnit, DurationValue, DurationParseResult } from "./duration.js";
export { DURATION_UNITS, isDurationUnit, parseDuration } from "./duration.js";

export type { NumberParseResult } from "./number.js";
export { parseNumberToken } from "./number.js";

export type { FontFamilyValue, FontFamilyParseResult } from "./font-family.js";
export { parseFontFamily } from "./font-family.js";

export type { FontWeightValue, FontWeightParseResult } from "./font-weight.js";
export { parseFontWeight } from "./font-weight.js";

export type { CubicBezierValue, CubicBezierParseResult } from "./cubic-bezier.js";
export { parseCubicBezier } from "./cubic-bezier.js";

export type { StrokeStyleKeyword, StrokeLineCap, StrokeStyleObject, StrokeStyleValue, StrokeStyleParseResult } from "./stroke-style.js";
export { STROKE_STYLE_KEYWORDS, STROKE_LINE_CAPS, parseStrokeStyle } from "./stroke-style.js";

export type { BorderValue, BorderParseResult } from "./border.js";
export { parseBorder } from "./border.js";

export type { TransitionValue, TransitionParseResult } from "./transition.js";
export { parseTransition } from "./transition.js";

export type { ShadowLayerValue, ShadowValue, ShadowParseResult } from "./shadow.js";
export { parseShadow } from "./shadow.js";

export type { GradientStopValue, GradientValue, GradientParseResult } from "./gradient.js";
export { parseGradient } from "./gradient.js";

export type { TypographyValue, TypographyParseResult } from "./typography.js";
export { parseTypography } from "./typography.js";
