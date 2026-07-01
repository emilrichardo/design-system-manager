import { analysisError, type AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import {
  parseBorder,
  parseCubicBezier,
  parseDimension,
  parseDuration,
  parseFontFamily,
  parseFontWeight,
  parseGradient,
  parseNumberToken,
  parseShadow,
  parseStrokeStyle,
  parseTransition,
  parseTypography,
} from "../../domain/dtcg/types/index.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSrgbColorValue(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (value.colorSpace !== "srgb") return false;
  if (!Array.isArray(value.components) || value.components.length !== 3) return false;
  if (!value.components.every((entry) => typeof entry === "number" && entry >= 0 && entry <= 1)) return false;
  if ("alpha" in value && !(typeof value.alpha === "number" && value.alpha >= 0 && value.alpha <= 1)) return false;
  if ("hex" in value && !(typeof value.hex === "string" && /^#[0-9a-fA-F]{6}$/.test(value.hex))) return false;
  return true;
}

function issue(code: string, message: string, path: string): AnalysisIssue {
  return analysisError(code, message, { document: "tokens", path });
}

export function validateDeepDtcgValue(type: string, value: unknown, path: string): AnalysisIssue | null {
  switch (type) {
    case "color":
      return isValidSrgbColorValue(value)
        ? null
        : issue("dtcg-color-value-invalid", `Valor de color inválido en "${path}": debe ser un objeto sRGB.`, path);
    case "dimension": {
      const result = parseDimension(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "fontFamily": {
      const result = parseFontFamily(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "fontWeight": {
      const result = parseFontWeight(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "duration": {
      const result = parseDuration(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "cubicBezier": {
      const result = parseCubicBezier(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "number": {
      const result = parseNumberToken(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "strokeStyle": {
      const result = parseStrokeStyle(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "border": {
      const result = parseBorder(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "transition": {
      const result = parseTransition(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "shadow": {
      const result = parseShadow(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "gradient": {
      const result = parseGradient(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    case "typography": {
      const result = parseTypography(value, path);
      return result.ok ? null : issue(result.issue.code, result.issue.message, path);
    }
    default:
      return null;
  }
}
